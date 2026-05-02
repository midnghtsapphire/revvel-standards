#!/usr/bin/env bash
# Daily cron job - Main automation routine

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Log file
LOG_DIR="logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/cronjob-$(date +%Y%m%d).log"

echo "Starting daily automation at $(date)" | tee -a "$LOG_FILE"

# Run the orchestrator with all daily tasks
python3 src/orchestrator.py --run-all 2>&1 | tee -a "$LOG_FILE"

# Record completion
echo "$(date): Completed successfully" > "$LOG_DIR/last-run.txt"

echo "Daily automation complete at $(date)" | tee -a "$LOG_FILE"
