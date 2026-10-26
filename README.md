# 🎬 CineGo Smart Cinema — Monorepo Architecture

A web-based movie ticket booking and cinema management system for an academic MVP.
The system features a modern React SPA frontend and a robust FastAPI + PostgreSQL (Supabase) backend supporting customer booking, atomic seat holds, seat recommendations, concession orders, simulated payments, signed QR tickets, staff check-in, and administrator management.

```text
SE_T6/
├── frontend/    # React 18 + TypeScript + Tailwind + TanStack Query + Zustand + MSW
├── backend/     # FastAPI + PostgreSQL (Supabase) REST & WebSocket API
└── docs/        # System Documentation (API contracts, Database ERD)
```

---

## 🚀 Quick Start

### 1. Frontend (React + Vite)

The frontend can run standalone with simulated WebSocket & Mock Service Worker (MSW) or connected to the real backend:

```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.
- Full details and testing personas: [`frontend/README.md`](frontend/README.md)

---

### 2. Backend (FastAPI + Supabase)

#### Requirements & Setup
- Python 3.11+
- A Supabase PostgreSQL database

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
Copy-Item .env.example .env
```

Configure `DATABASE_URL`, `JWT_SECRET`, and `QR_SIGNING_SECRET` in `backend/.env`. Use the Supabase **direct** or **session pooler** PostgreSQL URL (not the transaction pooler for persistent connections); URL-encode special characters in credentials. Do not commit `.env`.

#### Database Initialization
1. Open [`backend/db/schema.sql`](backend/db/schema.sql) and execute it in your Supabase SQL Editor.
2. Create the first administrator from your shell:
```powershell
python -m app.create_admin --email admin@example.com --name "CineGo Admin"
```
*(The script prompts securely for the admin password).*

#### Running the Backend API
```powershell
uvicorn app.main:app --reload
```
- Interactive OpenAPI documentation: **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**
- Health check endpoints: `/health/live` and `/health/ready`

---

## ☁️ Deployment (Render)

Deploy as a Render Web Service using the Blueprint [`render.yaml`](render.yaml) or manually with:
- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**: Configure variables matching `backend/.env.example` in Render dashboard (`DATABASE_URL`, `JWT_SECRET`, `QR_SIGNING_SECRET`, `CORS_ORIGINS`).

---

## 📚 Documentation & Specifications

- **API Contract & Workflows**: [`docs/API.md`](docs/API.md) and [`backend/README.md`](backend/README.md)
- **Database ERD & Schema**: [`docs/DATABASE.md`](docs/DATABASE.md) and [`backend/db/schema.sql`](backend/db/schema.sql)
- **OpenAPI Schema**: Auto-generated live at `/docs`

---

## 🔒 Security & Operational Notes

- **Authentication & Sessions**: Short-lived JWTs with server-side revocation on logout. Passwords hashed with Argon2id with login lockout protection.
- **Seat Concurrency**: Atomic seat holds expire after 5 minutes, serialized with PostgreSQL row-level locks and partial unique indexes.
- **Payments & Orders**: Purely simulated payments; no real card credentials stored. Total calculation handled securely on the server.
- **Signed QR Tickets**: High-entropy signed tokens for ticket verification, atomically preventing gate reuse.
- **WebSockets**: Process-local WebSocket broadcaster for live seat updates.
- **Testing**: Run backend test suite via `python -m pytest` in `backend/`.
