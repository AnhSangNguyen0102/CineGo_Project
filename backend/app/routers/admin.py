import uuid
from datetime import date, datetime, time, timezone
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError

from app.dependencies import AdminUser, DbSession
from app.models import (
    AuthSession,
    Cinema,
    FoodItem,
    Hall,
    Movie,
    Order,
    Seat,
    SeatHold,
    Showtime,
    Ticket,
    User,
    Voucher,
)
from app.routers.orders import _order_response
from app.routers.seats import seat_socket_manager
from app.schemas import (
    AdminCinemaCreate,
    AdminCinemaUpdate,
    AdminFoodCreate,
    AdminFoodUpdate,
    AdminHallCreate,
    AdminHallStatusUpdate,
    AdminMovieCreate,
    AdminMovieUpdate,
    AdminSeatLayoutCreate,
    AdminSeatStatusUpdate,
    AdminShowtimeCreate,
    AdminUserUpdate,
    AdminVoucherCreate,
    AdminVoucherUpdate,
    CinemaOut,
    DashboardOut,
    FoodOut,
    MovieOut,
    OrderOut,
    UserPublic,
)

router = APIRouter(prefix="/admin", tags=["Administration"])


@router.post("/movies", response_model=MovieOut, status_code=status.HTTP_201_CREATED)
def create_movie(payload: AdminMovieCreate, user: AdminUser, db: DbSession) -> Movie:
    del user
    movie = Movie(**payload.model_dump())
    db.add(movie)
    db.commit()
    db.refresh(movie)
    return movie


