import asyncio
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError
from starlette.middleware.base import RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.config import get_settings
from app.db import SessionLocal
from app.models import Order, SeatHold
from app.routers import admin, auth, catalog, orders, seats, tickets

settings = get_settings()
logger = logging.getLogger(__name__)


async def expire_seat_holds() -> None:
    while True:
        started_at = asyncio.get_running_loop().time()
        sweep_time = datetime.now(timezone.utc)
        changed_by_showtime: dict[uuid.UUID, list[uuid.UUID]] = {}
        order_ids: set[uuid.UUID] = set()
        try:
            with SessionLocal() as db:
                expired = db.scalars(
                    select(SeatHold)
                    .where(SeatHold.released_at.is_(None), SeatHold.expires_at <= sweep_time)
                    .with_for_update(skip_locked=True)
                ).all()
                for hold in expired:
                    changed_by_showtime.setdefault(hold.showtime_id, []).append(hold.seat_id)
                    if hold.order_id is not None:
                        order_ids.add(hold.order_id)
                    hold.released_at = sweep_time
                db.commit()
        except SQLAlchemyError:
            logger.exception("Seat-hold expiry sweep failed")
            changed_by_showtime.clear()
            order_ids.clear()
        if order_ids:
            try:
                with SessionLocal() as db:
                    for order_id in order_ids:
                        order = db.scalar(select(Order).where(Order.id == order_id).with_for_update())
                        if order is None or order.order_status != "pending_payment":
                            continue
                        active_hold = db.scalar(
                            select(SeatHold.id).where(
                                SeatHold.order_id == order.id,
                                SeatHold.released_at.is_(None),
                                SeatHold.expires_at > sweep_time,
                            ).limit(1)
                        )
                        if active_hold is None:
                            order.order_status = "expired"
                    db.commit()
            except SQLAlchemyError:
                logger.exception("Expired order state update failed")
        for showtime_id, seat_ids in changed_by_showtime.items():
            await seats.seat_socket_manager.publish(showtime_id, seat_ids)
        elapsed = asyncio.get_running_loop().time() - started_at
        await asyncio.sleep(max(1.0 - elapsed, 0.1))


@asynccontextmanager
async def lifespan(_: FastAPI):
    expiry_task = None
    if settings.environment != "test":
        expiry_task = asyncio.create_task(expire_seat_holds())
    try:
        yield
    finally:
        if expiry_task is not None:
            expiry_task.cancel()
            try:
                await expiry_task
            except asyncio.CancelledError:
                pass


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description=(
        "CineGo Smart Cinema REST API. Online payments are simulated only. "
        "Authentication uses short-lived bearer tokens with server-side revocable sessions."
    ),
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
    openapi_url="/openapi.json" if settings.environment != "production" else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next: RequestResponseEndpoint) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    if settings.environment == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.get("/health/live", tags=["Health"])
def live() -> dict[str, str]:
    return {"status": "alive"}


@app.get("/health/ready", tags=["Health"])
def ready() -> dict[str, str]:
    with SessionLocal() as database:
        database.execute(text("SELECT 1"))
    return {"status": "ready"}


for route_module in (auth, catalog, seats, orders, tickets, admin):
    app.include_router(route_module.router, prefix=settings.api_v1_prefix)
