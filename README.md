# Emergency Operations Dashboard

A real-time, multi-agency emergency operations dashboard — live vehicle tracking on a map, case dispatch, user administration, and reporting, built with Vue.js and Node.js/Express.

**This is an independent personal project inspired by my work experience building a real-time emergency operations platform professionally. All code, data, and design here are original and built from scratch — no proprietary code, real agency data, or confidential information is used.**

## 🔗 Live Demo

- **Dashboard**: https://emergency-operations-dashboard.vercel.app
- **API**: https://emergency-operations-dashboard.onrender.com/api

> Note: the backend is hosted on a free tier that sleeps after inactivity — the first load may take 30-60 seconds to wake up.

## Demo Login

The dashboard requires login. Click one of the quick-login buttons on the login page, or use any of these accounts manually (password for all: `password123`):

| Email | Role | Access |
|---|---|---|
| `admin@ops.gov.my` | super_admin | All 3 agencies, plus User Management |
| `ahmad.razak@kkm.gov.my` | staff | KKM only |
| `zul.hassan@pdrm.gov.my` | staff | PDRM only |
| `faizal.anuar@jbpm.gov.my` | staff | JBPM only |

> These 4 accounts are shared demo credentials — the app blocks self-service password reset/change and admin deactivation on them specifically, so the login page always keeps working for the next visitor.

## Problem & Motivation

Emergency response is often split across separate, agency-specific systems — health, police, and fire each operate with their own tools, making it harder to get a single, live, cross-agency view during an incident. Operators need to know where the nearest available resource is; supervisors need to track active cases and monitor performance across agencies.

This project is a simplified reimagining of that coordination layer: a single dashboard giving operators a live view of multi-agency resources and cases, instead of switching between siloed systems — plus the user administration and reporting a real operations team would need around it.

To keep the dataset focused, this demo covers the **Klang Valley (Kuala Lumpur & Selangor)** rather than all of Malaysia — the same architecture scales to nationwide coverage by adding more agencies and stations, with no structural changes needed.

## Features

