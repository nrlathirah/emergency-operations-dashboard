# Emergency Operations Dashboard

A real-time, multi-agency emergency operations dashboard — live vehicle tracking on a map, case management, user administration, and reporting, built with Vue.js and Node.js/Express.

**This is an independent personal project inspired by my work experience building a real-time emergency operations platform professionally. All code, data, and design here are original and built from scratch — no proprietary code, real agency data, or confidential information is used.**

## 🔗 Live Demo

- **Dashboard**: https://emergency-operations-dashboard.vercel.app
- **API**: https://emergency-operations-dashboard.onrender.com/api

> Note: the backend is hosted on a free tier that sleeps after inactivity — the first load may take 30-60 seconds to wake up.

## Problem & Motivation

Emergency response is often split across separate, agency-specific systems — health, police, and fire each operate with their own tools, making it harder to get a single, live, cross-agency view during an incident. Operators need to know where the nearest available resource is; supervisors need to track active cases and monitor performance across agencies.

This project is a simplified reimagining of that coordination layer: a single dashboard giving operators a live view of multi-agency resources and cases, instead of switching between siloed systems — plus the user administration and reporting a real operations team would need around it.

## Features

- **Live map** — simulated real-time vehicle tracking (ambulances, patrol cars, fire trucks) across 3 agencies (KKM, PDRM, JBPM), updating every few seconds
- **Case management** — list of active cases with filtering (agency, status) and sortable columns
- **User management** — dashboard operator directory with search, sort, and pagination
- **Reports** — case-status breakdown chart and Excel export
- **Documented API** — full Postman collection included (`api/postman/`)

## Tech Stack

**Frontend**: Vue 3, Vue Router, Tailwind CSS, Chart.js, Leaflet, Axios
**Backend**: Node.js, Express, Sequelize (SQLite locally / PostgreSQL in production)
**Deployment**: Vercel (frontend), Render (backend + PostgreSQL)

## Architecture

Two independent apps communicating over a REST API — the same client-server pattern used by real production dashboards:

```
ui/ (Vue frontend)  --HTTP-->  api/ (Express backend)  --Sequelize-->  Database
```

The backend follows a layered pattern: **route → controller → service**
- **route**: maps a URL to a controller
- **controller**: reads the request, calls a service, sends the response
- **service**: contains the actual business logic / database query

A background simulator moves each vehicle's coordinates slightly every 3 seconds, which the frontend polls to create the "live" tracking effect.

## Project Structure

```
emergency-operations-dashboard/
├── api/                    # Express backend
│   ├── src/
│   │   ├── models/         # Sequelize models (Agency, Vehicle, Case, User)
│   │   ├── routes/         # Route definitions
│   │   ├── controllers/    # Request handling
│   │   ├── services/       # Business logic + DB queries
│   │   └── seed.js         # Seeds demo data
│   └── postman/            # API test collection
└── ui/                     # Vue frontend
    └── src/
        ├── pages/          # Routed pages (Dashboard, Users, Reports)
        ├── components/     # Map, tables, chart
        ├── services/       # API call wrappers
        └── router/         # Vue Router config
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

A Postman collection covering all endpoints (vehicles, cases, users, reports) is included at `api/postman/emergency-operations-dashboard.postman_collection.json`.
