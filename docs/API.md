# CineGo REST API

Base path: `/api/v1`. FastAPI-generated OpenAPI is available at `/docs` and `/openapi.json` outside production. Requests/responses use JSON, UUID strings, ISO 8601 timezone-aware timestamps, and VND decimal amounts.

The API reflects the CineGo Vision, UC-01–UC-12, FEAT-01–FEAT-28, and the project constraints: role separation, 5-minute seat holds, server-side pricing, simulated payment only, non-reusable QR tickets, and no real payment credentials.

## Authentication and permissions

Send `Authorization: Bearer <access_token>` on protected routes. Login tokens expire after 30 minutes by default and are validated against a server-side session on every request; `POST /auth/logout` revokes the current session. Invalid credentials always return the same response. Five failed password attempts temporarily lock that account for 15 minutes.

| Role | Access |
|---|---|
| Guest | Movie, cinema, showtime, seat map and active food catalog |
| Customer | Own profile, booking history, seat holds, Smart Seat, orders, payments, own QR tickets |
| Staff | QR check-in |
| Admin | Staff check-in, dashboard, users and management operations |

Registration accepts only customer data; role values from a client are not accepted. The first admin is provisioned using `python -m app.create_admin`, not public registration.

### Authentication endpoints

| Method & path | Permission | Request | Success |
|---|---|---|---|
| `POST /auth/register` | Guest | `{ "full_name", "email", "phone?", "password", "password_confirmation" }` | `201 UserPublic`; password must be at least 8 characters |
| `POST /auth/login` | Guest | `{ "email", "password" }` | `200 { access_token, token_type, expires_in, user }` |
| `POST /auth/logout` | Any authenticated role | No body | `204`; revokes this bearer session |
| `GET /auth/me` | Any authenticated role | — | `200 UserPublic` |
| `PATCH /auth/me` | Any authenticated role | `{ "full_name?", "phone?", "current_password?", "new_password?" }` | `200 UserPublic`; current password required to change password |
| `POST /auth/password-reset/request` | Guest | `{ "email" }` | `202` generic response; SMTP must be configured or API returns `503` |
| `POST /auth/password-reset/confirm` | Guest | `{ "token", "new_password" }` | `204`; consumes the token and revokes all existing user sessions |
| `POST /auth/socket-ticket` | Any authenticated role | — | `201 { ticket, expires_at }`; one-use WebSocket credential expires in 30 seconds |

## Catalog, seat map and booking

| Method & path | Permission | Behavior |
|---|---|---|
| `GET /movies?q=&genre=&status=&page=&page_size=` | Guest | Paginated movie catalog; `status` is `now_showing` or `coming_soon`; page size max 100 |
| `GET /movies/{movie_id}` | Guest | Movie detail, including synopsis, cast, director, rating and media URLs |
| `GET /cinemas` | Guest | Active cinemas |
| `GET /showtimes?movie_id=&cinema_id=&date=` | Guest | Future scheduled showtimes with current available seat counts |
| `GET /showtimes/{showtime_id}/seats` | Guest | Seat map with `available`, `held` or `sold` state and server price (`base_price + seat.price_modifier`) |
| `GET /food` | Guest | Active in-stock menu and prices |
| `POST /showtimes/{showtime_id}/seat-holds` | Customer | `{ "seat_ids": ["uuid", ...] }`; atomically holds up to configured maximum for five minutes |
| `DELETE /seat-holds/{hold_id}` | Owning Customer | Immediately releases one hold; other customers receive a live event |
| `POST /showtimes/{showtime_id}/smart-seat` | Customer | `{ "count": 2, "together": true, "preferred_zone": "middle" }`; returns up to three ranked available groups |
| `GET /showtimes/{showtime_id}/live-seats?ticket=<one-use-ticket>` (WebSocket) | Authenticated one-use ticket | Connect after `POST /auth/socket-ticket`; broadcasts `seat_status_changed` event and changed seat IDs. Re-fetch the seat map after each event. |
| `POST /orders` | Customer | `{ "showtime_id", "seat_ids": [...], "food_items": [{ "food_item_id", "quantity" }], "voucher_code?" }`; validates active holds and computes all prices on the server |
| `GET /orders?page=&page_size=` | Customer | Own booking history only |
| `GET /orders/{order_id}` | Owning Customer | Own order details only |
| `DELETE /orders/{order_id}` | Owning Customer | Cancels unpaid order and releases its seat holds; paid orders require a separate refund workflow |

Live WebSocket event:

