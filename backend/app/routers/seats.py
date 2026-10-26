import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from app.config import get_settings
from app.dependencies import CustomerUser, DbSession
from app.models import Seat, SeatHold, Showtime, Ticket, User, WebSocketTicket
from app.routers.catalog import get_seat_map
from app.schemas import SeatHoldOut, SeatHoldRequest, SeatOut, SmartSeatOut, SmartSeatRequest
from app.security import hash_reset_token

router = APIRouter(tags=["Seats"])


class SeatSocketManager:
    def __init__(self) -> None:
        self.connections: dict[uuid.UUID, set[WebSocket]] = {}

    async def connect(self, showtime_id: uuid.UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections.setdefault(showtime_id, set()).add(websocket)

    def disconnect(self, showtime_id: uuid.UUID, websocket: WebSocket) -> None:
        connections = self.connections.get(showtime_id)
        if connections is None:
            return
        connections.discard(websocket)
        if not connections:
            self.connections.pop(showtime_id, None)

    async def publish(self, showtime_id: uuid.UUID, changed_seat_ids: list[uuid.UUID]) -> None:
        message = {
            "event": "seat_status_changed",
            "showtime_id": str(showtime_id),
            "seat_ids": [str(seat_id) for seat_id in changed_seat_ids],
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        }
        connections = tuple(self.connections.get(showtime_id, ()))
        if connections:
            results = await asyncio.gather(
                *(connection.send_json(message) for connection in connections),
                return_exceptions=True,
            )
            for connection, result in zip(connections, results, strict=True):
                if isinstance(result, Exception):
                    self.disconnect(showtime_id, connection)


seat_socket_manager = SeatSocketManager()


@router.post("/showtimes/{showtime_id}/seat-holds", response_model=SeatHoldOut, status_code=201)
async def hold_seats(
    showtime_id: uuid.UUID,
    payload: SeatHoldRequest,
    user: CustomerUser,
    db: DbSession,
) -> SeatHoldOut:
    settings = get_settings()
    if len(payload.seat_ids) > settings.max_seats_per_order:
        raise HTTPException(status_code=422, detail=f"At most {settings.max_seats_per_order} seats may be held")
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.seat_hold_minutes)

    showtime = db.scalar(select(Showtime).where(Showtime.id == showtime_id).with_for_update())
    if showtime is None:
        raise HTTPException(status_code=404, detail="Showtime not found")
    if showtime.status != "scheduled" or showtime.start_at <= now:
        raise HTTPException(status_code=409, detail="Showtime is not open for booking")

    seats = db.scalars(
        select(Seat)
        .where(
            Seat.id.in_(payload.seat_ids),
            Seat.hall_id == showtime.hall_id,
            Seat.status == "active",
        )
        .order_by(Seat.id)
        .with_for_update()
    ).all()
    if len(seats) != len(payload.seat_ids):
        raise HTTPException(status_code=422, detail="One or more seats are invalid for this showtime")

    db.execute(
        update(SeatHold)
        .where(
            SeatHold.showtime_id == showtime_id,
            SeatHold.seat_id.in_(payload.seat_ids),
            SeatHold.released_at.is_(None),
            SeatHold.expires_at <= now,
        )
        .values(released_at=now)
    )
    existing = db.scalars(
        select(SeatHold).where(
            SeatHold.showtime_id == showtime_id,
            SeatHold.seat_id.in_(payload.seat_ids),
            SeatHold.released_at.is_(None),
            SeatHold.expires_at > now,
        )
    ).all()
    if any(hold.user_id != user.id for hold in existing):
        db.rollback()
        raise HTTPException(status_code=409, detail="One or more seats are already held")
    sold = db.scalar(
        select(Ticket.id)
        .where(
            Ticket.showtime_id == showtime_id,
            Ticket.seat_id.in_(payload.seat_ids),
            Ticket.status.in_(("issued", "checked_in")),
        )
        .limit(1)
    )
    if sold is not None:
        db.rollback()
        raise HTTPException(status_code=409, detail="One or more seats have already been sold")

    active_other_holds = db.scalars(
        select(SeatHold.id)
        .where(
            SeatHold.showtime_id == showtime_id,
            SeatHold.user_id == user.id,
            SeatHold.released_at.is_(None),
            SeatHold.expires_at > now,
            SeatHold.seat_id.not_in(payload.seat_ids),
        )
    ).all()
    if len(active_other_holds) + len(payload.seat_ids) > settings.max_seats_per_order:
        db.rollback()
        raise HTTPException(status_code=409, detail="Maximum active seat count exceeded")

    by_seat = {hold.seat_id: hold for hold in existing}
    holds: list[SeatHold] = []
    for seat in seats:
        hold = by_seat.get(seat.id)
        if hold is not None:
            hold.expires_at = expires_at
        else:
            hold = SeatHold(
                showtime_id=showtime_id,
                seat_id=seat.id,
                user_id=user.id,
                expires_at=expires_at,
            )
            db.add(hold)
        holds.append(hold)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="One or more seats have just been reserved") from None
    for hold in holds:
        db.refresh(hold)
    await seat_socket_manager.publish(showtime_id, payload.seat_ids)
    return SeatHoldOut(
        hold_ids=[hold.id for hold in holds],
        seat_ids=[hold.seat_id for hold in holds],
        expires_at=expires_at,
    )


