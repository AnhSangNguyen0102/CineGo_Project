import secrets
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.dependencies import CustomerUser, DbSession
from app.models import (
    FoodItem,
    Order,
    OrderItem,
    Payment,
    Seat,
    SeatHold,
    Showtime,
    Ticket,
    Voucher,
)
from app.routers.seats import seat_socket_manager
from app.schemas import (
    OrderCreateRequest,
    OrderItemOut,
    OrderOut,
    PaymentOut,
    PaymentRequest,
)
from app.security import sign_ticket

router = APIRouter(tags=["Orders & Payments"])


def _order_response(db: Session, order: Order) -> OrderOut:
    items = db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)).all()
    holds = db.scalars(select(SeatHold).where(SeatHold.order_id == order.id)).all()
    return OrderOut(
        id=order.id,
        order_code=order.order_code,
        showtime_id=order.showtime_id,
        subtotal=order.subtotal,
        discount=order.discount,
        total=order.total,
        payment_status=order.payment_status,
        order_status=order.order_status,
        created_at=order.created_at,
        items=[OrderItemOut.model_validate(item) for item in items],
        seat_ids=[hold.seat_id for hold in holds],
    )


@router.post("/orders", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreateRequest, user: CustomerUser, db: DbSession) -> OrderOut:
    now = datetime.now(timezone.utc)
    showtime = db.scalar(select(Showtime).where(Showtime.id == payload.showtime_id).with_for_update())
    if showtime is None:
        raise HTTPException(status_code=404, detail="Showtime not found")
    if showtime.status != "scheduled" or showtime.start_at <= now:
        raise HTTPException(status_code=409, detail="Showtime is not open for booking")

    holds = db.scalars(
        select(SeatHold)
        .where(
            SeatHold.showtime_id == showtime.id,
            SeatHold.user_id == user.id,
            SeatHold.seat_id.in_(payload.seat_ids),
            SeatHold.released_at.is_(None),
            SeatHold.expires_at > now,
        )
        .with_for_update()
    ).all()
    if len(holds) != len(payload.seat_ids):
        raise HTTPException(status_code=409, detail="Seat selection is no longer held; select the seats again")
    if any(hold.order_id is not None for hold in holds):
        raise HTTPException(status_code=409, detail="A seat hold is already assigned to a pending order")
    sold = db.scalar(
        select(Ticket.id)
        .where(
            Ticket.showtime_id == showtime.id,
            Ticket.seat_id.in_(payload.seat_ids),
            Ticket.status.in_(("issued", "checked_in")),
        )
        .limit(1)
    )
    if sold is not None:
        raise HTTPException(status_code=409, detail="One or more seats have already been sold")

    seat_rows = db.scalars(
        select(Seat).where(Seat.id.in_(payload.seat_ids), Seat.hall_id == showtime.hall_id)
    ).all()
    if len(seat_rows) != len(payload.seat_ids):
        raise HTTPException(status_code=409, detail="Seat selection is invalid for this showtime")
    prices = {seat.id: showtime.base_price + seat.price_modifier for seat in seat_rows}
    subtotal = sum(prices.values(), Decimal("0"))
    item_rows: list[tuple[FoodItem, int]] = []
    for requested in payload.food_items:
        food = db.scalar(
            select(FoodItem).where(
                FoodItem.id == requested.food_item_id,
                FoodItem.status == "active",
            ).with_for_update()
        )
        if food is None or food.stock < requested.quantity:
            raise HTTPException(status_code=409, detail="A food item is unavailable or out of stock")
        subtotal += food.price * requested.quantity
        item_rows.append((food, requested.quantity))

    voucher = None
    discount = Decimal("0")
    if payload.voucher_code:
        voucher = db.scalar(
            select(Voucher).where(Voucher.code == payload.voucher_code.strip().upper()).with_for_update()
        )
        if (
            voucher is None
            or voucher.status != "active"
            or (voucher.starts_at is not None and voucher.starts_at > now)
            or (voucher.ends_at is not None and voucher.ends_at < now)
            or (voucher.usage_limit is not None and voucher.usage_count >= voucher.usage_limit)
            or subtotal < voucher.min_order
        ):
            raise HTTPException(status_code=422, detail="Voucher is invalid or not applicable")
        if voucher.voucher_type == "percent":
            discount = subtotal * voucher.value / Decimal("100")
            if voucher.max_discount:
                discount = min(discount, voucher.max_discount)
        else:
            discount = voucher.value
        discount = min(discount, subtotal)

    order = Order(
        order_code=f"CG{secrets.token_hex(8).upper()}",
        user_id=user.id,
        showtime_id=showtime.id,
        voucher_id=voucher.id if voucher else None,
        subtotal=subtotal,
        discount=discount,
        total=subtotal - discount,
        payment_status="pending",
        order_status="pending_payment",
    )
    db.add(order)
    db.flush()
    for food, quantity in item_rows:
        db.add(
            OrderItem(
                order_id=order.id,
                item_type="food",
                ref_id=food.id,
                quantity=quantity,
                unit_price=food.price,
                amount=food.price * quantity,
            )
        )
    for hold in holds:
        hold.order_id = order.id
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Order could not be created; refresh and try again") from None
    db.refresh(order)
    return _order_response(db, order)


