import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('customer', 'staff', 'admin')"),
        CheckConstraint("status IN ('active', 'inactive', 'locked')"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(32))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(16), default="customer")
    status: Mapped[str] = mapped_column(String(16), default="active")
    failed_login_count: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WebSocketTicket(Base):
    __tablename__ = "websocket_tickets"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Movie(Base):
    __tablename__ = "movies"
    __table_args__ = (CheckConstraint("duration_minutes > 0"), CheckConstraint("status IN ('now_showing', 'coming_soon', 'inactive')"))
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(240), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    director: Mapped[str | None] = mapped_column(String(160))
    casts: Mapped[str | None] = mapped_column(Text)
    genre: Mapped[str | None] = mapped_column(String(120), index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer)
    language: Mapped[str | None] = mapped_column(String(80))
    age_rating: Mapped[str | None] = mapped_column(String(20))
    trailer_url: Mapped[str | None] = mapped_column(String(2048))
    poster_url: Mapped[str | None] = mapped_column(String(2048))
    status: Mapped[str] = mapped_column(String(20), default="coming_soon", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Cinema(Base):
    __tablename__ = "cinemas"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(160))
    address: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(16), default="active")


class Hall(Base):
    __tablename__ = "halls"
    __table_args__ = (UniqueConstraint("cinema_id", "name"), CheckConstraint("rows_count > 0 AND columns_count > 0"))
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    cinema_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cinemas.id", ondelete="RESTRICT"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    hall_type: Mapped[str] = mapped_column(String(60))
    rows_count: Mapped[int] = mapped_column(Integer)
    columns_count: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(16), default="active")


class Seat(Base):
    __tablename__ = "seats"
    __table_args__ = (
        UniqueConstraint("hall_id", "row_label", "seat_number"),
        CheckConstraint("seat_type IN ('standard', 'vip', 'couple', 'accessible')"),
        CheckConstraint("price_modifier >= 0"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    hall_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("halls.id", ondelete="RESTRICT"), index=True)
    row_label: Mapped[str] = mapped_column(String(8))
    seat_number: Mapped[int] = mapped_column(Integer)
    seat_type: Mapped[str] = mapped_column(String(20), default="standard")
    price_modifier: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0"))
    status: Mapped[str] = mapped_column(String(16), default="active")


class Showtime(Base):
    __tablename__ = "showtimes"
    __table_args__ = (
        CheckConstraint("end_at > start_at"),
        CheckConstraint("base_price >= 0"),
        CheckConstraint("status IN ('scheduled', 'cancelled', 'completed')"),
        Index("ix_showtimes_hall_start_end", "hall_id", "start_at", "end_at"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    movie_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("movies.id", ondelete="RESTRICT"), index=True)
    hall_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("halls.id", ondelete="RESTRICT"), index=True)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    base_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    language: Mapped[str | None] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(16), default="scheduled")


class FoodItem(Base):
    __tablename__ = "food_items"
    __table_args__ = (CheckConstraint("price >= 0 AND stock >= 0"), CheckConstraint("status IN ('active', 'inactive')"))
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(80))
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    stock: Mapped[int] = mapped_column(Integer, default=0)
    image_url: Mapped[str | None] = mapped_column(String(2048))
    status: Mapped[str] = mapped_column(String(16), default="active")


class Voucher(Base):
    __tablename__ = "vouchers"
    __table_args__ = (
        UniqueConstraint("code"),
        CheckConstraint("value > 0 AND min_order >= 0 AND max_discount >= 0"),
        CheckConstraint("voucher_type IN ('fixed', 'percent')"),
        CheckConstraint("voucher_type != 'percent' OR value <= 100"),
        CheckConstraint("usage_limit IS NULL OR usage_limit >= 0"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(40))
    voucher_type: Mapped[str] = mapped_column(String(16))
    value: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    min_order: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0"))
    max_discount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0"))
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    usage_limit: Mapped[int | None] = mapped_column(Integer)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16), default="active")


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint("subtotal >= 0 AND discount >= 0 AND total >= 0"),
        CheckConstraint("payment_status IN ('pending', 'paid', 'failed', 'refunded')"),
        CheckConstraint("order_status IN ('pending_payment', 'confirmed', 'cancelled', 'expired')"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    order_code: Mapped[str] = mapped_column(String(24), unique=True, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    showtime_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("showtimes.id", ondelete="RESTRICT"), index=True)
    voucher_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("vouchers.id", ondelete="RESTRICT"))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    discount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    payment_status: Mapped[str] = mapped_column(String(20), default="pending")
    order_status: Mapped[str] = mapped_column(String(24), default="pending_payment")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class SeatHold(Base):
    __tablename__ = "seat_holds"
    __table_args__ = (
        Index("uq_active_seat_hold", "showtime_id", "seat_id", unique=True, postgresql_where=text("released_at IS NULL")),
        Index("ix_seat_holds_expiry", "expires_at", postgresql_where=text("released_at IS NULL")),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    showtime_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("showtimes.id", ondelete="RESTRICT"), index=True)
    seat_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("seats.id", ondelete="RESTRICT"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    order_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("orders.id", ondelete="SET NULL"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (CheckConstraint("quantity > 0 AND unit_price >= 0 AND amount >= 0"), CheckConstraint("item_type IN ('food', 'combo')"))
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    item_type: Mapped[str] = mapped_column(String(16))
    ref_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("food_items.id", ondelete="RESTRICT"))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (UniqueConstraint("idempotency_key"), CheckConstraint("amount >= 0"), CheckConstraint("status IN ('succeeded', 'failed')"))
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="RESTRICT"), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(80))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    payment_method: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = (
        UniqueConstraint("showtime_id", "seat_id"),
        CheckConstraint("status IN ('issued', 'checked_in', 'cancelled', 'expired')"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="RESTRICT"), index=True)
    showtime_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("showtimes.id", ondelete="RESTRICT"), index=True)
    seat_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("seats.id", ondelete="RESTRICT"))
    ticket_code: Mapped[str] = mapped_column(String(24), unique=True)
    status: Mapped[str] = mapped_column(String(16), default="issued")
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
