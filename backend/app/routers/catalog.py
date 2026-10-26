import uuid
from datetime import date, datetime, time, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select

from app.config import get_settings
from app.dependencies import DbSession
from app.models import Cinema, FoodItem, Hall, Movie, Seat, SeatHold, Showtime, Ticket
from app.schemas import CinemaOut, FoodOut, MovieOut, SeatMapOut, SeatOut, ShowtimeOut

router = APIRouter(tags=["Catalog"])


@router.get("/movies", response_model=dict)
def list_movies(
    db: DbSession,
    q: str | None = Query(default=None, max_length=120),
    genre: str | None = Query(default=None, max_length=120),
    status_filter: Literal["now_showing", "coming_soon"] | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> dict:
    query = select(Movie).where(Movie.status != "inactive")
    if q:
        query = query.where(Movie.title.ilike(f"%{q.strip()}%"))
    if genre:
        query = query.where(Movie.genre.ilike(genre.strip()))
    if status_filter:
        query = query.where(Movie.status == status_filter)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    movies = db.scalars(query.order_by(Movie.title).offset((page - 1) * page_size).limit(page_size)).all()
    return {
        "items": [MovieOut.model_validate(movie).model_dump(mode="json") for movie in movies],
        "page": page,
        "page_size": page_size,
        "total": total,
    }


@router.get("/movies/{movie_id}", response_model=MovieOut)
def get_movie(movie_id: uuid.UUID, db: DbSession) -> Movie:
    movie = db.scalar(select(Movie).where(Movie.id == movie_id, Movie.status != "inactive"))
    if movie is None:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie


@router.get("/cinemas", response_model=list[CinemaOut])
def list_cinemas(db: DbSession) -> list[Cinema]:
    return list(db.scalars(select(Cinema).where(Cinema.status == "active").order_by(Cinema.name)).all())


@router.get("/showtimes", response_model=list[ShowtimeOut])
def list_showtimes(
    db: DbSession,
    movie_id: uuid.UUID | None = None,
    cinema_id: uuid.UUID | None = None,
    show_date: date | None = Query(default=None, alias="date"),
) -> list[ShowtimeOut]:
    now = datetime.now(timezone.utc)
    seat_counts = (
        select(Seat.hall_id, func.count(Seat.id).label("capacity"))
        .where(Seat.status == "active")
        .group_by(Seat.hall_id)
        .subquery()
    )
    sold_counts = (
        select(
            Ticket.showtime_id,
            func.count(func.distinct(Ticket.seat_id)).label("sold"),
        )
        .where(Ticket.status.in_(("issued", "checked_in")))
        .group_by(Ticket.showtime_id)
        .subquery()
    )
    held_counts = (
        select(
            SeatHold.showtime_id,
            func.count(func.distinct(SeatHold.seat_id)).label("held"),
        )
        .where(
            SeatHold.released_at.is_(None),
            SeatHold.expires_at > now,
        )
        .group_by(SeatHold.showtime_id)
        .subquery()
    )
    query = (
        select(
            Showtime,
            Movie,
            Hall,
            Cinema,
            func.coalesce(seat_counts.c.capacity, 0),
            func.coalesce(sold_counts.c.sold, 0),
            func.coalesce(held_counts.c.held, 0),
        )
        .join(Hall, Showtime.hall_id == Hall.id)
        .join(Cinema, Hall.cinema_id == Cinema.id)
        .join(Movie, Showtime.movie_id == Movie.id)
        .outerjoin(seat_counts, seat_counts.c.hall_id == Hall.id)
        .outerjoin(sold_counts, sold_counts.c.showtime_id == Showtime.id)
        .outerjoin(held_counts, held_counts.c.showtime_id == Showtime.id)
        .where(
            Showtime.status == "scheduled",
            Hall.status == "active",
            Cinema.status == "active",
            Showtime.start_at > now,
        )
    )
    if movie_id:
        query = query.where(Showtime.movie_id == movie_id)
    if cinema_id:
        query = query.where(Hall.cinema_id == cinema_id)
    if show_date:
        start = datetime.combine(show_date, time.min, tzinfo=timezone.utc)
        end = datetime.combine(show_date, time.max, tzinfo=timezone.utc)
        query = query.where(Showtime.start_at >= start, Showtime.start_at <= end)
    rows = db.execute(query.order_by(Showtime.start_at).limit(200)).all()
    return [
        ShowtimeOut(
            id=showtime.id,
            movie_id=movie.id,
            movie_title=movie.title,
            cinema_id=cinema.id,
            cinema_name=cinema.name,
            hall_id=hall.id,
            hall_name=hall.name,
            start_at=showtime.start_at,
            end_at=showtime.end_at,
            language=showtime.language,
            base_price=showtime.base_price,
            available_seats=max(int(capacity) - int(sold) - int(held), 0),
        )
        for showtime, movie, hall, cinema, capacity, sold, held in rows
    ]


@router.get("/showtimes/{showtime_id}/seats", response_model=SeatMapOut)
def get_seat_map(showtime_id: uuid.UUID, db: DbSession) -> SeatMapOut:
    showtime = db.get(Showtime, showtime_id)
    if showtime is None:
        raise HTTPException(status_code=404, detail="Showtime not found")
    hall = db.get(Hall, showtime.hall_id)
    if hall is None:
        raise HTTPException(status_code=500, detail="Showtime data is incomplete")
    now = datetime.now(timezone.utc)
    sold_ids = set(
        db.scalars(
            select(Ticket.seat_id).where(
                Ticket.showtime_id == showtime_id,
                Ticket.status.in_(("issued", "checked_in")),
            )
        ).all()
    )
    holds = db.scalars(
        select(SeatHold).where(
            SeatHold.showtime_id == showtime_id,
            SeatHold.released_at.is_(None),
            SeatHold.expires_at > now,
        )
    ).all()
    held_ids = {hold.seat_id for hold in holds}
    seats = db.scalars(
        select(Seat).where(Seat.hall_id == hall.id, Seat.status == "active").order_by(Seat.row_label, Seat.seat_number)
    ).all()
    return SeatMapOut(
        showtime_id=showtime_id,
        hold_expires_in_minutes=get_settings().seat_hold_minutes,
        seats=[
            SeatOut(
                id=seat.id,
                row_label=seat.row_label,
                seat_number=seat.seat_number,
                seat_type=seat.seat_type,
                price=showtime.base_price + seat.price_modifier,
                status="sold" if seat.id in sold_ids else "held" if seat.id in held_ids else "available",
            )
            for seat in seats
        ],
    )


@router.get("/food", response_model=list[FoodOut])
def list_food(db: DbSession) -> list[FoodItem]:
    return list(
        db.scalars(
            select(FoodItem)
            .where(FoodItem.status == "active", FoodItem.stock > 0)
            .order_by(FoodItem.category, FoodItem.name)
        ).all()
    )
