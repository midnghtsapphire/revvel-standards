#!/usr/bin/env bash
# Daily cron job - Main automation routine

# We use `set -eu` (no `pipefail`) at the top level. The `tee` pipeline below
# is wrapped in `set +e` / `set -e` so the orchestrator's non-zero exit doesn't
# abort this script before we can record the failure to last-run.txt. The
# orchestrator's exit code is read out of `PIPESTATUS[0]` afterwards (this works
# whether `pipefail` is set or not — `PIPESTATUS` is a separate mechanism).
set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Log file
LOG_DIR="logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/cronjob-$(date +%Y%m%d).log"

echo "Starting daily automation at $(date)" | tee -a "$LOG_FILE"

# Run the orchestrator with all daily tasks. We temporarily disable `errexit`
# so a non-zero orchestrator exit (one or more daily tasks failed) doesn't
# abort the script before we record the result; we'll re-raise that exit code
# at the end. The orchestrator exits 1 when at least one task fails.
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
