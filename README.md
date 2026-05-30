<div align="center">

# 📡 SitePulse

### Full-Stack Website Uptime Monitoring & Incident Management Dashboard

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-ORM-D71F00?style=flat-square)](https://sqlalchemy.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat-square&logo=vercel)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**SitePulse** is a self-hosted uptime monitoring platform. Add any URL — SitePulse checks it every minute via a serverless cron, classifies failures with root-cause analysis (DNS failure, SSL expiry, 5xx errors, slow response), logs incidents with duration tracking, and presents everything in a live React dashboard with Recharts graphs.

</div>

---

## ✨ Features

- **⏱️ Per-minute checks** — Cron-job.org calls `/api/run-checks` every 60 seconds for all active monitors
- **🔍 Full health pipeline** — DNS resolution → SSL expiry check → HTTP request → response time classification
- **🧠 Root-cause analysis** — 12 failure types mapped to human-readable explanations (e.g. `502 → Bad gateway — upstream service unreachable`)
- **🔁 Retry logic** — Configurable retries before declaring DOWN, avoiding false-positive alerts
- **🚨 Incident tracking** — Auto-opens incidents on failure, auto-resolves with downtime duration on recovery
- **📊 Live dashboard** — Status cards, response time charts (Recharts), and incident log auto-refreshing every 30s
- **📋 Per-monitor detail** — Dedicated page with 24h history graph, full log table, and SSL expiry countdown
- **🗄️ SQLite → PostgreSQL** — Runs on SQLite locally, auto-switches to PostgreSQL in production via `DATABASE_URL`
- **☁️ Serverless-ready** — Backend deployed as Vercel serverless functions; zero cold-start DB writes
- **📱 Responsive UI** — Mobile-friendly sidebar layout with Tailwind CSS dark theme

---

## 🛠️ Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Python** | 3.11+ | Runtime |
| **FastAPI** | latest | REST API framework with auto OpenAPI docs |
| **SQLAlchemy** | latest | ORM for website, result, and incident models |
| **Pydantic** | v2 | Request/response validation schemas |
| **Requests** | latest | HTTP health checks with timeout control |
| **psycopg2-binary** | latest | PostgreSQL driver for production DB |
| **python-dotenv** | latest | `.env` environment variable loading |
| **Uvicorn** | latest | ASGI server for local development |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | 18 | UI library |
| **Vite** | 5 | Dev server and build tool |
| **React Router DOM** | 6 | Client-side routing (Dashboard, Monitors, Incidents, Detail) |
| **Recharts** | 2.12 | Response time line charts and uptime graphs |
| **Tailwind CSS** | 3.4 | Utility-first dark-themed styling |
| **Lucide React** | 0.441 | Icon library (Globe, Zap, AlertTriangle, etc.) |
| **date-fns** | 3.6 | Timestamp formatting for logs and history |
| **clsx** | 2.1 | Conditional class name utility |

### Infrastructure

| Service | Purpose |
|---|---|
| **Vercel** | Backend (Python serverless) + Frontend (static) deployment |
| **cron-job.org** | Free external cron — triggers `/api/run-checks` every minute |
| **SQLite** | Local development database (zero config) |
| **PostgreSQL / Neon** | Production database (never sleeps, never expires) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  cron-job.org (every 60s)                        │
│                POST /api/run-checks                              │
└─────────────────────────┬───────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│              Vercel Serverless (backend/)                         │
│                                                                   │
│  FastAPI  ←──── api/index.py (Vercel entrypoint)                 │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  run_checks_logic()                                       │   │
│  │  For each active website:                                 │   │
│  │    checker.check_with_retries()                           │   │
│  │      1. DNS resolution   (socket.gethostbyname)           │   │
│  │      2. SSL expiry check (ssl + socket)                   │   │
│  │      3. HTTP GET         (requests, with timeout)         │   │
│  │      4. Response time vs threshold                        │   │
│  │      5. Classify: UP / DOWN / SLOW / SSL_ERROR            │   │
│  │    → Save MonitoringResult to DB                          │   │
│  │    → Open/resolve IncidentLog in DB                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  REST API routes:                                                 │
│  GET/POST/PATCH/DELETE  /api/websites                            │
│  GET  /api/websites/:id/results                                  │
│  GET  /api/websites/:id/dashboard                                │
│  GET  /api/websites/:id/logs                                     │
│  GET  /api/dashboard/stats                                       │
│  GET  /api/dashboard/history/:id                                 │
│  GET  /api/incidents                                             │
└──────────────────────────┬──────────────────────────────────────┘
                            │ PostgreSQL (Neon / Render)
                 ┌──────────┴──────────┐
                 │  websites           │
                 │  monitoring_results │
                 │  incident_logs      │
                 └─────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│          Vercel Static (frontend/) — React + Vite                │
│                                                                   │
│  /              → Dashboard (overview stats + charts)            │
│  /monitors      → All monitors list                              │
│  /monitors/:id  → Per-monitor detail + 24h history               │
│  /incidents     → Incident log with duration + root cause        │
│                                                                   │
│  Auto-polls API every 30s for live updates                       │
└─────────────────────────────────────────────────────────────────┘
```

### Health Check Pipeline

```
URL submitted
     ↓
1. DNS resolve (socket.gethostbyname)
     ↓ fails → status: DOWN, failure_type: DNS_FAILURE
2. SSL expiry check (HTTPS only)
     ↓ expired → status: SSL_ERROR, ssl_expiry_days: <0
3. HTTP GET with timeout
     ↓ timeout → status: DOWN, failure_type: TIMEOUT
     ↓ wrong status code → DOWN + classified failure_type
4. Response time vs threshold
     ↓ exceeds threshold → status: SLOW
5. All OK → status: UP
```

---

## 📁 Project Structure

```
SitePulse/
├── backend/
│   ├── main.py              # FastAPI app — all routes + check runner logic
│   ├── checker.py           # Health check engine — DNS, SSL, HTTP, classification
│   ├── models.py            # SQLAlchemy ORM models + DB init (Website, Result, Incident)
│   ├── requirements.txt     # Python dependencies
│   ├── vercel.json          # Rewrite all requests → /api/index
│   ├── uptime.db            # SQLite DB (local dev only)
│   └── api/
│       └── index.py         # Vercel serverless entrypoint (imports FastAPI app)
│
└── frontend/
    ├── index.html           # Vite HTML entry
    ├── vite.config.js       # Vite config with React plugin
    ├── tailwind.config.js   # Tailwind config with custom dark theme
    ├── postcss.config.js    # PostCSS for Tailwind
    ├── package.json         # npm dependencies
    ├── vercel.json          # SPA fallback rewrite → /index.html
    └── src/
        ├── App.jsx          # Router setup with Sidebar layout
        ├── api.js           # Centralized fetch client for all API calls
        ├── main.jsx         # React entry point
        ├── index.css        # Tailwind base styles
        ├── components/
        │   ├── Sidebar.jsx          # Navigation sidebar (responsive)
        │   ├── StatusCard.jsx       # Stat cards (total, up, down, avg response)
        │   ├── MonitorCard.jsx      # Single monitor row with status badge
        │   ├── Charts.jsx           # Recharts response time line chart
        │   ├── UptimeBar.jsx        # 24h uptime bar visualization
        │   ├── IncidentLog.jsx      # Recent incidents table
        │   └── AddMonitorModal.jsx  # Add new website form modal
        └── pages/
            ├── Dashboard.jsx        # Overview: stats + charts + incidents
            ├── Monitors.jsx         # Full monitors list with toggle/delete
            ├── WebsiteDetail.jsx    # Per-monitor: history graph + full log
            └── Incidents.jsx        # All incidents with duration + root cause
```

---

## 🚀 Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=sqlite:///./uptime.db    # uses SQLite locally — no setup needed
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

Start the API server:

```bash
uvicorn main:app --reload --port 8000
```

API docs available at: [http://localhost:8000/docs](http://localhost:8000/docs)

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## ☁️ Deploying to Vercel

SitePulse uses **two separate Vercel projects** — one for the backend (Python serverless), one for the frontend (static React).

### 1. Deploy the Backend

1. Go to [vercel.com](https://vercel.com) → **New Project** → import this repo
2. Set **Root Directory** to `backend`
3. Vercel auto-detects Python; it will use `api/index.py` as the serverless entry
4. Add environment variables:

| Key | Value |
|---|---|
| `DATABASE_URL` | Your PostgreSQL connection string (Neon recommended) |
| `ALLOWED_ORIGINS` | Your frontend Vercel URL (e.g. `https://sitepulse.vercel.app`) |

### 2. Deploy the Frontend

1. Create a second Vercel project → same repo
2. Set **Root Directory** to `frontend`
3. Add environment variable:

| Key | Value |
|---|---|
| `VITE_API_URL` | Your backend Vercel URL (e.g. `https://sitepulse-api.vercel.app`) |

### 3. Set up the Cron

1. Go to [cron-job.org](https://cron-job.org) → create a free account
2. Create a new cron job:
   - **URL:** `https://your-backend.vercel.app/api/run-checks`
   - **Method:** POST
   - **Schedule:** Every 1 minute

This triggers health checks for all active monitors every 60 seconds.

---

## 🗄️ Database Schema

```
websites
  id                      UUID PRIMARY KEY
  name                    VARCHAR(255)
  url                     VARCHAR(2048)
  interval_seconds        INTEGER DEFAULT 60
  expected_status_code    INTEGER DEFAULT 200
  alert_preference        VARCHAR(50)
  is_active               BOOLEAN DEFAULT TRUE
  timeout_seconds         INTEGER DEFAULT 30
  retry_count             INTEGER DEFAULT 3
  response_time_threshold INTEGER DEFAULT 2000  (ms)
  created_at              DATETIME

monitoring_results
  id                UUID PRIMARY KEY
  website_id        FK → websites
  timestamp         DATETIME
  status            VARCHAR(20)  -- UP | DOWN | SLOW | SSL_ERROR
  response_time_ms  INTEGER
  http_status_code  INTEGER
  error_message     TEXT
  ssl_expiry_days   INTEGER

incident_logs
  id                UUID PRIMARY KEY
  website_id        FK → websites
  started_at        DATETIME
  resolved_at       DATETIME
  is_resolved       BOOLEAN DEFAULT FALSE
  duration_seconds  INTEGER
  failure_type      VARCHAR(50)
  http_status_code  INTEGER
  error_message     TEXT
```

---

## 🔌 API Reference

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/websites` | List all monitors with latest status |
| `POST` | `/api/websites` | Add a new monitor |
| `PATCH` | `/api/websites/:id` | Update monitor settings |
| `DELETE` | `/api/websites/:id` | Remove a monitor |
| `GET` | `/api/websites/:id/results` | Raw check results (paginated) |
| `GET` | `/api/websites/:id/dashboard` | Aggregated stats for detail page |
| `GET` | `/api/websites/:id/logs` | Filtered check log for detail table |
| `GET` | `/api/dashboard/stats` | Overall stats (total, up, down, avg RT) |
| `GET` | `/api/dashboard/history/:id` | 24h response time history for charts |
| `GET` | `/api/incidents` | All incidents with status + duration |
| `POST` | `/api/run-checks` | Trigger manual check run (cron endpoint) |

Full interactive docs: `GET /docs` (FastAPI auto-generated Swagger UI)

---

## 🧠 Failure Classification

| Failure Type | Trigger | Root Cause Shown |
|---|---|---|
| `DNS_FAILURE` | DNS lookup fails | *Domain doesn't resolve — DNS misconfiguration or expired domain* |
| `TIMEOUT` | Request exceeds timeout | *Server not responding — possible overload or network issue* |
| `CONNECTION_REFUSED` | TCP connection refused | *Server refused connection — firewall or service is down* |
| `SSL_EXPIRED` | SSL cert days < 0 | *SSL certificate has expired — renew it immediately* |
| `SSL_ERROR` | SSL handshake fails | *SSL handshake failed — certificate mismatch or invalid cert* |
| `SERVER_ERROR` | HTTP 5xx | *Backend server crashed or threw an unhandled exception* |
| `SERVICE_UNAVAILABLE` | HTTP 503 | *Server under maintenance or starved of resources* |
| `GATEWAY_TIMEOUT` | HTTP 504 | *Reverse proxy can't reach the application server in time* |
| `SLOW_RESPONSE` | RT > threshold | *High latency — database queries or third-party API slowdown* |
| `NOT_FOUND` | HTTP 404 | *Target URL moved or resource was deleted* |
| `RATE_LIMITED` | HTTP 429 | *Client is being throttled — reduce check frequency* |
| `BAD_GATEWAY` | HTTP 502 | *Bad gateway — upstream service unreachable* |

---

## 📦 Dependencies

### Backend (`backend/requirements.txt`)
```
fastapi          # REST API framework
uvicorn          # ASGI server (local dev)
sqlalchemy       # ORM for DB models
requests         # HTTP health check client
python-dotenv    # .env config loading
pydantic         # Request validation
psycopg2-binary  # PostgreSQL driver
```

### Frontend (`frontend/package.json`)
```json
{
  "react": "^18.3.1",            // UI library
  "react-dom": "^18.3.1",        // DOM renderer
  "react-router-dom": "^6.26.1", // Client-side routing
  "recharts": "^2.12.7",         // Charts (response time, uptime)
  "lucide-react": "^0.441.0",    // Icons
  "tailwindcss": "^3.4.10",      // Utility CSS
  "date-fns": "^3.6.0",          // Timestamp formatting
  "clsx": "^2.1.1",              // Conditional classNames
  "vite": "^5.4.2"               // Build tool & dev server
}
```

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first.

1. Fork the repo
2. Create your branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---
