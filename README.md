# CineGo Smart Cinema

FastAPI REST backend for the CineGo academic cinema-booking MVP. The API supports customer registration and login, movie discovery, showtimes, atomic seat holds, seat recommendations, orders, simulated payments, signed QR tickets, staff check-in, and administrator operations.

The supplied project documents define the product as a non-commercial MVP. Payments are simulated only; no card or real payment credentials are accepted or stored.

## Requirements and local setup

- Python 3.11+
- A Supabase PostgreSQL database

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
Copy-Item .env.example .env
```

Set `DATABASE_URL`, `JWT_SECRET`, and `QR_SIGNING_SECRET` in `.env`. Use the Supabase **direct** or **session pooler** PostgreSQL URL (not the transaction pooler for persistent connections); URL-encode special characters in credentials. Do not commit `.env`.

Apply the initial schema once from the Supabase SQL Editor:

1. Open `backend/db/schema.sql`.
2. Run it in the intended Supabase project.
3. Create the first administrator from a trusted local shell:

```powershell
python -m app.create_admin --email admin@example.com --name "CineGo Admin"
```

The script prompts for the password. Public registration always creates a `customer`; it cannot assign staff or administrator privileges.

Run the API:

```powershell
uvicorn app.main:app --reload
```

Interactive OpenAPI docs are at `http://127.0.0.1:8000/docs`; health checks are at `/health/live` and `/health/ready`.

## Deployment to Render

Create a Render Web Service from this repository and use:

- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Set the environment variables from `backend/.env.example` in Render. Use the Supabase PostgreSQL connection URL and keep all signing keys private. Apply schema changes in Supabase before deploying application changes. Set `CORS_ORIGINS` to the exact deployed frontend origins; do not use `*` in production.

`render.yaml` contains a Blueprint service definition; secret values must still be configured in the Render dashboard.

## API and design

- API contract, endpoint permissions, errors, and booking workflow: [`docs/API.md`](docs/API.md)
- Database ERD and data model: [`docs/DATABASE.md`](docs/DATABASE.md)
- PostgreSQL schema: [`backend/db/schema.sql`](backend/db/schema.sql)
- OpenAPI: generated from the running FastAPI app

All times use timezone-aware ISO 8601 timestamps. Currency amounts are VND and are stored as PostgreSQL `numeric`, never binary floating point. API responses do not expose password hashes, reset tokens, session identifiers, or internal database errors.

## Security and operational notes

- Access tokens are short-lived JWTs tied to server-side sessions; logout revokes the session.
- Passwords use Argon2id. Login lockout applies after repeated failures.
- Staff-only check-in and admin-only management/reporting are enforced server-side.
- Seat holds expire after five minutes by default and conflicting holds are serialized using PostgreSQL row locks and a partial unique index.
- Order totals and discounts are computed from database prices. Payment is idempotent and simulated.
- QR tickets use high-entropy signed tokens; the database stores ticket identity/status, and check-in atomically prevents reuse.
- The live-seat WebSocket is process-local. Run one Render instance for the academic MVP; multi-instance broadcasting requires a shared broker such as Redis.
- Apply schema migrations deliberately and back up Supabase before releases. Never use application auto-migration in production.

Run focused checks from `backend`:

```powershell
python -m pytest
```