```json
{
  "event": "seat_status_changed",
  "showtime_id": "8c75a6c5-c921-4ee7-9600-7c7ea2d8c55e",
  "seat_ids": ["92b9da95-363f-4883-8826-4070df3aa0ec"],
  "occurred_at": "2026-10-26T10:00:00+00:00"
}
```

The connection ticket is short-lived, one-use and stored hashed; do not use bearer access tokens in WebSocket query strings. The in-memory event fan-out works for one Render instance. Multi-instance deployments need a shared pub/sub broker.

## Mock payment and tickets

`POST /orders/{order_id}/payments` accepts:

```json
{
  "idempotency_key": "f28b0087-7b7b-4c8e-a3b9-3d2ec44cd8b9",
  "payment_method": "mock_card",
  "simulated_result": "succeeded"
}
```

- `payment_method`: `mock_card`, `mock_wallet`, or `mock_cash`. These are labels only; no payment credentials are accepted.
- `simulated_result`: `succeeded` or `failed`, for the academic mock-payment flow.
- Repeating a request with the same key returns the original attempt; reusing the key for a different order/user returns `409`.
- On success, order, stock, voucher use, seat conversion, and tickets are committed in one database transaction. Failure is recorded and the still-live seat hold may be retried.
- Changing the password through the profile endpoint or reset flow revokes all active sessions.

| Method & path | Permission | Behavior |
|---|---|---|
| `GET /tickets` | Customer | Own paid-order tickets, including signed QR payload |
| `GET /tickets/{ticket_code}` | Owning Customer | One own ticket |
| `POST /staff/check-in` | Staff or Admin | `{ "qr_token": "<signed-value>", "showtime_id?": "uuid" }`; validates signature and payment, then atomically checks in once |

## Admin operations

All routes require `admin`; records referenced by history are deactivated/cancelled rather than hard-deleted.

| Method & path | Behavior |
|---|---|
| `POST /admin/movies`, `PATCH /admin/movies/{movie_id}`, `DELETE /admin/movies/{movie_id}` | Create, edit, or deactivate movies |
| `POST /admin/cinemas`, `PATCH /admin/cinemas/{cinema_id}` | Create/update cinema; upcoming screenings must be cancelled before deactivation |
| `POST /admin/halls`, `PATCH /admin/halls/{hall_id}/status` | Create/deactivate cinema hall; future screenings must be cancelled first |
| `PUT /admin/halls/{hall_id}/seats`, `PATCH /admin/seats/{seat_id}/status` | Create an initial layout or deactivate an unused seat |
| `POST /admin/showtimes` | Schedule a screening; overlapping intervals in one hall are rejected |
| `PATCH /admin/showtimes/{showtime_id}/cancel` | Cancel a screening without issued tickets and release holds |
| `POST /admin/food`, `PATCH /admin/food/{food_id}` | Manage menu item, price, stock and availability |
| `POST /admin/vouchers`, `PATCH /admin/vouchers/{voucher_id}` | Create or update a fixed or percentage discount voucher |
| `GET /admin/users?page=&page_size=`, `PATCH /admin/users/{user_id}` | List and manage roles/status; deactivation revokes active sessions |
| `GET /admin/orders?page=&page_size=`, `PATCH /admin/orders/{order_id}/cancel` | Inspect and cancel unpaid orders |
| `GET /admin/dashboard?date_from=&date_to=&movie_id=&cinema_id=` | Paid revenue, paid orders, issued tickets, occupancy and daily revenue |

Initial seat layout format:

```json
{
  "seats": [
    { "row_label": "A", "seat_number": 1, "seat_type": "standard", "price_modifier": 0 },
    { "row_label": "A", "seat_number": 2, "seat_type": "vip", "price_modifier": 25000 }
  ]
}
```

## Status and error contract

Successful reads/writes return `200`, `201` or `204` as documented. Validation errors use FastAPI's `422` response. Errors include a safe `detail` string and do not contain SQL, password hashes, reset tokens or internal exception details.

| HTTP | Meaning |
|---|---|
| `400` | Invalid credentials for a password reset token or incorrect current password |
| `401` | Missing, expired, invalid or revoked bearer token; invalid login credentials |
| `403` | Authenticated but wrong role |
| `404` | Resource not found or not owned by the caller |
| `409` | Seat race, invalid state transition, duplicate idempotency key, schedule overlap or resource conflict |
| `410` | QR ticket belongs to an expired showtime |
| `422` | Payload or business-rule validation error |
| `429` | Login lockout |
| `503` | Password-reset email delivery is unavailable |

Health endpoints outside the API prefix are `GET /health/live` and `GET /health/ready`. Readiness performs a database `SELECT 1`; liveness does not depend on Supabase availability.
