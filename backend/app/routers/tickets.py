from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies import CustomerUser, DbSession, StaffUser
from app.models import Cinema, Hall, Movie, Order, Seat, Showtime, Ticket
from app.schemas import CheckInOut, CheckInRequest, TicketOut
from app.security import sign_ticket, verify_ticket_token

router = APIRouter(tags=["Tickets & Check-in"])


def _ticket_response(db: Session, ticket: Ticket) -> TicketOut:
    showtime = db.get(Showtime, ticket.showtime_id)
    order = db.get(Order, ticket.order_id)
    seat = db.get(Seat, ticket.seat_id)
    hall = db.get(Hall, seat.hall_id) if seat else None
    movie = db.get(Movie, showtime.movie_id) if showtime else None
    cinema = db.get(Cinema, hall.cinema_id) if hall else None
    if any(item is None for item in (showtime, order, seat, hall, movie, cinema)):
        raise HTTPException(status_code=500, detail="Ticket data is incomplete")
    return TicketOut(
        ticket_code=ticket.ticket_code,
        status=ticket.status,
        movie_title=movie.title,
        cinema_name=cinema.name,
        hall_name=hall.name,
        start_at=showtime.start_at,
        seat_label=f"{seat.row_label}{seat.seat_number}",
        qr_token=sign_ticket(ticket.id),
        checked_in_at=ticket.checked_in_at,
    )


@router.get("/tickets", response_model=list[TicketOut])
def list_my_tickets(
    user: CustomerUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
) -> list[TicketOut]:
    tickets = db.scalars(
        select(Ticket)
        .join(Order, Ticket.order_id == Order.id)
        .where(Order.user_id == user.id, Order.payment_status == "paid")
        .order_by(Ticket.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return [_ticket_response(db, ticket) for ticket in tickets]


@router.get("/tickets/{ticket_code}", response_model=TicketOut)
def get_my_ticket(ticket_code: str, user: CustomerUser, db: DbSession) -> TicketOut:
    ticket = db.scalar(
        select(Ticket)
        .join(Order, Ticket.order_id == Order.id)
        .where(Ticket.ticket_code == ticket_code, Order.user_id == user.id, Order.payment_status == "paid")
    )
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return _ticket_response(db, ticket)


@router.post("/staff/check-in", response_model=CheckInOut)
def check_in(payload: CheckInRequest, user: StaffUser, db: DbSession) -> CheckInOut:
    del user
    ticket_id = verify_ticket_token(payload.qr_token)
    if ticket_id is None:
        raise HTTPException(status_code=404, detail="Invalid ticket")
    ticket = db.scalar(select(Ticket).where(Ticket.id == ticket_id).with_for_update())
    if ticket is None:
        raise HTTPException(status_code=404, detail="Invalid ticket")
    order = db.get(Order, ticket.order_id)
    showtime = db.get(Showtime, ticket.showtime_id)
    seat = db.get(Seat, ticket.seat_id)
    hall = db.get(Hall, seat.hall_id) if seat else None
    movie = db.get(Movie, showtime.movie_id) if showtime else None
    if any(item is None for item in (order, showtime, seat, hall, movie)):
        raise HTTPException(status_code=500, detail="Ticket data is incomplete")
    if payload.showtime_id is not None and payload.showtime_id != ticket.showtime_id:
        raise HTTPException(status_code=409, detail="Ticket is not valid for this showtime")
    if order.payment_status != "paid" or ticket.status in ("cancelled", "expired"):
        raise HTTPException(status_code=409, detail="Ticket is not valid")
    now = datetime.now(timezone.utc)
    if showtime.end_at <= now:
        ticket.status = "expired"
        db.commit()
        raise HTTPException(status_code=410, detail="Ticket has expired")
    if ticket.status == "checked_in":
        return CheckInOut(
            result="already_used",
            ticket_code=ticket.ticket_code,
            movie_title=movie.title,
            showtime_start=showtime.start_at,
            seat_label=f"{seat.row_label}{seat.seat_number}",
            checked_in_at=ticket.checked_in_at or now,
        )
    ticket.status = "checked_in"
    ticket.checked_in_at = now
    db.commit()
    return CheckInOut(
        result="checked_in",
        ticket_code=ticket.ticket_code,
        movie_title=movie.title,
        showtime_start=showtime.start_at,
        seat_label=f"{seat.row_label}{seat.seat_number}",
        checked_in_at=now,
    )
