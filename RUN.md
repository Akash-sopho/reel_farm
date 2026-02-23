# RUN.md — How to Run ReelForge

This file is the single reference for starting the ReelForge development environment. Follow the sections below in order.

---

## Prerequisites

Before you begin, verify that these are installed and up to date:

```bash
node --version       # must be >= 20
npm --version        # must be >= 10
docker --version     # must be installed and Docker Desktop running
```

If Docker is not installed: download [Docker Desktop](https://www.docker.com/products/docker-desktop/) and restart your machine after installation.

If Node.js or npm are out of date, visit https://nodejs.org/ and install the latest LTS version.

---

## One-Time Setup (run once, in order)

Run these steps **in order after cloning the repo**. Each step must succeed before the next.

### Step 1: Install all dependencies (backend + frontend + video + shared)

```bash
npm run install-all
```

**Expected output:** no errors, node_modules created in root, `src/backend/`, `src/frontend/`, `src/video/`, and `src/shared/`.

If any package fails to install, re-run this step (npm can be finicky with network issues).

### Step 2: Copy environment file

```bash
cp .env.example src/backend/.env
```

The default values work for local development — **no changes needed** unless you want to enable OpenAI features (add your own `OPENAI_API_KEY`).

### Step 3: Start infrastructure containers

```bash
docker compose up -d
```

**Expected output:** three containers starting:
- `reelforge-postgres`
- `reelforge-redis`
- `reelforge-minio`

Verify all three are healthy:

```bash
docker compose ps
```

All three services should show `healthy` or `running`. If PostgreSQL is still starting, wait 10 seconds and check again.

### Step 4: Wait for containers to be healthy

If any container shows `unhealthy`, wait another 10 seconds:

```bash
docker compose ps
```

### Step 5: Run database migrations + seed data

```bash
npm run first-run
```

This script:
1. Confirms PostgreSQL is reachable
2. Runs `npx prisma migrate dev --name init` — creates all 9 DB tables
3. Runs `npx prisma db seed` — inserts 8 templates and 3 music tracks

**Expected final output:** `✅  Database is ready!`

If you see "relation does not exist" errors later, re-run this step.

---

## Daily Development

### Step 1: Start infrastructure (safe to run repeatedly)

```bash
docker compose up -d
```

### Step 2: Start all dev servers at once

```bash
npm run dev
```

This starts all three services concurrently with **color-coded output:**
- `[backend]` → http://localhost:3001
- `[frontend]` → http://localhost:5173
- `[video]` → http://localhost:3000 (Remotion Studio)

**Stop all services:** Press `Ctrl+C`

---

## Services Reference Table

| Service | URL | Port | Notes |
|---|---|---|---|
| Express API | http://localhost:3001 | 3001 | Health: `/health`, Templates: `/api/templates` |
| React Frontend | http://localhost:5173 | 5173 | Vite HMR dev server, auto-refreshes on changes |
| Remotion Studio | http://localhost:3000 | 3000 | 9 video template compositions |
| MinIO Console | http://localhost:9001 | 9001 | S3-compatible storage UI; login: `minioadmin` / `minioadmin` |
| PostgreSQL | localhost:5432 | 5432 | db: `reelforge`, user: `reelforge`, pass: `reelforge_dev` |
| Redis | localhost:6379 | 6379 | Job queue; no authentication required |
| MinIO S3 API | localhost:9000 | 9000 | File storage (used by backend); not accessed directly |

---

## Verification Checklist

After running `npm run dev`, verify each service is healthy:

### 1. Backend API

```bash
curl http://localhost:3001/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"...","version":"0.1.0"}
```

### 2. Template List

```bash
curl http://localhost:3001/api/templates
```

**Expected response:** JSON array with 8 templates (Photo Dump, Quote Card, etc.)

### 3. Frontend

Open http://localhost:5173 in your browser.

**Expected:** ReelForge home page loads, no errors in browser console.

### 4. Remotion Studio

Open http://localhost:3000 in your browser.

**Expected:** Remotion Studio UI with 9 compositions visible in the sidebar.

### 5. MinIO Console

Open http://localhost:9001 in your browser.

**Expected:** MinIO login page. Credentials:
- Username: `minioadmin`
- Password: `minioadmin`

---

## Individual Server Commands (if not running all at once)

If you prefer to run services in **separate terminals**, use these commands:

```bash
# Terminal 1 — Backend API
npm run dev:backend

# Terminal 2 — Frontend
npm run dev:frontend

# Terminal 3 — Remotion Studio
npm run dev:video
```

---

## Running Tests

All test suites require Docker infrastructure running (`docker compose up -d`).

### Backend Tests (Jest + integration tests with real DB)

```bash
npm run test:backend
```

Requires `reelforge` database. Runs against real PostgreSQL.

### Frontend Tests (Vitest unit tests)

```bash
npm run test:frontend
```

No database required.

### Video/Remotion Tests (Jest + component unit tests)

```bash
npm run test:video
```

Tests 93 Remotion component scenarios with 100% code coverage. No database required.

### Run a specific test file

```bash
cd src/backend && npx jest --testPathPattern=health --verbose
cd src/video && npx jest StaticImage --verbose
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `docker: command not found` | Install Docker Desktop and restart your terminal |
| `Cannot connect to database` | Run `docker compose up -d`, wait 10 seconds, then retry |
| `relation "Template" does not exist` | Run `npm run first-run` to create and seed the database |
| Backend starts but no templates returned | Run `cd src/backend && npx prisma db seed` |
| Port already in use (e.g., 3001) | Kill the process: `npx kill-port 3001` |
| Backend won't start | Verify `src/backend/.env` exists and is readable |
| Remotion Studio blank | Run `cd src/video && npm install` first |
| `OPENAI_API_KEY` not set warning | Normal in dev — AI features won't work until you add a real key to `src/backend/.env` |
| Fresh start needed | Run `docker compose down -v` to delete all data, then repeat **One-Time Setup** steps 3–5 |

---

## Environment Variables Reference

All variables in `.env.example` are pre-configured for **local development** and work out-of-the-box. Copy this file to `src/backend/.env` before running:

| Variable | Value | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://reelforge:reelforge_dev@localhost:5432/reelforge` | PostgreSQL connection string (Docker) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string (Docker) |
| `MINIO_ENDPOINT` | `localhost` | MinIO server hostname |
| `MINIO_PORT` | `9000` | MinIO S3 API port |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO credentials (default) |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO credentials (default) |
| `MINIO_BUCKET` | `reelforge` | MinIO bucket name for uploads |
| `OPENAI_API_KEY` | `sk-your-api-key-here` | OpenAI API key (optional; AI features disabled without it) |
| `PORT` | `3001` | Express API port |
| `NODE_ENV` | `development` | Environment (development/production) |
| `CORS_ORIGIN` | `*` | CORS allowed origins |

**Note:** In production, use environment-specific `.env` files and secrets management. Never commit `.env` files to Git.

---

## Stopping Everything

### Stop dev servers

Press `Ctrl+C` in the terminal running `npm run dev`.

### Stop Docker infrastructure (keeps data)

```bash
docker compose stop
```

Docker volumes persist, so data is saved between sessions.

### Stop Docker AND delete all data (fresh start)

```bash
docker compose down -v
```

This removes all containers and volumes. To rebuild:

1. Re-run **One-Time Setup Step 3** (start containers)
2. Re-run **One-Time Setup Step 5** (`npm run first-run`)

---

## Quick Reference: Common Commands

```bash
# One-time setup (run once after cloning)
npm run install-all
cp .env.example src/backend/.env
docker compose up -d
npm run first-run

# Every development session
docker compose up -d
npm run dev

# Testing
npm run test:backend
npm run test:frontend
npm run test:video

# Infrastructure management
docker compose ps          # Show running containers
docker compose logs -f     # Follow all logs
docker compose stop        # Stop containers (keep data)
docker compose down -v     # Stop and delete everything
```

---

## Need Help?

- **Backend API issues?** Check `docker compose logs -f` for error traces
- **Frontend not updating?** Hard-refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- **Database errors?** Verify PostgreSQL is running: `docker compose ps`
- **Port conflicts?** Use `npx kill-port <PORT>` to free a port
- **Full reset?** Run `docker compose down -v && npm run first-run` to wipe and recreate everything

For more details, see `CLAUDE.md` (agent instructions) and `TASKS.md` (task board).
