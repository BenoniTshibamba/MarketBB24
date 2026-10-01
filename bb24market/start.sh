#!/bin/bash
# BB24Market quick start (Mac/Linux)
set -e
cd "$(dirname "$0")"

echo "Starting BB24Market..."
echo ""
if ! command -v python3 >/dev/null 2>&1; then
  echo "[ERROR] python3 was not found. Install Python 3.10+ and run ./start.sh again."
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] node was not found. Install Node.js 18+ from https://nodejs.org/ and run ./start.sh again."
  exit 1
fi

echo "Backend setup..."
cd backend
if [ ! -d ".venv" ]; then
  echo "Creating Python environment (one-time)..."
  python3 -m venv .venv
fi
.venv/bin/pip install -q -r requirements.txt
if [ ! -f "market.db" ]; then
  echo "Seeding demo data (one-time)..."
  .venv/bin/python seed.py
fi
(.venv/bin/uvicorn app:app --port 8000 &)
# Wait until the backend actually answers before starting the frontend
for i in $(seq 1 30); do
  if curl -sf http://localhost:8000/api/health >/dev/null 2>&1; then break; fi
  sleep 1
done
cd ..

echo "Frontend setup..."
cd frontend
if [ ! -d "node_modules" ]; then
  echo "Installing frontend packages (one-time)..."
  npm install
fi
echo ""
echo "Backend:  http://localhost:8000  (docs: http://localhost:8000/docs)"
echo "Starting frontend..."
echo "If the app says \"Can't reach the server\", the backend did not start - check the messages above."
echo ""
npm run dev -- --port 5173
