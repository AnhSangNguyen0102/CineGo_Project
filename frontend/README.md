# 🎬 CineGo Smart Cinema — Web-Based Movie Ticket Booking & Management System

> **Academic Non-Commercial MVP Prototype**  
> Built with React 18, TypeScript, Tailwind CSS, TanStack Query, Zustand, and Mock Service Worker (MSW). All payment methods and transactions are strictly simulated.

---

## 🌟 Overview & Key Capabilities

**CineGo Smart Cinema** is a high-performance, full-featured web cinema ticketing and theater management platform. Designed with a mobile-first, dark cinema theme, it provides seamless booking for customers, entrance verification for cinema staff, and analytics and scheduling for theater administrators.

### Core Highlights:
1. **Interactive Real-Time Seat Map**:
   - Dynamic room layout with standard, VIP Prime, and Couple seats.
   - Live seat locking with atomic conflict resolution and 5-minute reservation countdown timer.
   - Cross-tab and real-time state synchronization via WebSocket / broadcast events.
2. **"Smart Seat" Recommendation Engine**:
   - AI-assisted seat grouping based on party size (1–8 seats) and viewing zone preferences (Sweet Spot Center, VIP Prime, Standard Value, Back).
   - Automatically handles taken seats with rapid alternative suggestions.
3. **Concession & Combo Ordering**:
   - Full gourmet snack and drink menu with categories, quantities, and synchronized price calculation.
4. **Simulated Payment Gateway**:
   - Simulated Credit Card, E-Wallet (Momo / VNPay QR), and Bank Transfer.
   - Interactive outcome testing: simulate **Success**, **Bank Decline**, or **Gateway Timeout** with retry capability while the seat reservation remains valid.
5. **E-Ticket & Scannable QR Boarding Pass**:
   - Digital cinema pass with dynamic QR code generation (`qrcode.react`).
   - Clear ticket statuses: **Valid**, **Already Used**, **Expired**.
6. **Staff Entrance Check-In Terminal**:
   - Camera QR scanner (`html5-qrcode`) and manual token entry.
   - Clear validation outputs: **Valid (Admitted)**, **Duplicate / Already Used (with exact timestamp and staff ID)**, **Invalid Code**, and **Wrong Showtime**.
7. **Admin Management Console (Desktop-First)**:
   - **Executive KPI Dashboard**: Simulated revenue, tickets sold, order volume, and auditorium occupancy % paired with interactive Recharts trends.
   - **Movies Management**: Full catalog CRUD with age classifications and trailer previews. Soft-deactivates movies referenced by active showtimes.
   - **Interactive Room Seat Layout Editor**: Configure rows, columns, and customize seat categories (Standard, VIP, Couple) interactively.
   - **Showtimes Conflict Detection**: Automatic room clash rejection to prevent overlapping screenings in the same auditorium.
   - **Concessions & Pricing**: Add and manage snack combos and prices.
   - **Bookings & Users**: Review all customer orders and manage role access permissions (Customer, Staff, Admin).

---

## 🛠 Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Vite + React 18** | Ultra-fast build tool and modern component framework |
| **TypeScript** | Strict type-safety across models, API contracts, and stores |
| **Tailwind CSS** | Cinematic dark palette, responsive design (phone, tablet, desktop) |
| **React Router v6** | Client-side routing with role-based `ProtectedRoute` |
| **TanStack Query (v5)** | Server state management, data caching, and optimistic updates |
| **Zustand** | Global authentication, seat holding timers, and order state |
| **Axios** | HTTP client with JWT interceptor and 401 redirect handling |
| **Socket.IO / Simulator**| Real-time seat updates and multi-tab broadcast synchronization |
| **React Hook Form + Zod**| Robust client-side validation for all forms |
| **MSW (Mock Service Worker)**| Complete backend simulation with realistic seed data |
| **qrcode.react & html5-qrcode**| Scannable QR code generation and live camera ticket scanning |
| **Recharts** | Interactive charts for administrator box office analytics |
| **Lucide Icons** | Crisp cinematic iconography |

