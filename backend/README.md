# CineGo Smart Cinema — Backend Service

> Backend API service placeholder for CineGo Smart Cinema.

## 📋 API Specification & Contract

The frontend (`/frontend`) communicates with the backend via REST API and WebSockets. The mock data in the frontend is fully based on this contract:

### 1. Authentication
- `POST /api/auth/register` — `{ email, fullName, phone, password }`
- `POST /api/auth/login` — `{ email, password }` -> returns `{ user, token }`
- `POST /api/auth/logout` — clears session
- `POST /api/auth/forgot-password` — `{ email }`
- `POST /api/auth/reset-password` — `{ email, code, newPassword }`
- `GET /api/me` — returns current authenticated user profile
- `PUT /api/me` — updates user info (name, phone)

### 2. Movies & Showtimes
- `GET /api/movies?status=&q=&genre=&date=&cinemaId=`
- `GET /api/movies/:id`
- `GET /api/movies/:id/showtimes?date=&cinemaId=`

### 3. Real-Time Seats & Smart Seat
- `GET /api/showtimes/:id/seats` — returns `{ rows, cols, seats: [{ id, row, col, seatCode, type, status, price }] }`
- `POST /api/showtimes/:id/seats/lock` — `{ seatIds }` (Atomic: all or none. Returns `409 Conflict` if any seat taken, or `{ lockedSeatIds, expiresAt }` on 5-minute hold)
- `POST /api/showtimes/:id/seats/unlock` — `{ seatIds }`
- `POST /api/showtimes/:id/smart-seat` — `{ count, preferences: { zone, together } }`

### 4. Concessions, Orders & Simulated Payments
- `GET /api/food-items`
- `POST /api/orders` — `{ showtimeId, seatIds, foodItems: [{ foodId, quantity }] }`
- `POST /api/orders/:id/pay` — `{ paymentMethod, simulateOutcome }`
- `GET /api/orders` — list current user's bookings
- `GET /api/orders/:id`
- `GET /api/tickets/:id` — returns ticket details and `qrToken`

### 5. Staff Gate Check-In
- `POST /api/checkin` — `{ token }`
  - Returns status: `valid` (admit), `already_used` (duplicate rejection), `invalid`, or `wrong_showtime`.

### 6. Admin Management
- `GET /api/admin/stats?from=&to=&movieId=&cinemaId=`
- CRUD under `/api/admin/movies`, `/api/admin/rooms`, `/api/admin/showtimes`, `/api/admin/food`, `/api/admin/bookings`, `/api/admin/users`.
- Showtimes endpoint must detect and reject overlapping room schedules (`409 ROOM_SCHEDULE_CONFLICT`).

### 7. WebSocket Events
- Client joins room: `showtime:{showtimeId}`
- Server emits `seat:update` — `{ showtimeId, seatId, seatCode, status, lockedByUserId }`
- Server emits `lock:expired` — `{ seatIds }`
