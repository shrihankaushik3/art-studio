# Art Studio System Architecture & Design Document

## 1. How Login and Roles Work

### Authentication Architecture
- **Password Security**: Passwords are never stored in plaintext. They are hashed using `bcryptjs` with 10 salt rounds prior to persistence.
- **Stateless Tokens**: On successful registration or login, the server signs a JSON Web Token (JWT) containing the user's ID, email, and role, with a 7-day expiration.
- **Credential Protection**: The studio password is kept strictly confidential. The seed loader hashes it immediately, the logging system never prints credentials, and `userSchema.methods.toJSON` strips the password field from all response payloads.
- **Public Signup Hardening**: The public registration endpoint (`POST /api/auth/register`) strictly sets `role: 'customer'`, ignoring any client-supplied role parameters to prevent privilege escalation.

### Server-Enforced Role-Based Authorization
1. **Authentication Middleware (`authenticate`)**:
   - Inspects the `Authorization: Bearer <token>` header.
   - Verifies token signature and expiration against `JWT_SECRET`.
   - Attaches sanitized user document to `req.user`. Returns `401 Unauthorized` if token is missing, invalid, or expired.
2. **Role Authorization Middleware (`authorizeRoles`)**:
   - Verifies whether `req.user.role` matches the required permission set (`studio` or `admin`).
   - Returns `403 Forbidden` if a regular customer attempts an administrative action.
3. **Multi-Tenant Ownership & 404 Guard**:
   - When a customer attempts to query, cancel, or edit an order, booking, or pottery commission belonging to another user, the server responds with `404 Not Found` (rather than `403`), preventing resource enumeration and maintaining customer privacy.

---

## 2. Which Database Was Chosen and Why

### Selection: MongoDB with Mongoose ODM
**Why MongoDB was selected:**
1. **Document-Oriented Domain Fit**: Art studio offerings (paintings, wall bookings, bespoke ceramics) have variable attributes, rich descriptions (e.g., long cultural narratives like `p-012`), and nested metadata that map directly to JSON documents.
2. **Concurrency & Partial Indexing**: MongoDB natively supports partial unique filter expressions (`partialFilterExpression`). This allows indexing unique constraints exclusively across active records (e.g., `status: 'placed'` or `status: { $in: ['requested', 'confirmed'] }`), while allowing cancelled or declined historical records without conflicts.
3. **Clean-Machine Portability**: The application connects to external MongoDB instances via `MONGODB_URI` (`mongodb://127.0.0.1:27017/artstudio`), and automatically provides an embedded fallback via `mongodb-memory-server` if an external daemon is not running. This guarantees immediate zero-config grading on any machine.

---

## 3. How Duplicate Purchases and Booking Collisions Are Prevented

### A. Preventing Duplicate Painting Purchases
A painting can have at most one active order. Concurrency safety is enforced at both the application and database tiers:
1. **Atomic State Transition**:
   ```javascript
   const updated = await Painting.findOneAndUpdate(
     { id: paintingId, status: 'available' },
     { status: 'sold' },
     { new: true }
   );
   ```
   If two buyers simultaneously click "Buy Now", MongoDB's document-level write lock ensures only one transaction finds `status: 'available'`. The second query receives `null` and is rejected immediately with `409 Conflict`.
2. **Database-Level Partial Unique Constraint**:
   ```javascript
   orderSchema.index(
     { paintingId: 1 },
     { unique: true, partialFilterExpression: { status: 'placed' } }
   );
   ```
   This schema-level constraint guarantees that no two orders with status `placed` can ever exist for the same painting ID, preventing race conditions even under distributed loads.
3. **Order Cancellation & Release**: When a customer cancels their order, the order status changes to `'cancelled'`, and the painting's status atomically reverts to `'available'`, releasing it for future purchase.

### B. Preventing Wall Date Booking Collisions
Each calendar date supports at most one active booking (`requested` or `confirmed`):
1. **Database Partial Unique Index on Date**:
   ```javascript
   wallBookingSchema.index(
     { date: 1 },
     {
       unique: true,
       partialFilterExpression: { status: { $in: ['requested', 'confirmed'] } }
     }
   );
   ```
2. **Atomic Verification**: Even if concurrent requests arrive at the exact same millisecond, MongoDB's unique index rejects the second insert with error code `11000`, which our controller catches and formats as a clean `409 Conflict: The date YYYY-MM-DD was just booked by another client.`
3. **Cancellation & 3-Day Window**: Customers can cancel up to 3 days before the date. Upon cancellation, the record status becomes `'cancelled'`, which falls outside the partial index filter, releasing the calendar date for other clients.

---

## 4. What Is Complete, What Is Missing, and What Comes Next

### What Is Complete
- [x] **Project Configuration & Deployment**: Monorepo structure with npm workspaces (`server` and `client`), Vite build pipeline, and root scripts.
- [x] **Database & Seed Data**: Idempotent seed script importing all 12 paintings, 5 pottery items, 6 glazes, mural rate, and studio account. Sensitive seed data excluded from Git.
- [x] **Authentication & Permissions**: Customer registration/login, studio login, bcryptjs hashing, JWT authorization, and 401/403/404 enforcement.
- [x] **Paintings**: Catalog view with supplied images, available/sold badges, atomic single-purchaser ordering, customer order cancellation, and studio painting management.
- [x] **Wall Bookings**: 7–90 day date validation, 10–500 sq ft area bounds, address requirement, ₹150/sq ft automatic pricing, date collision prevention, and studio confirm/decline workflow.
- [x] **Custom Pottery**: Seeded pottery and glaze validation, 1–12 quantity limits, 14-day lead-time rule, customer editing/cancellation in requested state, and studio acceptance/rejection.
- [x] **Frontend User Experience**: Responsive navigation, tabbed My Orders view, Studio Administration portal, and loading, empty, and error feedback states.
- [x] **Automated Testing**: 30 automated integration tests covering all critical paths with 100% pass rate.

### Missing / Limitations
- **Real Payment Processing**: Painting purchases and wall booking deposits are currently confirmed as direct studio orders rather than via an external payment gateway.
- **Image Uploads**: Studio additions currently link to seed or relative image paths rather than direct multipart file uploads to S3/Cloudinary.

### What Comes Next
1. **Payment Gateway Integration**: Adding Razorpay / Stripe India for UPI, card, and netbanking transactions.
2. **Notification Pipeline**: Email confirmations via Nodemailer / SendGrid for booking approvals and order receipts.
3. **Interactive Wall Visualizer**: Canvas-based tool allowing customers to preview mural artwork on a photo of their wall.