---

## 📂 Project Structure

```text
src/
├── api/
│   ├── client.ts          # Axios client with JWT interceptor and 401 redirect
│   ├── endpoints.ts       # Typed API endpoint paths and socket events
│   └── socket.ts          # Socket manager with multi-tab simulation fallback
├── app/
│   ├── App.tsx            # Providers (QueryClient, ToastProvider, Router)
│   └── main.tsx           # Entry point and MSW worker initializer
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx     # Responsive navbar with persona switcher & holding timer
│   │   ├── Footer.tsx     # Cinematic footer with academic disclaimer
│   │   └── Layout.tsx     # Public layout wrapper
│   ├── movies/
│   │   └── TrailerModal.tsx # YouTube trailer embed modal
│   └── ui/
│       ├── Badge.tsx      # Status badges (success, warning, danger, gold)
│       ├── Button.tsx     # Reusable buttons with loading states & variants
│       ├── Card.tsx       # Standard card container primitives
│       ├── ConfirmDialog.tsx # Confirmation action dialogs
│       ├── Input.tsx      # Form inputs with labels, icons, and error display
│       ├── Modal.tsx      # Accessible modal dialog with Escape listener
│       ├── Skeleton.tsx   # Pulse loading placeholders
│       ├── Table.tsx      # Responsive data table components
│       └── Toast.tsx      # Toast notifications context and alerts
├── features/
│   ├── admin/
│   │   ├── AdminLayout.tsx       # Desktop-first sidebar navigation
│   │   ├── AdminDashboardPage.tsx# KPI cards & Recharts box office analytics
│   │   ├── AdminMoviesPage.tsx   # Movies catalog CRUD with soft-deactivation
│   │   ├── AdminRoomsPage.tsx    # Rooms & interactive seat layout editor
│   │   ├── AdminShowtimesPage.tsx# Screening schedule with clash detection
│   │   ├── AdminFoodPage.tsx     # Concessions and snack combos pricing
│   │   ├── AdminBookingsPage.tsx # All customer orders with inspection modal
│   │   └── AdminUsersPage.tsx    # User accounts and role permission control
│   ├── auth/
│   │   ├── useAuthStore.ts       # Zustand store with token & role persistence
│   │   ├── LoginPage.tsx         # Sign in with 1-click test credentials
│   │   ├── RegisterPage.tsx      # Account registration with validation
│   │   ├── ForgotPasswordPage.tsx# Password reset flow
│   │   └── ProfilePage.tsx       # Profile info updates
│   ├── booking/
│   │   ├── useBookingStore.ts    # Zustand store for held seats & 5-min timer
│   │   ├── SeatSelectionPage.tsx # Interactive seat map with live locking
│   │   ├── SmartSeatModal.tsx    # AI seat grouping and zone preference modal
│   │   ├── OrderFoodPage.tsx     # Concessions & snacks combo selection
│   │   └── PaymentPage.tsx       # Simulated payment checkout & test outcomes
│   ├── checkin/
│   │   └── StaffCheckinPage.tsx  # Camera QR scanner and ticket verification
│   ├── movies/
│   │   ├── useMovies.ts          # TanStack query hooks for movies & showtimes
│   │   ├── MovieCatalogPage.tsx  # Public catalog with filters & search
│   │   └── MovieDetailPage.tsx   # Movie synopsis, trailer & grouped showtimes
│   └── tickets/
│       ├── BookingHistoryPage.tsx# List of customer bookings & tickets
│       └── TicketDetailPage.tsx  # Scannable QR digital boarding pass
├── mocks/
│   ├── browser.ts         # MSW setupWorker initialization
│   ├── handlers.ts        # Comprehensive mock API endpoints
│   └── seedData.ts        # Seed data (movies, cinemas, rooms, food, tickets)
├── routes/
│   ├── AppRoutes.tsx      # Route definitions
│   └── ProtectedRoute.tsx # Role permission enforcement and redirection
├── types/
│   └── index.ts           # Shared TypeScript types and interfaces
└── utils/
    └── cn.ts              # ClassName utility and formatters
```

