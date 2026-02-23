#!/bin/bash
# first-run.sh — Run once after cloning (or any time to reset the DB to a clean state).
# Safe to re-run: migrations are idempotent, seed uses upsert.

set -e

# Always run from repo root regardless of where the script was invoked from
cd "$(dirname "$0")/.."

echo "🗄️  ReelForge — First-Run DB Setup"
echo "==================================="
echo ""

# Step 1: Make sure Docker is running
echo "1️⃣  Checking Docker services..."
if ! docker compose ps --services --filter status=running | grep -q postgres; then
  echo "  Docker services not running. Starting them now..."
  docker compose up -d
  echo "  Waiting for PostgreSQL to be ready..."
  max_attempts=30
  attempt=0
  while [ $attempt -lt $max_attempts ]; do
    if docker exec reelforge-postgres pg_isready -U reelforge -d reelforge > /dev/null 2>&1; then
      echo "  ✓ PostgreSQL is ready"
      break
    fi
    attempt=$((attempt + 1))
    echo "    Attempt $attempt/$max_attempts..."
    sleep 2
  done
  if [ $attempt -eq $max_attempts ]; then
    echo "  ✗ PostgreSQL failed to start. Run 'docker compose up -d' and try again."
    exit 1
  fi
else
  echo "  ✓ PostgreSQL is already running"
fi
echo ""

# Step 2: Run Prisma migrations
echo "2️⃣  Running database migrations..."
cd src/backend
npx prisma migrate dev --name init 2>&1 | tail -5
echo "  ✓ Migrations applied"
echo ""

# Step 3: Seed the database
echo "3️⃣  Seeding database (8 templates + music tracks)..."
npx prisma db seed 2>&1 | tail -5
echo "  ✓ Seed data inserted"
echo ""

echo "✅  Database is ready!"
echo ""
echo "   Next: run 'npm run dev' from the repo root to start all services."
echo ""
