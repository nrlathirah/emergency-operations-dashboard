# Emergency Operations Dashboard

A real-time, multi-agency emergency operations dashboard — live vehicle tracking on a map, case dispatch, user administration, and reporting, built with Vue.js and Node.js/Express.

**This is an independent personal project inspired by my work experience building a real-time emergency operations platform professionally. All code, data, and design here are original and built from scratch — no proprietary code, real agency data, or confidential information is used.**

## 🔗 Live Demo

- **Dashboard**: https://emergency-operations-dashboard.vercel.app
- **API**: https://emergency-operations-dashboard.onrender.com/api

> Note: the backend is hosted on a free tier that sleeps after inactivity — the first load may take 30-60 seconds to wake up.

## Demo Login

The dashboard requires login. Use any of these accounts (password for all: `password123`):

| Email | Role | Access |
|---|---|---|
| `admin@ops.gov.my` | super_admin | All 3 agencies |
| `ahmad.razak@kkm.gov.my` | dispatcher | KKM only |
| `rosnah.ibrahim@pdrm.gov.my` | admin | PDRM only |
| `faizal.anuar@jbpm.gov.my` | dispatcher | JBPM only |

## Problem & Motivation

Emergency response is often split across separate, agency-specific systems — health, police, and fire each operate with their own tools, making it harder to get a single, live, cross-agency view during an incident. Operators need to know where the nearest available resource is; supervisors need to track active cases and monitor performance across agencies.

This project is a simplified reimagining of that coordination layer: a single dashboard giving operators a live view of multi-agency resources and cases, instead of switching between siloed systems — plus the user administration and reporting a real operations team would need around it.

To keep the dataset focused, this demo covers the **Klang Valley (Kuala Lumpur & Selangor)** rather than all of Malaysia — the same architecture scales to nationwide coverage by adding more agencies and stations, with no structural changes needed.

## Features

- **Live map** — vehicles, stations (hospitals, police stations, fire stations), and active incidents shown with distinct icons, hover details, and a legend; positions update every few seconds
- **Authentication & role-based access** — JWT login; agency-scoped roles (dispatcher/controller/admin) see only their own agency's data, a `super_admin` role sees across all 3 agencies
- **Dispatch workflow** — assign an available vehicle to an open case, sorted by real distance (nearest-vehicle suggestion); the case and vehicle then progress automatically through a full lifecycle (`dispatched → en route → on scene → closed`)
- **SLA tracking** — open cases are flagged once they exceed a priority-based response time target
- **Case management** — filtering by agency/status, sortable columns
- **User management** — operator directory with search, sort, and pagination
- **Reports** — case-status breakdown chart and Excel export
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

A background simulator moves each vehicle's coordinates every 3 seconds and automatically progresses dispatched cases through their response lifecycle over time, which the frontend polls to create the "live" effect.

## Project Structure

```
emergency-operations-dashboard/
├── api/                    # Express backend
│   ├── src/
│   │   ├── models/         # Sequelize models (Agency, Vehicle, Case, User, Station)
│   │   ├── routes/         # Route definitions
│   │   ├── controllers/    # Request handling
│   │   ├── services/       # Business logic + DB queries
│   │   ├── middlewares/    # JWT authentication
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
