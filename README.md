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

- **Live dashboard** — map and case table shown side by side, kept in sync: filtering the table refocuses the map, and clicking a marker or case jumps to the other; vehicles, stations, and active incidents are shown with distinct icons, an agency-scoped legend, hover details, and an animated progress sweep on active cases
- **Authentication & role-based access** — JWT login; agency `staff` see only their own agency's data, a `super_admin` role sees across all 3 agencies and manages users; login page includes one-click quick-login buttons for each demo account
- **Dispatch workflow** — one-click dispatch auto-assigns the nearest available vehicle (real distance calculation, not manual selection — this project displays and simulates, it doesn't control real dispatch decisions); the case and vehicle then progress automatically through a full lifecycle (`dispatched → en route → on scene → closed`)
- **Live case simulation** — a "Simulate New Case" trigger creates a new incident on demand, with its own self-contained dispatch-to-close lifecycle, so the demo doesn't depend on waiting for the background simulator
- **SLA tracking** — open cases are flagged once they exceed a priority-based response time target
- **Case management** — filtering by agency/status, sortable columns, pagination
- **User management (RBAC-gated)** — super-admin-only directory with search, filtering by agency/status/role, sortable columns on every field, and an Excel export that respects whatever's currently filtered (with a title/date/filter-summary header baked into the sheet); admins can create users (auto-generated temporary password, shown once), activate/deactivate accounts, and reset passwords — every action is written to a searchable audit trail
- **Account security** — admin-created accounts must set their own password on first login; a self-service "Forgot Password" flow lets any user request a reset without an admin's direct involvement (queued for admin approval — no email infrastructure required); guardrails prevent deactivating the last super admin or breaking the shared demo accounts above
- **Reports** — case-status breakdown chart and Excel export
- **Responsive design** — usable across desktop and mobile breakpoints, with loading states on async actions (login, export) for clear feedback
- **Documented API** — full Postman collection included (`api/postman/`)

## Tech Stack

**Frontend**: Vue 3, Vue Router, Pinia, Tailwind CSS, Chart.js, Leaflet, Axios
**Backend**: Node.js, Express, Sequelize (SQLite locally / PostgreSQL in production), JWT auth (jsonwebtoken, bcryptjs)
**Deployment**: Vercel (frontend), Render (backend + PostgreSQL)

## Architecture

Two independent apps communicating over a REST API — the same client-server pattern used by real production dashboards:

```
ui/ (Vue frontend)  --HTTP-->  api/ (Express backend)  --Sequelize-->  Database
```

The backend follows a layered pattern: **route → controller → service**
- **route**: maps a URL to a controller, and applies auth/authorization middleware
- **controller**: reads the request, calls a service, sends the response
- **service**: contains the actual business logic / database query, including agency-scoping enforcement based on the requester's JWT

A background simulator ticks every 3 seconds, positioning each active case's vehicle deterministically along the station→incident line based on the case's current status (not a random walk or time-based animation), and automatically progresses dispatched cases through their response lifecycle over time. The frontend polls this to create the "live" effect.

## Project Structure

```
emergency-operations-dashboard/
├── api/                    # Express backend
│   ├── src/
│   │   ├── models/         # Sequelize models (Agency, Vehicle, Case, User, Station, AuditLog, PasswordResetRequest)
│   │   ├── routes/         # Route definitions
│   │   ├── controllers/    # Request handling
│   │   ├── services/       # Business logic + DB queries
│   │   ├── middlewares/    # JWT authentication + super-admin authorization
│   │   ├── utils/          # Agency-scoping helper
│   │   └── seed.js         # Seeds demo data
│   └── postman/            # API test collection
└── ui/                     # Vue frontend
    └── src/
        ├── pages/          # Routed pages (Dashboard, Users, Reports, Login)
        ├── components/     # Map, tables, chart
        ├── services/       # API call wrappers
        ├── stores/         # Pinia auth store
        └── router/         # Vue Router config + auth guard
```

## Running Locally

Requires two terminals — the frontend and backend are separate apps that must both be running.

**Backend:**
```sh
cd api
npm install
node src/seed.js   # seeds demo data
npm run dev         # http://localhost:4000
```

**Frontend:**
```sh
cd ui
npm install
npm run dev          # http://localhost:5173
```

## API Testing

A Postman collection covering all endpoints is included at `api/postman/emergency-operations-dashboard.postman_collection.json`.
