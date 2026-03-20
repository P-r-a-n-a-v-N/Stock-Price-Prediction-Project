#!/usr/bin/env bash
# scripts/dev.sh
# Start all services locally for development (no Docker).
# Requires: Node 20+, Python 3.11+, MongoDB, Redis running locally.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  StockPredictor-TF — Local Dev Mode"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── ML service ────────────────────────────────────────────────────────────────
echo "🐍 Starting ML service..."
cd "$ROOT/ml-service"
if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt --quiet
fi
REDIS_URL=redis://localhost:6379 \
MODEL_CACHE_DIR="$ROOT/ml-service/models" \
  .venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload &
ML_PID=$!

# ── Backend ───────────────────────────────────────────────────────────────────
echo "🟩 Starting Node.js backend..."
cd "$ROOT/backend"
[[ ! -d node_modules ]] && npm install --silent
MONGO_URI=mongodb://localhost:27017/stockpredictor \
REDIS_URL=redis://localhost:6379 \
ML_SERVICE_URL=http://localhost:8000 \
JWT_SECRET=dev_secret_not_for_production \
CORS_ORIGIN=http://localhost:3000 \
NODE_ENV=development \
  npx nodemon src/server.js &
BACKEND_PID=$!

# ── Frontend ──────────────────────────────────────────────────────────────────
echo "⚛️  Starting React frontend..."
cd "$ROOT/frontend"
[[ ! -d node_modules ]] && npm install --silent
VITE_API_URL=http://localhost:5000 \
VITE_WS_URL=ws://localhost:5000 \
  npm run dev &
FRONTEND_PID=$!

echo ""
echo "  Dashboard  → http://localhost:3000"
echo "  API        → http://localhost:5000/api"
echo "  ML Docs    → http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop all services."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Trap Ctrl+C and kill all child processes
cleanup() {
  echo ""
  echo "Stopping services..."
  kill $ML_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  wait 2>/dev/null || true
  echo "Done."
}
trap cleanup INT TERM

wait
