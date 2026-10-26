import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: EmailStr
    phone: str | None
    role: str
    status: str
    created_at: datetime


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=32)
    password: str = Field(min_length=8, max_length=128)
    password_confirmation: str = Field(min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Full name cannot be blank")
        return value

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password != self.password_confirmation:
            raise ValueError("Passwords do not match")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserPublic


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    current_password: str | None = Field(default=None, min_length=8, max_length=128)
    new_password: str | None = Field(default=None, min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def clean_optional_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Full name cannot be blank")
        return value

    @model_validator(mode="after")
    def require_current_password_for_password_change(self) -> "ProfileUpdate":
        if self.new_password is not None and self.current_password is None:
            raise ValueError("Current password is required to change password")
        return self


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=32, max_length=256)
    new_password: str = Field(min_length=8, max_length=128)


class MovieOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str | None
    director: str | None
    casts: str | None
    genre: str | None
    duration_minutes: int
    language: str | None
    age_rating: str | None
    trailer_url: str | None
    poster_url: str | None
    status: str


class CinemaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    address: str
    status: str


class FoodOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    category: str
    price: Decimal
    image_url: str | None


class ShowtimeOut(BaseModel):
    id: uuid.UUID
    movie_id: uuid.UUID
    movie_title: str
    cinema_id: uuid.UUID
    cinema_name: str
    hall_id: uuid.UUID
    hall_name: str
    start_at: datetime
    end_at: datetime
    language: str | None
    base_price: Decimal
    available_seats: int


class SeatOut(BaseModel):
    id: uuid.UUID
    row_label: str
    seat_number: int
    seat_type: str
    price: Decimal
    status: Literal["available", "held", "sold"]


class SeatMapOut(BaseModel):
    showtime_id: uuid.UUID
    hold_expires_in_minutes: int
    seats: list[SeatOut]


class SeatHoldRequest(BaseModel):
    seat_ids: list[uuid.UUID] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def unique_seats(self) -> "SeatHoldRequest":
        if len(set(self.seat_ids)) != len(self.seat_ids):
            raise ValueError("Seat IDs must be unique")
        return self


class SeatHoldOut(BaseModel):
    hold_ids: list[uuid.UUID]
    seat_ids: list[uuid.UUID]
    expires_at: datetime


class SmartSeatRequest(BaseModel):
    count: int = Field(ge=1, le=8)
    together: bool = True
    preferred_zone: Literal["front", "middle", "back"] | None = None


class SmartSeatOut(BaseModel):
    recommendations: list[list[uuid.UUID]]
    seats_together: bool


class FoodQuantity(BaseModel):
    food_item_id: uuid.UUID
    quantity: int = Field(ge=1, le=20)


class OrderCreateRequest(BaseModel):
    showtime_id: uuid.UUID
    seat_ids: list[uuid.UUID] = Field(min_length=1, max_length=8)
    food_items: list[FoodQuantity] = Field(default_factory=list, max_length=20)
    voucher_code: str | None = Field(default=None, max_length=40)

    @model_validator(mode="after")
    def unique_seats(self) -> "OrderCreateRequest":
        if len(set(self.seat_ids)) != len(self.seat_ids):
            raise ValueError("Seat IDs must be unique")
        food_ids = [item.food_item_id for item in self.food_items]
        if len(set(food_ids)) != len(food_ids):
            raise ValueError("Food items must be unique; combine quantities")
        return self


class OrderItemOut(BaseModel):
    id: uuid.UUID
    item_type: str
    ref_id: uuid.UUID
    quantity: int
    unit_price: Decimal
    amount: Decimal


class OrderOut(BaseModel):
    id: uuid.UUID
    order_code: str
    showtime_id: uuid.UUID
    subtotal: Decimal
    discount: Decimal
    total: Decimal
    payment_status: str
    order_status: str
    created_at: datetime
    items: list[OrderItemOut] = Field(default_factory=list)
    seat_ids: list[uuid.UUID] = Field(default_factory=list)


class PaymentRequest(BaseModel):
    idempotency_key: str = Field(min_length=16, max_length=80, pattern=r"^[A-Za-z0-9._:-]+$")
    payment_method: Literal["mock_card", "mock_wallet", "mock_cash"] = "mock_card"
    simulated_result: Literal["succeeded", "failed"] = "succeeded"


class PaymentOut(BaseModel):
    payment_id: uuid.UUID
    order_id: uuid.UUID
    status: str
    amount: Decimal
    ticket_codes: list[str] = Field(default_factory=list)
    qr_tokens: list[str] = Field(default_factory=list)


class TicketOut(BaseModel):
    ticket_code: str
    status: str
    movie_title: str
    cinema_name: str
    hall_name: str
    start_at: datetime
    seat_label: str
    qr_token: str
    checked_in_at: datetime | None


class CheckInRequest(BaseModel):
    qr_token: str = Field(min_length=50, max_length=256)
    showtime_id: uuid.UUID | None = None


class CheckInOut(BaseModel):
    result: Literal["checked_in", "already_used"]
    ticket_code: str
    movie_title: str
    showtime_start: datetime
    seat_label: str
    checked_in_at: datetime


class AdminMovieCreate(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    description: str | None = None
    director: str | None = Field(default=None, max_length=160)
    casts: str | None = None
    genre: str | None = Field(default=None, max_length=120)
    duration_minutes: int = Field(gt=0, le=600)
    language: str | None = Field(default=None, max_length=80)
    age_rating: str | None = Field(default=None, max_length=20)
    trailer_url: str | None = Field(default=None, max_length=2048)
    poster_url: str | None = Field(default=None, max_length=2048)
    status: Literal["now_showing", "coming_soon", "inactive"] = "coming_soon"

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Movie title cannot be blank")
        return value


class AdminMovieUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=240)
    description: str | None = None
    director: str | None = Field(default=None, max_length=160)
    casts: str | None = None
    genre: str | None = Field(default=None, max_length=120)
    duration_minutes: int | None = Field(default=None, gt=0, le=600)
    language: str | None = Field(default=None, max_length=80)
    age_rating: str | None = Field(default=None, max_length=20)
    trailer_url: str | None = Field(default=None, max_length=2048)
    poster_url: str | None = Field(default=None, max_length=2048)
    status: Literal["now_showing", "coming_soon", "inactive"] | None = None


class AdminFoodCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    category: str = Field(min_length=1, max_length=80)
    price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    stock: int = Field(ge=0)
    image_url: str | None = Field(default=None, max_length=2048)
    status: Literal["active", "inactive"] = "active"

    @field_validator("name", "category")
    @classmethod
    def clean_food_fields(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Food name and category cannot be blank")
        return value


class AdminFoodUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    category: str | None = Field(default=None, min_length=1, max_length=80)
    price: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    stock: int | None = Field(default=None, ge=0)
    image_url: str | None = Field(default=None, max_length=2048)
    status: Literal["active", "inactive"] | None = None


class AdminCinemaCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    address: str = Field(min_length=1, max_length=500)


class AdminCinemaUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    address: str | None = Field(default=None, min_length=1, max_length=500)
    status: Literal["active", "inactive"] | None = None


class AdminHallCreate(BaseModel):
    cinema_id: uuid.UUID
    name: str = Field(min_length=1, max_length=100)
    hall_type: str = Field(min_length=1, max_length=60)
    rows_count: int = Field(gt=0, le=100)
    columns_count: int = Field(gt=0, le=100)


class AdminHallStatusUpdate(BaseModel):
    status: Literal["active", "inactive"]


class AdminSeatStatusUpdate(BaseModel):
    status: Literal["active", "inactive"]


class AdminSeatCreate(BaseModel):
    row_label: str = Field(min_length=1, max_length=8)
    seat_number: int = Field(gt=0)
    seat_type: Literal["standard", "vip", "couple", "accessible"] = "standard"
    price_modifier: Decimal = Field(default=Decimal("0"), ge=0, max_digits=10, decimal_places=2)


class AdminSeatLayoutCreate(BaseModel):
    seats: list[AdminSeatCreate] = Field(min_length=1, max_length=1000)

    @model_validator(mode="after")
    def unique_seats(self) -> "AdminSeatLayoutCreate":
        keys = [(seat.row_label, seat.seat_number) for seat in self.seats]
        if len(set(keys)) != len(keys):
            raise ValueError("Seat positions must be unique")
        return self


class AdminShowtimeCreate(BaseModel):
    movie_id: uuid.UUID
    hall_id: uuid.UUID
    start_at: datetime
    end_at: datetime
    base_price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    language: str | None = Field(default=None, max_length=80)

    @model_validator(mode="after")
    def check_times(self) -> "AdminShowtimeCreate":
        if self.start_at.tzinfo is None or self.end_at.tzinfo is None:
            raise ValueError("Showtime timestamps must include a timezone")
        if self.end_at <= self.start_at:
            raise ValueError("Showtime end must be after start")
        return self


class AdminUserUpdate(BaseModel):
    role: Literal["customer", "staff", "admin"] | None = None
    status: Literal["active", "inactive", "locked"] | None = None


class AdminVoucherCreate(BaseModel):
    code: str = Field(min_length=3, max_length=40, pattern=r"^[A-Za-z0-9_-]+$")
    voucher_type: Literal["fixed", "percent"]
    value: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    min_order: Decimal = Field(default=Decimal("0"), ge=0, max_digits=10, decimal_places=2)
    max_discount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=10, decimal_places=2)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    usage_limit: int | None = Field(default=None, ge=0)
    status: Literal["active", "inactive"] = "active"

    @model_validator(mode="after")
    def validate_voucher(self) -> "AdminVoucherCreate":
        if self.voucher_type == "percent" and self.value > 100:
            raise ValueError("Percentage voucher value cannot exceed 100")
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("Voucher end must be after start")
        return self


class AdminVoucherUpdate(BaseModel):
    value: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    min_order: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    max_discount: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    usage_limit: int | None = Field(default=None, ge=0)
    status: Literal["active", "inactive"] | None = None

    @model_validator(mode="after")
    def check_date_range(self) -> "AdminVoucherUpdate":
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("Voucher end must be after start")
        return self


class DashboardOut(BaseModel):
    revenue: Decimal
    tickets_sold: int
    paid_orders: int
    occupancy_rate: Decimal
    revenue_by_day: list[dict[str, str | Decimal | int]]