---

## 🔑 Demo Personas & Quick Role Switcher

For instant testing and evaluation, CineGo includes a **Demo Roles** switcher directly in the navbar, as well as one-click fill buttons on the login page:

| Persona | Email | Password | Role & Permissions |
| :--- | :--- | :--- | :--- |
| **Alex Rivera** | `customer@cinego.com` | `password123` | **Customer**: Browse, seat lock, concessions, pay, my tickets |
| **Sarah Jenkins** | `staff@cinego.com` | `password123` | **Cinema Staff**: Dedicated access to Gate Check-In scanner |
| **Marcus Vance** | `admin@cinego.com` | `password123` | **Administrator**: Full access to Admin Console & all CRUDs |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v22+ recommended)
- **npm**: v9+ or higher

### 2. Installation
```bash
# Clone or navigate into the project workspace
cd SE_T6

# Install dependencies
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env` (already pre-configured for mock mode):
```bash
cp .env.example .env
```

Configuration variables:
```env
# API Base Endpoint
VITE_API_URL=/api

# Real-Time WebSocket Server (used when connected to external socket server)
VITE_SOCKET_URL=http://localhost:3001

# Enable Mock Service Worker & In-Browser Socket Simulator (true for standalone running)
VITE_USE_MOCK=true
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build & Preview
```bash
# Type-check and build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 🎟 User Journey & Testing Walkthrough

1. **Movie Catalog**:
   - Toggle between **Now Showing** and **Coming Soon**.
   - Search by title, or filter by Genre, Cinema location, and Date.
   - Click **Watch Trailer** to preview the YouTube trailer.
2. **Showtime Selection**:
   - Open any movie detail page (e.g. *Dune: Part Two*).
   - Select a date and cinema; click a showtime button to enter the interactive auditorium map.
3. **Seat Selection & Smart Seat**:
   - Click available seats to lock them in real-time. Notice the **5-minute reservation timer** starting in the top bar.
   - Click **Smart Seat AI**: select party size (e.g., 3 tickets) and preferred zone (e.g., Sweet Spot Center). Click **Lock Recommended Seats** to atomically reserve them.
4. **Concessions & Order Summary**:
   - Click **Proceed to Concessions**. Add snacks (e.g. *CineGo Solo Combo*).
   - Review price breakdown and click **Proceed to Simulated Payment**.
5. **Simulated Payment**:
   - Choose **Credit Card**, click **Fill Demo Card**, test **Success**, or toggle to **Card Declined** / **Timeout** to observe the graceful retry flow while the seat lock is active.
   - Upon confirmation, enjoy the confetti celebration and receive your digital ticket!
6. **Digital QR Pass**:
   - View your scannable QR ticket on `/tickets/:id`.
   - Click **Verify as Staff** to immediately test the staff scan flow.
7. **Staff Check-In Gate**:
   - Log in as Staff or click **Verify as Staff** (`/staff/checkin`).
   - Use the camera or test presets:
     - **Test VALID Ticket** (`TICKET-CINEGO-VALID-001`): Displays green approval banner and movie details.
     - Scan the same ticket again: Displays red **ALREADY USED - DUPLICATE ENTRY DENIED** with the exact check-in timestamp.
8. **Admin Management**:
   - Log in as Admin (`admin@cinego.com`), open `/admin/dashboard`.
   - Review simulated KPIs and Recharts graphs.
   - Open **Rooms & Seat Layouts** to edit rows/columns and customize VIP/Couple seat types interactively.
   - Open **Showtimes Scheduler** to schedule new screenings; test picking an overlapping time in the same room to see the conflict rejection message!

---

## ⚖️ Academic Notice
This system is developed strictly for academic evaluation and demonstration purposes. All payment methods, bank cards, user data, and financial transactions are simulated within the browser via Mock Service Worker.
