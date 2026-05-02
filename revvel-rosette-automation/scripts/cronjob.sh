#!/usr/bin/env bash
# Daily cron job - Main automation routine

# Note: we deliberately do NOT use `pipefail` here so that we can capture the
# orchestrator's exit code via PIPESTATUS[0] (the `tee` after it would otherwise
# mask it).
set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Log file
LOG_DIR="logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/cronjob-$(date +%Y%m%d).log"

echo "Starting daily automation at $(date)" | tee -a "$LOG_FILE"

# Run the orchestrator with all daily tasks. Capture its exit code so we can
# distinguish "all tasks succeeded" from "one or more tasks failed but the
# orchestrator continued past them" (orchestrator exits 1 on any task failure).
set +e
python3 src/orchestrator.py --run-all 2>&1 | tee -a "$LOG_FILE"
ORCHESTRATOR_EXIT=${PIPESTATUS[0]}
set -e

# Record completion (honest status — don't claim success if tasks failed).
if [ "$ORCHESTRATOR_EXIT" -eq 0 ]; then
    echo "$(date): Completed successfully" > "$LOG_DIR/last-run.txt"
else
    echo "$(date): Completed with failures (orchestrator exit=$ORCHESTRATOR_EXIT). See $LOG_FILE" \
        > "$LOG_DIR/last-run.txt"
fi

echo "Daily automation complete at $(date) (orchestrator exit=$ORCHESTRATOR_EXIT)" \
    | tee -a "$LOG_FILE"

exit "$ORCHESTRATOR_EXIT"
