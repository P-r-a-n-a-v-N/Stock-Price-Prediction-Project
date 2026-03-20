#!/usr/bin/env bash
# scripts/train.sh
# Train a model for a given ticker directly against the ML microservice.
# Usage: ./scripts/train.sh AAPL 7 50
#
# Args:
#   $1  Ticker  (default: AAPL)
#   $2  Horizon (default: 7)
#   $3  Epochs  (default: 50)

set -euo pipefail

TICKER="${1:-AAPL}"
HORIZON="${2:-7}"
EPOCHS="${3:-50}"
ML_URL="${ML_SERVICE_URL:-http://localhost:8000}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  StockPredictor-TF — Training Job"
echo "  Ticker : $TICKER"
echo "  Horizon: ${HORIZON} days"
echo "  Epochs : $EPOCHS"
echo "  ML URL : $ML_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start job
RESPONSE=$(curl -sf -X POST "${ML_URL}/train/start" \
  -H "Content-Type: application/json" \
  -d "{\"ticker\":\"${TICKER}\",\"horizon\":${HORIZON},\"epochs\":${EPOCHS},\"batch_size\":32}" \
)

JOB_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['job_id'])")
echo "Job ID: $JOB_ID"
echo ""

# Poll for completion
while true; do
  STATUS=$(curl -sf "${ML_URL}/train/status/${JOB_ID}")
  STATE=$(echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status'])")
  PROGRESS=$(echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['progress'])")

  printf "\r  Status: %-12s  Progress: %3s%%  " "$STATE" "$PROGRESS"

  if [[ "$STATE" == "completed" ]]; then
    echo ""
    echo ""
    echo "✅ Training complete!"
    METRICS=$(echo "$STATUS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
m=d.get('metrics',{})
print(f\"  MAE  : {m.get('mae','—')}\")
print(f\"  RMSE : {m.get('rmse','—')}\")
print(f\"  MAPE : {m.get('mape','—')}%\")
print(f\"  DirAcc: {m.get('directional_accuracy','—')}%\")
")
    echo "$METRICS"
    break
  elif [[ "$STATE" == "failed" ]]; then
    echo ""
    ERROR=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error','unknown error'))")
    echo "❌ Training failed: $ERROR"
    exit 1
  fi

  sleep 3
done
