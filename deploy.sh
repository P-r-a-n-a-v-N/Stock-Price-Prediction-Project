#!/usr/bin/env bash
# scripts/deploy.sh
# Full production deployment via Docker Compose.
# Usage: ./scripts/deploy.sh [--pull]

set -euo pipefail

PULL="${1:-}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  StockPredictor-TF — Production Deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Validate .env exists
if [[ ! -f ".env" ]]; then
  echo "⚠  .env not found — copying from .env.example"
  cp .env.example .env
  echo "   Edit .env and set JWT_SECRET before re-running."
  exit 1
fi

# Build and start
if [[ "$PULL" == "--pull" ]]; then
  echo "🔄 Pulling latest images..."
  docker compose pull
fi

echo "🏗  Building and starting all services..."
docker compose up --build -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Health checks
check_service() {
  local name=$1
  local url=$2
  local max_tries=20
  local i=0
  while [[ $i -lt $max_tries ]]; do
    if curl -sf "$url" > /dev/null 2>&1; then
      echo "  ✅ $name is healthy"
      return 0
    fi
    i=$((i+1))
    sleep 3
  done
  echo "  ❌ $name did not become healthy in time"
  return 1
}

check_service "ML Service" "http://localhost:8000/health"
check_service "Backend API" "http://localhost:5000/api/health"
check_service "Frontend"    "http://localhost:3000"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 StockPredictor-TF is running!"
echo ""
echo "  Dashboard  → http://localhost:3000"
echo "  API        → http://localhost:5000/api"
echo "  ML Service → http://localhost:8000/docs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