@router.delete("/seat-holds/{hold_id}", status_code=status.HTTP_204_NO_CONTENT)
async def release_seat(hold_id: uuid.UUID, user: CustomerUser, db: DbSession) -> None:
    hold = db.scalar(select(SeatHold).where(SeatHold.id == hold_id).with_for_update())
    if hold is None or hold.user_id != user.id:
        raise HTTPException(status_code=404, detail="Seat hold not found")
    if hold.released_at is None:
        hold.released_at = datetime.now(timezone.utc)
        db.commit()
        await seat_socket_manager.publish(hold.showtime_id, [hold.seat_id])


@router.post("/showtimes/{showtime_id}/smart-seat", response_model=SmartSeatOut)
def recommend_seats(
    showtime_id: uuid.UUID,
    payload: SmartSeatRequest,
    user: CustomerUser,
    db: DbSession,
) -> SmartSeatOut:
    del user
    seat_map = get_seat_map(showtime_id, db)
    available = [seat for seat in seat_map.seats if seat.status == "available"]
    if not available:
        return SmartSeatOut(recommendations=[], seats_together=payload.together)

    row_names = sorted({seat.row_label for seat in available})
    row_midpoint = (len(row_names) - 1) / 2
    requested_row = {
        "front": 0,
        "middle": row_midpoint,
        "back": len(row_names) - 1,
    }.get(payload.preferred_zone, row_midpoint)
    by_row: dict[str, list[SeatOut]] = {}
    for seat in available:
        by_row.setdefault(seat.row_label, []).append(seat)

    candidates: list[tuple[float, list[SeatOut]]] = []
    for row_index, row_name in enumerate(row_names):
        row = sorted(by_row[row_name], key=lambda seat: seat.seat_number)
        if payload.together:
            for start in range(0, len(row) - payload.count + 1):
                group = row[start : start + payload.count]
                if any(
                    group[index + 1].seat_number - group[index].seat_number != 1
                    for index in range(len(group) - 1)
                ):
                    continue
                row_center = (group[0].seat_number + group[-1].seat_number) / 2
                row_seat_midpoint = (max(item.seat_number for item in row) + 1) / 2
                score = abs(row_index - requested_row) * 3 + abs(row_center - row_seat_midpoint)
                candidates.append((score, group))
        else:
            seat_midpoint = (max(seat.seat_number for seat in row) + 1) / 2
            for seat in row:
                score = abs(row_index - requested_row) * 3 + abs(seat.seat_number - seat_midpoint)
                candidates.append((score, [seat]))
    candidates.sort(key=lambda entry: entry[0])
    recommendations = []
    together = payload.together and bool(candidates)
    if candidates:
        if payload.together:
            recommendations = [[seat.id for seat in group] for _, group in candidates[:3]]
        else:
            group = [seat.id for _, seats in candidates[: payload.count] for seat in seats]
            recommendations = [group] if len(group) == payload.count else []
    if not recommendations and not payload.together and len(available) >= payload.count:
        recommendations = [[seat.id for seat in available[: payload.count]]]
    if not recommendations and payload.together and len(available) >= payload.count:
        ranked = sorted(
            available,
            key=lambda seat: (
                abs(row_names.index(seat.row_label) - requested_row) * 3
                + abs(
                    seat.seat_number
                    - (max(item.seat_number for item in by_row[seat.row_label]) + 1) / 2
                )
            ),
        )
        recommendations = [[seat.id for seat in ranked[: payload.count]]]
        together = False
    return SmartSeatOut(recommendations=recommendations, seats_together=together)


@router.websocket("/showtimes/{showtime_id}/live-seats")
async def live_seat_updates(
    websocket: WebSocket,
    showtime_id: uuid.UUID,
    ticket: str = Query(min_length=32, max_length=128),
) -> None:
    from app.db import SessionLocal

    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        socket_ticket = db.scalar(
            select(WebSocketTicket).where(
                WebSocketTicket.token_hash == hash_reset_token(ticket),
                WebSocketTicket.expires_at > now,
                WebSocketTicket.consumed_at.is_(None),
            ).with_for_update()
        )
        showtime = db.get(Showtime, showtime_id)
        user = db.get(User, socket_ticket.user_id) if socket_ticket is not None else None
        if socket_ticket is None or showtime is None or user is None or user.status != "active":
            await websocket.close(code=1008)
            return
        socket_ticket.consumed_at = now
        db.commit()

    await seat_socket_manager.connect(showtime_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        seat_socket_manager.disconnect(showtime_id, websocket)
