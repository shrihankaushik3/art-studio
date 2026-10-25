# Art Studio Full-Stack Web Application

A full-stack web platform for a traditional Indian art studio, featuring an original paintings gallery, custom hand-painted wall mural bookings, and bespoke ceramic pottery commissions.

Built with **React + Vite**, **Node.js + Express**, **MongoDB + Mongoose**, **bcryptjs**, and **JSON Web Tokens (JWT)**.

---

## Clean-Machine Quick Start

### Prerequisites
- **Node.js** (v18+ recommended; tested on v24)
- **npm** (v9+)
- *(Optional)* A running MongoDB instance. If an external MongoDB is not detected, the application automatically launches an embedded in-memory MongoDB.

### 1. Installation
Clone the repository and install all dependencies:
```bash
npm install
```

### 2. Environment Configuration
Copy the provided environment template:
```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

Default configuration (`.env`):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/artstudio
JWT_SECRET=super_secret_art_studio_jwt_token_key_change_me_in_production
```

### 3. Database Seeding
Populate the database with the provided art catalog, glazes, pottery items, and studio credentials:
```bash
npm run seed
```
*Note: The seed script is completely idempotent and safe to rerun.*

### 4. Running the Application
To start both the Express backend and React + Vite frontend concurrently:
```bash
npm run dev
```

- **Frontend Application**: `http://localhost:5173`
- **Backend API & Health**: `http://localhost:5000/api/health`

### 5. Running in Production Mode
To build the frontend and serve it directly through the Express server:
```bash
npm run build
npm start
```
Open `http://localhost:5000` in your browser.

### 6. Running Automated Tests
Run the comprehensive integration test suite (covering authentication, paintings, wall bookings, pottery commissions, and concurrency safety):
```bash
npm test
```

---

## Default Accounts & Credentials

| Role | Email | Password Configuration | Access Rights |
| :--- | :--- | :--- | :--- |
| **Studio Admin** | Set via `STUDIO_EMAIL` (default: `studio@artstudio.in`) | Configured securely in `.env` (`STUDIO_PASSWORD`) or imported via `seedData/seed.json` | Full studio administrative controls (add/edit paintings, confirm/decline wall bookings, review pottery commissions, audit painting orders) |
| **Customer** | *(Self-register in UI)* | *(User-defined, min 6 characters)* | Browse & purchase paintings, book murals, commission pottery, manage own orders |

> **Security Note:** In compliance with security standards, production passwords and secrets must never be committed to source control or displayed in documentation. Use `.env` to define strong credentials.

---

## Features & Implementation

### 1. Authentication & Role Permissions
- Customer signup, login, and token-based session management.
- Public registration is strictly confined to `customer` accounts.
- Password hashing with `bcryptjs` (10 rounds). Passwords never returned to clients.
- `401 Unauthorized` for unauthenticated requests; `403 Forbidden` for role violations.
- Multi-tenant privacy: Customers querying or attempting to modify other customers' records receive `404 Not Found`.

### 2. Paintings Catalog & Purchases
- Browse 12 folk and classical Indian paintings with supplied high-resolution images.
- Real-time `available` vs `sold` status indicators.
- **Concurrency Protection**: Atomic database updates (`Painting.findOneAndUpdate`) and a partial unique constraint on active orders (`{ paintingId: 1, status: 'placed' }`) ensure a painting can have at most one active purchase.
- Customers can cancel their own orders, immediately returning the artwork to `available`.
- Studio admins can add new artworks and edit unsold paintings.

### 3. Wall Mural Bookings
- Customers book studio artists for custom murals.
- Date validation enforces reservations between **7 and 90 days** in advance.
- Wall area bounded between **10 and 500 sq. ft.**
- Automatic pricing at **₹150 / sq. ft.** (`Price = Area × 150`).
- **Single-Slot Safety**: Partial unique database index on `{ date: 1 }` for active bookings (`requested` / `confirmed`) ensures a calendar date can never be double-booked.
- Customers can cancel bookings freely until **3 days before** the scheduled date.
- Studio admins review, confirm, or decline booking requests.

### 4. Custom Handcrafted Pottery
- Choose from 5 seeded pottery forms (Kulhad, Surahi, Matka, Diya set, Gamla) and 6 mineral glazes (Kumkum Red, Haldi Yellow, Mehendi Green, Indigo Blue, Sandalwood Beige, Charcoal Black).
- Order quantities bounded from **1 to 12 pieces**.
- Minimum curing and firing lead time enforced at **≥ 14 days**.
- Customers can edit or cancel requests while in `requested` status.
- Studio admins can accept or decline commission requests.

### 5. Responsive User Experience
- Built with React, Vite, and clean modular CSS.
- Navigation bar with role badges and tab switching (Paintings, Wall Murals, Pottery, My Orders, Studio Dashboard).
- Every data view includes explicit **loading**, **empty**, and **error** states with dismissible banners.

---

## Project Structure
```
c:\art-studio\
├── client\                  # React + Vite Frontend
│   ├── src\
│   │   ├── components\      # Navbar, Alert, LoadingSpinner, EmptyState
│   │   ├── context\         # AuthContext (state, token, role helpers)
│   │   ├── pages\           # Paintings, WallBooking, Pottery, MyOrders, AdminDashboard, Auth
│   │   ├── services\        # api.js fetch client
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server\                  # Node.js + Express Backend
│   ├── src\
│   │   ├── config\          # db.js (MongoDB / embedded fallback)
│   │   ├── controllers\     # auth, painting, booking, pottery controllers
│   │   ├── middleware\      # auth.js (JWT authenticate & authorizeRoles)
│   │   ├── models\          # User, Painting, Order, WallBooking, Pottery, StudioConfig
│   │   ├── routes\          # Express REST routes
│   │   ├── scripts\         # seed.js (idempotent seed import)
│   │   ├── app.js           # Express app setup
│   │   └── index.js         # Server entry point
│   ├── test\                # Integration tests (node:test + supertest)
│   └── package.json
├── seedData\                # Provided seed images (seed.json excluded from Git)
│   └── images\
├── .env.example             # Safe environment configuration template
├── .gitignore               # Excludes node_modules, secrets, .env, and seed.json
├── package.json             # Root monorepo scripts
├── DESIGN.md                # System architectural answers
└── README.md                # Documentation and setup guide
```

---

## Security Compliance
- `seedData/seed.json` (containing initial credentials) is ignored in `.gitignore`.
- Passwords are never output in console logs, server outputs, or API responses.
- Safe `.env.example` provides non-sensitive placeholders.
- Public user registration is restricted strictly to customer roles.
