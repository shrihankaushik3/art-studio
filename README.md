# Art Studio Full-Stack Web Platform

An authentic full-stack web platform for a traditional Indian art studio, featuring a curated gallery of folk and classical paintings, custom on-site wall mural bookings, and bespoke ceramic pottery commissions.

Built with **React + Vite**, **Node.js + Express**, **MongoDB + Mongoose**, **bcryptjs**, and **JSON Web Tokens (JWT)**.

---

## Live Demo & Deployment

| Resource | URL |
| :--- | :--- |
| **Live Website** | [https://art-studio-4xug.onrender.com/](https://art-studio-4xug.onrender.com/) |
| **Paintings Catalog API** | [https://art-studio-4xug.onrender.com/api/paintings](https://art-studio-4xug.onrender.com/api/paintings) |
| **Health Check API** | [https://art-studio-4xug.onrender.com/api/health](https://art-studio-4xug.onrender.com/api/health) |
| **Source Code** | [https://github.com/shrihankaushik3/art-studio](https://github.com/shrihankaushik3/art-studio) |

### Hosting Architecture
- **Web Application & REST API**: Hosted on **Render** as a unified single-origin service. Express serves the compiled React single-page application and all `/api/*` endpoints from the same origin.
- **Database**: Cloud-hosted **MongoDB** cluster via Mongoose ODM.
- **Cold Start Notice**: Render free-tier web services automatically spin down during periods of inactivity. The initial request may take 30–60 seconds while the service resumes; subsequent requests respond with normal low latency.

---

## Core Features

### 1. Paintings Gallery & Concurrency-Safe Purchasing
- **Traditional Artworks**: Explore 12 authentic regional art styles (Madhubani, Warli, Tanjore, Pattachitra, Kalamkari, Gond, Cheriyal, Rajasthani Miniature, Pichwai, Nirmal, and Kerala Mural).
- **Live Inventory Status**: Artworks display clear `available` and `sold` indicators.
- **Atomic Concurrency Protection**:
  - Atomic document transitions via `Painting.findOneAndUpdate({ id, status: 'available' }, { status: 'sold' })`.
  - Database-level partial unique index on `{ paintingId: 1 }` where `{ status: 'placed' }` ensures only one active purchase order can ever exist for an artwork simultaneously.
- **Customer Order Cancellation**: Customers can cancel their own placed orders, immediately returning the artwork to `available` status.
- **Studio Management**: Studio administrators can add new artworks and modify unsold paintings.

### 2. Hand-Painted Wall Mural Bookings
- **Custom Site Murals**: Commission master studio artists for residential or commercial wall art.
- **Scheduling Rules**: Reservations must be booked between **7 and 90 days** in advance.
- **Area & Transparent Pricing**: Supported wall area ranges from **10 to 500 sq. ft.** at a fixed rate of **₹150 / sq. ft.** ($\text{Total Price} = \text{Area} \times 150\text{ INR}$).
- **Single-Slot Date Protection**: A database partial unique index on `{ date: 1 }` for active bookings (`requested` / `confirmed`) guarantees a calendar date can never be double-booked.
- **Cancellation Policy**: Customers can freely cancel bookings up to **3 days prior** to the scheduled date.
- **Studio Workflow**: Studio administrators can review, confirm, or decline booking requests.

### 3. Bespoke Ceramic Pottery Commissions
- **Artisan Combinations**: Choose from 5 traditional clay forms (Kulhad, Surahi, Matka, Diya set, Gamla) and 6 mineral glazes (Kumkum Red, Haldi Yellow, Mehendi Green, Indigo Blue, Sandalwood Beige, Charcoal Black).
- **Batch Size**: Supported orders range from **1 to 12 pieces**.
- **Curing & Firing Lead Time**: Enforces a minimum **14-day** handcrafting and kiln-curing lead time.
- **Customer Control**: Customers can modify or cancel their requests freely while in `requested` status.
- **Studio Decisions**: Studio administrators can accept or decline pottery commissions.

### 4. Authentication, Roles & Data Privacy
- **Role-Based Authorization**: Distinct access boundaries for `customer` and `studio` (administrator) accounts.
- **Public Signup Hardening**: Public registration strictly assigns `role: 'customer'`, preventing privilege escalation.
- **Credential Protection**: Passwords are encrypted with `bcryptjs` (10 rounds) and stripped from all JSON responses via `userSchema.methods.toJSON`.
- **Multi-Tenant Privacy**: If a customer attempts to query, cancel, or modify another user's record, the backend responds with `404 Not Found` to prevent data enumeration.

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite 6 | Fast, responsive single-page application |
| **Styling** | Modular Vanilla CSS | Artisanal theme with accessible colors and responsive grid |
| **Backend** | Node.js 24, Express 4 | RESTful API server and static asset host |
| **Database** | MongoDB & Mongoose 8 | Document storage with schema validation & partial unique indexing |
| **Authentication** | JSON Web Tokens (JWT), bcryptjs | Stateless authorization and password hashing |
| **Dev & Testing** | `mongodb-memory-server`, Supertest | Embedded in-memory DB for local testing without external daemons |
| **Process Management** | Concurrently | Single-command local full-stack development |

---

## Project Structure

```
art-studio/
├── client/                     # Frontend React SPA
│   ├── src/
│   │   ├── components/         # Navbar, Alert, LoadingSpinner, EmptyState
│   │   ├── context/            # AuthContext (state, token, login, logout)
│   │   ├── pages/              # Paintings, WallBooking, Pottery, MyOrders, AdminDashboard, Auth
│   │   ├── services/           # api.js HTTP client
│   │   ├── App.jsx             # Main layout & view routing
│   │   ├── main.jsx            # Application entry point
│   │   └── index.css           # Styling & design system
│   ├── index.html              # HTML template
│   ├── vite.config.js          # Vite configuration & dev proxy
│   └── package.json            # Client dependencies
├── server/                     # Backend Express API
│   ├── src/
│   │   ├── config/             # Database connection & embedded fallback
│   │   ├── controllers/        # auth, painting, booking, pottery business logic
│   │   ├── middleware/         # auth.js (JWT verify & role authorization)
│   │   ├── models/             # Mongoose schemas (User, Painting, Order, Booking, Pottery, StudioConfig)
│   │   ├── routes/             # REST route definitions
│   │   ├── scripts/            # seed.js (idempotent catalog seeder)
│   │   ├── app.js              # Express application setup
│   │   └── index.js            # Server entry point
│   ├── test/                   # Automated integration test suite (node:test + supertest)
│   └── package.json            # Server dependencies
├── seedData/                   # Seed Assets
│   ├── paintings.json          # Tracked painting catalog (12 paintings, no secrets)
│   └── images/                 # Painting image files (p-001.jpg to p-012.jpg)
├── .env.example                # Safe environment configuration template
├── .gitignore                  # Excludes node_modules, .env, and sensitive seed files
├── package.json                # Root monorepo workspace scripts
├── DESIGN.md                   # Architectural design document
└── README.md                   # Project documentation
```

---

## Local Development Setup

Follow these instructions to run the application locally on your machine.

### Prerequisites
- **Node.js**: v18 or newer (tested on v24)
- **npm**: v9 or newer
- *(Optional)* **MongoDB**: A running local or remote instance. If MongoDB is not running locally, the server automatically starts an embedded in-memory MongoDB via `mongodb-memory-server`.

### 1. Clone & Install
```bash
git clone https://github.com/shrihankaushik3/art-studio.git
cd art-studio
npm install
```

### 2. Configure Environment
Create a local `.env` file from the provided template:
```bash
# Linux / macOS
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

### 3. Seed Database
Seed the catalog of 12 paintings, pottery forms, glazes, and mural pricing:
```bash
npm run seed
```
*The seed script is idempotent and safe to execute multiple times.*

### 4. Run Development Server
Start the Express backend and React Vite frontend concurrently:
```bash
npm run dev
```

- **Local Frontend**: [http://localhost:5173](http://localhost:5173) (Vite development server)
- **Local Backend API**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 5. Run Local Production Build
To test the production-compiled single-origin build locally:
```bash
npm run build
npm start
```
Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## Environment Variables

Configure these settings in your `.env` file:

| Variable | Description | Default / Example | Required |
| :--- | :--- | :--- | :---: |
| `PORT` | HTTP port for the Express server | `5000` | No |
| `NODE_ENV` | Application environment (`development` or `production`) | `development` | No |
| `MONGODB_URI` | MongoDB connection string (local or MongoDB Atlas) | `mongodb://127.0.0.1:27017/artstudio` | Yes |
| `JWT_SECRET` | Secret key used to sign and verify JSON Web Tokens | *(Random strong secret)* | Yes |
| `STUDIO_EMAIL` | Email address for initial studio administrator account | `studio@artstudio.in` | No |
| `STUDIO_PASSWORD` | Initial password for studio administrator account | *(Defined in your environment)* | No |
| `CLIENT_URL` | Allowed origin URL for CORS | `http://localhost:5173` | No |

> **Security Note:** Never commit `.env` or sensitive credentials to Git. Use strong, distinct secrets in production.

---

## API Endpoints Reference

### System Health
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Returns server status and database connectivity |

### Authentication
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Customer account registration |
| `POST` | `/api/auth/login` | Public | User authentication & JWT issuance |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current session profile |
| `POST` | `/api/auth/logout` | Authenticated | Terminate session |

### Paintings & Orders
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/paintings` | Public | Browse all paintings with availability status |
| `GET` | `/api/paintings/:id` | Public | Retrieve single painting details |
| `POST` | `/api/paintings` | Studio Admin | Add a new painting to the catalog |
| `PUT` | `/api/paintings/:id` | Studio Admin | Modify an unsold painting |
| `POST` | `/api/paintings/:id/purchase` | Customer | Atomically purchase an available painting |
| `GET` | `/api/paintings/orders/my` | Customer | View customer's own painting orders |
| `GET` | `/api/paintings/orders/all` | Studio Admin | Audit all painting orders studio-wide |
| `POST` | `/api/paintings/orders/:orderId/cancel` | Customer | Cancel own order and release painting |

### Wall Bookings
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/bookings` | Customer | Submit a wall mural booking (7–90 days ahead) |
| `GET` | `/api/bookings/my` | Customer | View customer's own mural bookings |
| `GET` | `/api/bookings/all` | Studio Admin | View all mural bookings studio-wide |
| `POST` | `/api/bookings/:id/cancel` | Customer | Cancel own booking (≥ 3 days prior) |
| `PATCH` | `/api/bookings/:id/status` | Studio Admin | Confirm or decline requested booking |

### Custom Pottery
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/pottery/options` | Public | List available pottery forms and glazes |
| `POST` | `/api/pottery/requests` | Customer | Submit a pottery commission (≥ 14 days lead time) |
| `GET` | `/api/pottery/requests/my` | Customer | View customer's own pottery requests |
| `GET` | `/api/pottery/requests/all` | Studio Admin | View all pottery commissions studio-wide |
| `PUT` | `/api/pottery/requests/:id` | Customer | Modify own request (while in `requested` status) |
| `POST` | `/api/pottery/requests/:id/cancel` | Customer | Cancel own request (while in `requested` status) |
| `PATCH` | `/api/pottery/requests/:id/status` | Studio Admin | Accept or decline pottery commission |

### Static Assets
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/images/:filename` | Public | Serves high-resolution artwork images |
| `GET` | `/seedData/images/:filename` | Public | Static alias for artwork images |

---

## Testing & Quality Assurance

The application includes an end-to-end integration test suite using Node.js's native test runner (`node:test`), assertions (`node:assert`), and `supertest`:

```bash
npm test
```

### Test Coverage Highlights (30 Tests Passing)
- **Authentication**: Public signup role restriction, duplicate email rejection, invalid password rejection, unauthorized route protection.
- **Paintings**: Catalog retrieval, atomic purchasing, concurrency lock rejection, order cancellation consistency, 404 multi-tenant access checks.
- **Wall Bookings**: Date window validation (7–90 days), area bounds (10–500 sq ft), ₹150/sq ft price computation, single-slot collision prevention, 3-day cancellation cutoff.
- **Pottery**: Valid forms & glazes, quantity limits (1–12), 14-day advance rule, customer editing permissions, studio approval locking.
- **Static Assets**: Health endpoint status, image file serving, and SPA fallback routing.

---

## Deployment Notes

### Render Configuration
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Port Handling**: Express dynamically binds to `process.env.PORT` assigned by Render.
- **Automatic Seeding**: If the database is freshly initialized or empty on startup, `server/src/index.js` automatically invokes `runSeed()` using the tracked `seedData/paintings.json` catalog.

---

## Security & Compliance
- **Zero Committed Secrets**: `.env` and sensitive seed credentials are excluded from Git history via `.gitignore`.
- **Credential Masking**: Server logs print sanitized status messages instead of raw MongoDB connection strings.
- **Strict Authorization**: Administrative actions are guarded server-side; customer accounts cannot access studio controls.
- **Safe Documentation**: All documentation uses placeholders and environment variable references.