@router.patch("/movies/{movie_id}", response_model=MovieOut)
def update_movie(
    movie_id: uuid.UUID,
    payload: AdminMovieUpdate,
    user: AdminUser,
    db: DbSession,
) -> Movie:
    del user
    movie = db.scalar(select(Movie).where(Movie.id == movie_id).with_for_update())
    if movie is None:
        raise HTTPException(status_code=404, detail="Movie not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(movie, field, value)
    db.commit()
    db.refresh(movie)
    return movie


@router.delete("/movies/{movie_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_movie(movie_id: uuid.UUID, user: AdminUser, db: DbSession) -> None:
    del user
    movie = db.scalar(select(Movie).where(Movie.id == movie_id).with_for_update())
    if movie is None:
        raise HTTPException(status_code=404, detail="Movie not found")
    movie.status = "inactive"
    db.commit()


@router.post("/cinemas", response_model=CinemaOut, status_code=status.HTTP_201_CREATED)
def create_cinema(payload: AdminCinemaCreate, user: AdminUser, db: DbSession) -> Cinema:
    del user
    cinema = Cinema(name=payload.name, address=payload.address)
    db.add(cinema)
    db.commit()
    db.refresh(cinema)
    return cinema


@router.patch("/cinemas/{cinema_id}")
def update_cinema(
    cinema_id: uuid.UUID,
    payload: AdminCinemaUpdate,
    user: AdminUser,
    db: DbSession,
) -> dict[str, object]:
    del user
    cinema = db.scalar(select(Cinema).where(Cinema.id == cinema_id).with_for_update())
    if cinema is None:
        raise HTTPException(status_code=404, detail="Cinema not found")
    updates = payload.model_dump(exclude_unset=True)
    if updates.get("status") == "inactive":
        upcoming = db.scalar(
            select(Showtime.id)
            .join(Hall, Showtime.hall_id == Hall.id)
            .where(
                Hall.cinema_id == cinema.id,
                Showtime.status == "scheduled",
                Showtime.start_at > datetime.now(timezone.utc),
            )
            .limit(1)
        )
        if upcoming is not None:
            raise HTTPException(status_code=409, detail="Cancel upcoming showtimes before deactivating this cinema")
    for field, value in updates.items():
        setattr(cinema, field, value)
    db.commit()
    return {"id": cinema.id, "name": cinema.name, "address": cinema.address, "status": cinema.status}


@router.post("/halls", status_code=status.HTTP_201_CREATED)
def create_hall(payload: AdminHallCreate, user: AdminUser, db: DbSession) -> dict[str, object]:
    del user
    cinema = db.scalar(select(Cinema).where(Cinema.id == payload.cinema_id).with_for_update())
    if cinema is None or cinema.status != "active":
        raise HTTPException(status_code=404, detail="Active cinema not found")
    hall = Hall(**payload.model_dump())
    db.add(hall)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A hall with this name already exists in the cinema") from None
    db.refresh(hall)
    return {
        "id": hall.id,
        "cinema_id": hall.cinema_id,
        "name": hall.name,
        "hall_type": hall.hall_type,
        "rows_count": hall.rows_count,
        "columns_count": hall.columns_count,
        "status": hall.status,
    }


@router.patch("/halls/{hall_id}/status")
def update_hall_status(
    hall_id: uuid.UUID,
    payload: AdminHallStatusUpdate,
    user: AdminUser,
    db: DbSession,
) -> dict[str, object]:
    del user
    hall = db.scalar(select(Hall).where(Hall.id == hall_id).with_for_update())
    if hall is None:
        raise HTTPException(status_code=404, detail="Hall not found")
    if payload.status == "inactive":
        upcoming = db.scalar(
            select(Showtime.id).where(
                Showtime.hall_id == hall.id,
                Showtime.status == "scheduled",
                Showtime.start_at > datetime.now(timezone.utc),
            ).limit(1)
        )
        if upcoming is not None:
            raise HTTPException(status_code=409, detail="Cancel upcoming showtimes before deactivating this hall")
    hall.status = payload.status
    db.commit()
    return {"id": hall.id, "status": hall.status}


@router.put("/halls/{hall_id}/seats", status_code=status.HTTP_201_CREATED)
def create_seat_layout(
    hall_id: uuid.UUID,
    payload: AdminSeatLayoutCreate,
    user: AdminUser,
    db: DbSession,
) -> dict[str, object]:
    del user
    hall = db.scalar(select(Hall).where(Hall.id == hall_id).with_for_update())
    if hall is None or hall.status != "active":
        raise HTTPException(status_code=404, detail="Active hall not found")
    if db.scalar(select(Seat.id).where(Seat.hall_id == hall.id).limit(1)) is not None:
        raise HTTPException(status_code=409, detail="Seat layout already exists; use a dedicated layout migration")
    if any(seat.seat_number > hall.columns_count for seat in payload.seats):
        raise HTTPException(status_code=422, detail="Seat number exceeds the hall column count")
    if len({seat.row_label for seat in payload.seats}) > hall.rows_count:
        raise HTTPException(status_code=422, detail="Seat rows exceed the hall row count")
    seats = [Seat(hall_id=hall.id, **seat.model_dump()) for seat in payload.seats]
    db.add_all(seats)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Seat layout conflicts with an existing seat") from None
    return {"hall_id": hall.id, "created_seats": len(seats)}


@router.patch("/seats/{seat_id}/status")
def update_seat_status(
    seat_id: uuid.UUID,
    payload: AdminSeatStatusUpdate,
    user: AdminUser,
    db: DbSession,
) -> dict[str, object]:
    del user
    seat = db.scalar(select(Seat).where(Seat.id == seat_id).with_for_update())
    if seat is None:
        raise HTTPException(status_code=404, detail="Seat not found")
    if payload.status == "inactive":
        active_hold = db.scalar(
            select(SeatHold.id)
            .join(Showtime, SeatHold.showtime_id == Showtime.id)
            .where(
                SeatHold.seat_id == seat.id,
                SeatHold.released_at.is_(None),
                SeatHold.expires_at > datetime.now(timezone.utc),
            )
            .limit(1)
        )
        issued_ticket = db.scalar(
            select(Ticket.id)
            .where(
                Ticket.seat_id == seat.id,
                Ticket.status.in_(("issued", "checked_in")),
            )
            .limit(1)
        )
        if active_hold is not None or issued_ticket is not None:
            raise HTTPException(status_code=409, detail="Cannot deactivate a seat with an active hold or ticket")
    seat.status = payload.status
    db.commit()
    return {"id": seat.id, "status": seat.status}


@router.post("/showtimes", status_code=status.HTTP_201_CREATED)
def create_showtime(
    payload: AdminShowtimeCreate,
    user: AdminUser,
    db: DbSession,
) -> dict[str, object]:
    del user
    hall = db.scalar(select(Hall).where(Hall.id == payload.hall_id).with_for_update())
    movie = db.scalar(select(Movie).where(Movie.id == payload.movie_id).with_for_update())
    cinema = db.scalar(
        select(Cinema).where(Cinema.id == hall.cinema_id).with_for_update()
    ) if hall is not None else None
    if (
        hall is None
        or hall.status != "active"
        or cinema is None
        or cinema.status != "active"
        or movie is None
        or movie.status == "inactive"
    ):
        raise HTTPException(status_code=404, detail="Active movie and hall are required")
    if payload.start_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="Showtime must be scheduled in the future")
    if db.scalar(select(Seat.id).where(Seat.hall_id == hall.id).limit(1)) is None:
        raise HTTPException(status_code=409, detail="Create the hall seat layout before scheduling a showtime")
    overlap = db.scalar(
        select(Showtime.id).where(
            Showtime.hall_id == hall.id,
            Showtime.status == "scheduled",
            Showtime.start_at < payload.end_at,
            Showtime.end_at > payload.start_at,
        ).limit(1)
    )
    if overlap is not None:
        raise HTTPException(status_code=409, detail="Showtime overlaps an existing screening in this hall")
    showtime = Showtime(**payload.model_dump())
    db.add(showtime)
    db.commit()
    db.refresh(showtime)
    return {
        "id": showtime.id,
        "movie_id": showtime.movie_id,
        "hall_id": showtime.hall_id,
        "start_at": showtime.start_at,
        "end_at": showtime.end_at,
        "base_price": showtime.base_price,
        "language": showtime.language,
        "status": showtime.status,
    }


@router.patch("/showtimes/{showtime_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_showtime(showtime_id: uuid.UUID, user: AdminUser, db: DbSession) -> None:
    del user
    showtime = db.scalar(select(Showtime).where(Showtime.id == showtime_id).with_for_update())
    if showtime is None:
        raise HTTPException(status_code=404, detail="Showtime not found")
    if db.scalar(
        select(Ticket.id)
        .where(Ticket.showtime_id == showtime.id, Ticket.status.in_(("issued", "checked_in")))
        .limit(1)
    ):
        raise HTTPException(status_code=409, detail="Cannot cancel a showtime with issued tickets")
    showtime.status = "cancelled"
    now = datetime.now(timezone.utc)
    released_seats = db.scalars(
        select(SeatHold.seat_id).where(
            SeatHold.showtime_id == showtime.id,
            SeatHold.released_at.is_(None),
        )
    ).all()
    db.execute(
        update(SeatHold)
        .where(SeatHold.showtime_id == showtime.id, SeatHold.released_at.is_(None))
        .values(released_at=now)
    )
    db.commit()
    await seat_socket_manager.publish(showtime.id, released_seats)


@router.post("/food", response_model=FoodOut, status_code=status.HTTP_201_CREATED)
def create_food(payload: AdminFoodCreate, user: AdminUser, db: DbSession) -> FoodItem:
    del user
    food = FoodItem(**payload.model_dump())
    db.add(food)
    db.commit()
    db.refresh(food)
    return food


@router.patch("/food/{food_id}", response_model=FoodOut)
def update_food(
    food_id: uuid.UUID,
    payload: AdminFoodUpdate,
    user: AdminUser,
    db: DbSession,
) -> FoodItem:
    del user
    food = db.scalar(select(FoodItem).where(FoodItem.id == food_id).with_for_update())
    if food is None:
        raise HTTPException(status_code=404, detail="Food item not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(food, field, value)
    db.commit()
    db.refresh(food)
    return food


@router.post("/vouchers", status_code=status.HTTP_201_CREATED)
def create_voucher(
    payload: AdminVoucherCreate,
    user: AdminUser,
    db: DbSession,
) -> dict[str, object]:
    del user
    voucher = Voucher(
        **{
            **payload.model_dump(),
            "code": payload.code.upper(),
        }
    )
    db.add(voucher)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Voucher code already exists") from None
    db.refresh(voucher)
    return {
        "id": voucher.id,
        "code": voucher.code,
        "voucher_type": voucher.voucher_type,
        "value": voucher.value,
        "min_order": voucher.min_order,
        "max_discount": voucher.max_discount,
        "usage_limit": voucher.usage_limit,
        "status": voucher.status,
    }


@router.patch("/vouchers/{voucher_id}")
def update_voucher(
    voucher_id: uuid.UUID,
    payload: AdminVoucherUpdate,
    user: AdminUser,
    db: DbSession,
) -> dict[str, object]:
    del user
    voucher = db.scalar(select(Voucher).where(Voucher.id == voucher_id).with_for_update())
    if voucher is None:
        raise HTTPException(status_code=404, detail="Voucher not found")
    updates = payload.model_dump(exclude_unset=True)
    updated_value = updates.get("value", voucher.value)
    if voucher.voucher_type == "percent" and updated_value > 100:
        raise HTTPException(status_code=422, detail="Percentage voucher value cannot exceed 100")
    starts_at = updates.get("starts_at", voucher.starts_at)
    ends_at = updates.get("ends_at", voucher.ends_at)
    if starts_at is not None and ends_at is not None and ends_at <= starts_at:
        raise HTTPException(status_code=422, detail="Voucher end must be after start")
    for field, value in updates.items():
        setattr(voucher, field, value)
    db.commit()
    return {
        "id": voucher.id,
        "code": voucher.code,
        "voucher_type": voucher.voucher_type,
        "value": voucher.value,
        "min_order": voucher.min_order,
        "max_discount": voucher.max_discount,
        "usage_limit": voucher.usage_limit,
        "status": voucher.status,
    }


@router.get("/users", response_model=list[UserPublic])
def list_users(
    user: AdminUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
) -> list[User]:
    del user
    return list(
        db.scalars(
            select(User).order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        ).all()
    )


@router.patch("/users/{user_id}", response_model=UserPublic)
def update_user(
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    current_admin: AdminUser,
    db: DbSession,
) -> User:
    target = db.scalar(select(User).where(User.id == user_id).with_for_update())
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=422, detail="At least one user field must be provided")
    if target.id == current_admin.id and (
        updates.get("role", target.role) != "admin" or updates.get("status", target.status) != "active"
    ):
        raise HTTPException(status_code=409, detail="Administrators cannot disable or demote themselves")
    for field, value in updates.items():
        setattr(target, field, value)
    if target.status != "active":
        db.execute(
            update(AuthSession)
            .where(AuthSession.user_id == target.id, AuthSession.revoked_at.is_(None))
            .values(revoked_at=datetime.now(timezone.utc))
        )
    db.commit()
    db.refresh(target)
    return target


@router.get("/orders", response_model=list[OrderOut])
def list_all_orders(
    user: AdminUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
) -> list[OrderOut]:
    del user
    orders = db.scalars(
        select(Order)
        .order_by(Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return [_order_response(db, order) for order in orders]


@router.patch("/orders/{order_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
async def admin_cancel_order(order_id: uuid.UUID, user: AdminUser, db: DbSession) -> None:
    del user
    order = db.scalar(select(Order).where(Order.id == order_id).with_for_update())
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.payment_status == "paid":
        raise HTTPException(status_code=409, detail="Paid orders require a separate refund workflow")
    if order.order_status != "pending_payment":
        raise HTTPException(status_code=409, detail="Order is already closed")
    order.order_status = "cancelled"
    released_seats = db.scalars(select(SeatHold.seat_id).where(SeatHold.order_id == order.id)).all()
    db.execute(
        update(SeatHold)
        .where(SeatHold.order_id == order.id, SeatHold.released_at.is_(None))
        .values(released_at=datetime.now(timezone.utc))
    )
    db.commit()
    await seat_socket_manager.publish(order.showtime_id, released_seats)


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(
    user: AdminUser,
    db: DbSession,
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    movie_id: uuid.UUID | None = None,
    cinema_id: uuid.UUID | None = None,
) -> DashboardOut:
    del user
    if date_from and date_to and date_to < date_from:
        raise HTTPException(status_code=422, detail="date_to must be on or after date_from")
    order_filters = [Order.payment_status == "paid"]
    showtime_filters = [Showtime.status.in_(("scheduled", "completed"))]
    if date_from:
        start = datetime.combine(date_from, time.min, tzinfo=timezone.utc)
        order_filters.append(Order.created_at >= start)
        showtime_filters.append(Showtime.start_at >= start)
    if date_to:
        end = datetime.combine(date_to, time.max, tzinfo=timezone.utc)
        order_filters.append(Order.created_at <= end)
        showtime_filters.append(Showtime.start_at <= end)
    if movie_id:
        order_filters.append(Showtime.movie_id == movie_id)
        showtime_filters.append(Showtime.movie_id == movie_id)
    if cinema_id:
        order_filters.append(Hall.cinema_id == cinema_id)
        showtime_filters.append(Hall.cinema_id == cinema_id)

    order_query = (
        select(Order.total.label("total"), Order.created_at.label("created_at"))
        .join(Showtime, Order.showtime_id == Showtime.id)
        .join(Hall, Showtime.hall_id == Hall.id)
        .where(*order_filters)
        .subquery()
    )
    filtered_showtimes = (
        select(Showtime.id.label("id"), Showtime.hall_id.label("hall_id"))
        .join(Hall, Showtime.hall_id == Hall.id)
        .where(*showtime_filters)
        .subquery()
    )
    totals = db.execute(
        select(
            func.coalesce(func.sum(order_query.c.total), Decimal("0")),
            func.count(order_query.c.total),
        )
    ).one()
    daily_revenue = db.execute(
        select(
            func.date(order_query.c.created_at),
            func.sum(order_query.c.total),
            func.count(order_query.c.total),
        )
        .group_by(func.date(order_query.c.created_at))
        .order_by(func.date(order_query.c.created_at))
    ).all()
    tickets_sold = db.scalar(
        select(func.count(Ticket.id))
        .join(Showtime, Ticket.showtime_id == Showtime.id)
        .join(filtered_showtimes, filtered_showtimes.c.id == Showtime.id)
        .where(
            Ticket.status.in_(("issued", "checked_in")),
        )
    ) or 0
    seat_capacities = (
        select(Seat.hall_id, func.count(Seat.id).label("capacity"))
        .where(Seat.status == "active")
        .group_by(Seat.hall_id)
        .subquery()
    )
    capacity = db.scalar(
        select(func.coalesce(func.sum(seat_capacities.c.capacity), 0))
        .select_from(filtered_showtimes)
        .outerjoin(seat_capacities, seat_capacities.c.hall_id == filtered_showtimes.c.hall_id)
    ) or 0
    return DashboardOut(
        revenue=totals[0],
        tickets_sold=tickets_sold,
        paid_orders=totals[1],
        occupancy_rate=(Decimal(tickets_sold) * 100 / Decimal(capacity)) if capacity else Decimal("0"),
        revenue_by_day=[
            {"date": str(day), "revenue": revenue, "paid_orders": order_count}
            for day, revenue, order_count in daily_revenue
        ],
    )