@router.get("/orders", response_model=list[OrderOut])
def list_orders(
    user: CustomerUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> list[OrderOut]:
    orders = db.scalars(
        select(Order)
        .where(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return [_order_response(db, order) for order in orders]


@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order(order_id: uuid.UUID, user: CustomerUser, db: DbSession) -> OrderOut:
    order = db.scalar(select(Order).where(Order.id == order_id, Order.user_id == user.id))
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return _order_response(db, order)


@router.delete("/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_order(order_id: uuid.UUID, user: CustomerUser, db: DbSession) -> None:
    order = db.scalar(
        select(Order).where(Order.id == order_id, Order.user_id == user.id).with_for_update()
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.payment_status == "paid":
        raise HTTPException(status_code=409, detail="A paid order cannot be cancelled through this endpoint")
    if order.order_status != "pending_payment":
        raise HTTPException(status_code=409, detail="Order is already closed")
    now = datetime.now(timezone.utc)
    order.order_status = "cancelled"
    db.execute(
        update(SeatHold)
        .where(SeatHold.order_id == order.id, SeatHold.released_at.is_(None))
        .values(released_at=now)
    )
    db.commit()
    released_seats = db.scalars(select(SeatHold.seat_id).where(SeatHold.order_id == order.id)).all()
    await seat_socket_manager.publish(order.showtime_id, released_seats)


def _payment_response(db: Session, payment: Payment, order: Order) -> PaymentOut:
    tickets = db.scalars(select(Ticket).where(Ticket.order_id == order.id).order_by(Ticket.ticket_code)).all()
    return PaymentOut(
        payment_id=payment.id,
        order_id=order.id,
        status=payment.status,
        amount=payment.amount,
        ticket_codes=[ticket.ticket_code for ticket in tickets],
        qr_tokens=[sign_ticket(ticket.id) for ticket in tickets] if payment.status == "succeeded" else [],
    )


@router.post("/orders/{order_id}/payments", response_model=PaymentOut)
async def pay_order(
    order_id: uuid.UUID,
    payload: PaymentRequest,
    user: CustomerUser,
    db: DbSession,
) -> PaymentOut:
    existing_payment = db.scalar(
        select(Payment).where(Payment.idempotency_key == payload.idempotency_key)
    )
    if existing_payment is not None:
        existing_order = db.get(Order, existing_payment.order_id)
        if existing_order is None or existing_order.user_id != user.id or existing_order.id != order_id:
            raise HTTPException(status_code=409, detail="Idempotency key has already been used")
        return _payment_response(db, existing_payment, existing_order)

    order = db.scalar(
        select(Order).where(Order.id == order_id, Order.user_id == user.id).with_for_update()
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.payment_status == "paid" or order.order_status != "pending_payment":
        raise HTTPException(status_code=409, detail="Order is not awaiting payment")
    showtime = db.scalar(
        select(Showtime).where(Showtime.id == order.showtime_id).with_for_update()
    )
    if showtime is None or showtime.status != "scheduled":
        db.rollback()
        raise HTTPException(status_code=409, detail="Showtime is no longer available")
    now = datetime.now(timezone.utc)
    holds = db.scalars(
        select(SeatHold)
        .where(
            SeatHold.order_id == order.id,
            SeatHold.user_id == user.id,
            SeatHold.released_at.is_(None),
            SeatHold.expires_at > now,
        )
        .with_for_update()
    ).all()
    all_order_holds = db.scalars(select(SeatHold).where(SeatHold.order_id == order.id)).all()
    if not holds or len(holds) != len(all_order_holds):
        raise HTTPException(status_code=409, detail="Seat hold expired; cancel the order and select seats again")
    payment_seats = db.scalars(
        select(Seat)
        .where(Seat.id.in_([hold.seat_id for hold in holds]))
        .order_by(Seat.id)
        .with_for_update()
    ).all()
    if len(payment_seats) != len(holds) or any(seat.status != "active" for seat in payment_seats):
        db.rollback()
        raise HTTPException(status_code=409, detail="A selected seat is no longer available")

    payment = Payment(
        order_id=order.id,
        idempotency_key=payload.idempotency_key,
        amount=order.total,
        payment_method=payload.payment_method,
        status=payload.simulated_result,
    )
    db.add(payment)
    if payload.simulated_result == "failed":
        order.payment_status = "failed"
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=409, detail="Idempotency key has already been used") from None
        db.refresh(payment)
        return _payment_response(db, payment, order)

    if order.voucher_id is not None:
        voucher = db.scalar(select(Voucher).where(Voucher.id == order.voucher_id).with_for_update())
        if voucher is None or (
            voucher.usage_limit is not None and voucher.usage_count >= voucher.usage_limit
        ):
            db.rollback()
            raise HTTPException(status_code=409, detail="Voucher is no longer available")
        voucher.usage_count += 1
    order_items = db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)).all()
    for item in order_items:
        food = db.scalar(select(FoodItem).where(FoodItem.id == item.ref_id).with_for_update())
        if food is None or food.stock < item.quantity:
            db.rollback()
            raise HTTPException(status_code=409, detail="A food item is no longer available")
        food.stock -= item.quantity
    tickets = []
    for hold in holds:
        ticket = Ticket(
            order_id=order.id,
            showtime_id=order.showtime_id,
            seat_id=hold.seat_id,
            ticket_code=f"TK{secrets.token_hex(8).upper()}",
            status="issued",
        )
        db.add(ticket)
        tickets.append(ticket)
        hold.released_at = now
    order.payment_status = "paid"
    order.order_status = "confirmed"
    try:
        db.flush()
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Payment could not be completed; refresh the order") from None
    db.refresh(payment)
    await seat_socket_manager.publish(order.showtime_id, [hold.seat_id for hold in holds])
    return _payment_response(db, payment, order)