- **Live dashboard** — map and case table shown side by side, kept in sync: filtering the table refocuses the map, and clicking a marker or case jumps to the other; a pin dimmed by an active focus is also non-interactive (no stray tap can silently jump focus to it — a real fix for touch devices); vehicles, stations, and active incidents are shown with distinct icons, an agency-scoped legend, hover details, and an animated progress sweep on active cases
- **Authentication & role-based access** — JWT login with per-request revocation (a password reset or deactivation invalidates existing sessions immediately, not just at next expiry); agency `staff` see only their own agency's data, a `super_admin` role sees across all 3 agencies and manages users; login page includes one-click quick-login buttons for each demo account
- **Dispatch workflow** — one-click dispatch auto-assigns the nearest available vehicle (real distance calculation, not manual selection — this project displays and simulates, it doesn't control real dispatch decisions); the case and vehicle then progress automatically through a full lifecycle (`dispatched → en route → on scene → closed`)
- **Live case simulation** — a "Simulate New Case" trigger creates a new incident on demand, with its own self-contained dispatch-to-close lifecycle, so the demo doesn't depend on waiting for the background simulator
- **SLA tracking** — open cases are flagged once they exceed a priority-based response time target
- **Case management** — filtering by agency/status, sortable columns, pagination
- **User management (RBAC-gated)** — super-admin-only directory with search, filtering by agency/status/role, sortable columns on every field, and an Excel export that respects whatever's currently filtered (with a title/date/filter-summary header baked into the sheet); admins can create users (auto-generated temporary password, shown once), activate/deactivate accounts, and reset passwords — every action is written to a searchable audit trail, and pending self-service reset requests surface in their own review queue
- **Account security** — admin-created accounts must set their own password on first login; a self-service "Forgot Password" flow lets any user request a reset without an admin's direct involvement (queued for admin approval — no email infrastructure required); guardrails prevent deactivating the last super admin or breaking the shared demo accounts above
- **Reports & analytics** — 8 chart types (donut, bar, horizontal bar list, stacked bar, waffle grid, bubble chart, heatmap, trend line), every one **hand-built with SVG/CSS** rather than a charting library, so the color palette, hover behavior, and depth/glow styling are fully custom and consistent across all of them; a custom date-range picker (with quick presets) drives every chart plus period-over-period delta badges on the KPI tiles; every chart supports an in-place data-table view, PNG image export, and a styled Excel export, alongside a one-click multi-sheet full-report export
- **Dark mode** — a light/dark/system toggle that follows the OS by default; every color (including the categorical chart palettes) has its own dedicated dark-mode value, checked for colorblind-safe separation and contrast against the dark surface with the same validator used for the light palette — not just an automatic filter/invert
- **Hardened against abuse** — rate limiting on login, password-reset requests, and case simulation; every write endpoint validates its input (schema-checked, not just "is it present"); a centralized error handler that never leaks internal error detail to the client; standard security headers and a restricted CORS origin
- **Responsive design** — usable across desktop and mobile breakpoints, deliberately keeping every data table's full column set on mobile (horizontal scroll, not hidden columns) rather than trading away information for width; loading states on async actions (login, export) for clear feedback
- **Documented API** — full Postman collection included (`api/postman/`)

## Tech Stack

**Frontend**: Vue 3 (Composition API), Vue Router (lazy-loaded routes), Pinia, Tailwind CSS v4, Leaflet, Axios, ExcelJS + html2canvas (both loaded on demand, not in the initial bundle)
**Backend**: Node.js, Express 5, Sequelize (PostgreSQL via Neon in this deployment, with automatic SQLite fallback for local dev without a `DATABASE_URL`), JWT auth (jsonwebtoken, bcryptjs), Zod (request validation), Helmet, express-rate-limit
**Deployment**: Vercel (frontend), Render (backend + PostgreSQL)

## Architecture

Two independent apps communicating over a REST API — the same client-server pattern used by real production dashboards:

```
ui/ (Vue frontend)  --HTTP-->  api/ (Express backend)  --Sequelize-->  Database
```

The backend follows a layered pattern: **route → controller → service**
- **route**: maps a URL to a controller, and applies auth/authorization/rate-limiting/validation middleware
- **controller**: reads the request, calls a service, sends the response
- **service**: contains the actual business logic / database query, including agency-scoping enforcement based on the requester's JWT

A background simulator ticks every 3 seconds, positioning each active case's vehicle deterministically along the station→incident line based on the case's current status (not a random walk or time-based animation), and automatically progresses dispatched cases through their response lifecycle over time. The frontend polls this to create the "live" effect.

On the frontend, each page component is its own lazily-loaded route chunk (only the Login page is in the initial bundle), and the two heaviest libraries — ExcelJS and html2canvas — are dynamically imported only inside the export code paths that actually use them, rather than shipped to every visitor upfront.

## Project Structure

```
emergency-operations-dashboard/
├── api/                       # Express backend
│   ├── src/
│   │   ├── models/            # Sequelize models (Agency, Vehicle, Case, User, Station, AuditLog, PasswordResetRequest)
│   │   ├── routes/            # Route definitions + middleware wiring
│   │   ├── controllers/       # Request handling
│   │   ├── services/          # Business logic + DB queries
│   │   ├── middlewares/       # Auth, authorization, rate limiting, validation, centralized error handling
│   │   ├── schemas/           # Zod request-validation schemas
│   │   ├── utils/             # Agency-scoping helper, AppError
│   │   └── seed.js            # Seeds demo data
│   ├── .env.example           # Every backend env var, documented
│   └── postman/               # API test collection
└── ui/                        # Vue frontend
    ├── src/
    │   ├── pages/              # Routed, lazy-loaded pages (Dashboard, Users, Reports, Login)
    │   ├── components/         # Map, tables, and every hand-built chart component
    │   ├── composables/        # Shared reactive logic (e.g. useClickOutside)
    │   ├── services/           # API call wrappers
    │   ├── stores/             # Pinia stores (auth, theme)
    │   ├── utils/              # Shared formatting/export helpers
    │   └── router/             # Vue Router config + auth guard
    └── .env.example             # Every frontend env var, documented
```

## Running Locally

Requires two terminals — the frontend and backend are separate apps that must both be running.

**Backend:**
```sh
cd api
npm install
cp .env.example .env   # fill in JWT_SECRET and DATABASE_URL (or leave DATABASE_URL unset for a local SQLite fallback)
node src/seed.js        # seeds demo data
npm run dev              # http://localhost:4000
```

**Frontend:**
```sh
cd ui
npm install
cp .env.example .env   # defaults to http://localhost:4000/api, which matches the backend above
npm run dev              # http://localhost:5173
```

## API Testing

A Postman collection covering all endpoints is included at `api/postman/emergency-operations-dashboard.postman_collection.json`.
