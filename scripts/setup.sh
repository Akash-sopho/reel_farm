#!/bin/bash

set -e

echo "🚀 ReelForge Setup Script"
echo "========================"
echo ""

# Step 1: Start Docker services
echo "1️⃣ Starting Docker services..."
cd "$(dirname "$0")/.."
docker compose up -d
echo "✓ Docker services started"
echo ""

# Step 2: Wait for PostgreSQL to be ready
echo "2️⃣ Waiting for PostgreSQL to be ready..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if docker exec reelforge-postgres pg_isready -U reelforge -d reelforge > /dev/null 2>&1; then
    echo "✓ PostgreSQL is ready"
    break
  fi
  attempt=$((attempt + 1))
  echo "  Attempt $attempt/$max_attempts..."
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo "✗ PostgreSQL failed to start within ${max_attempts}0 seconds"
  exit 1
fi
echo ""

# Step 3: Install npm dependencies
echo "3️⃣ Installing npm dependencies..."
npm install > /dev/null 2>&1 &
pid=$!

echo "  Installing root dependencies..."
wait $pid

echo "  Installing backend dependencies..."
cd src/backend && npm install > /dev/null 2>&1 &
bg_pids="$!"

echo "  Installing frontend dependencies..."
cd ../frontend && npm install > /dev/null 2>&1 &
bg_pids="$bg_pids $!"

echo "  Installing video dependencies..."
cd ../video && npm install > /dev/null 2>&1 &
bg_pids="$bg_pids $!"

echo "  Installing shared dependencies..."
cd ../shared && npm install > /dev/null 2>&1 &
bg_pids="$bg_pids $!"

# Wait for all npm installs to complete
for pid in $bg_pids; do
  wait $pid
done

echo "✓ npm dependencies installed"
echo ""

# Step 4: Success message
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Copy .env.example to .env and customize if needed:"
echo "      cp .env.example src/backend/.env"
echo ""
echo "   2. Run database migrations:"
echo "      cd src/backend && npx prisma migrate dev"
echo ""
echo "   3. Seed the database:"
echo "      cd src/backend && npx prisma db seed"
echo ""
echo "   4. Start the services:"
echo "      - Backend:  npm run dev:backend"
echo "      - Frontend: npm run dev:frontend"
echo "      - Video:    npm run dev:video"
echo ""
echo "   5. View services:"
echo "      - Backend API: http://localhost:3001"
echo "      - Frontend:    http://localhost:5173"
echo "      - Remotion Studio: http://localhost:3000"
echo "      - MinIO Console:   http://localhost:9001 (user: minioadmin, pass: minioadmin)"
echo ""
