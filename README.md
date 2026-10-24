# 🎬 CineGo Smart Cinema — Full Monorepo Architecture

A web-based movie ticket booking and cinema management system.

```text
SE_T6/
├── frontend/    # React 18 + TypeScript + Tailwind + TanStack Query + Zustand + MSW
└── backend/     # Backend API Service (see backend/README.md for API contract)
```

## 🚀 Quick Start (Frontend)

To run the frontend (runs completely standalone with in-browser Mock Service Worker & WebSocket simulation):

```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

- See [frontend/README.md](./frontend/README.md) for full documentation, testing personas, and feature guides.
- See [backend/README.md](./backend/README.md) for backend API specifications and WebSocket contracts.
