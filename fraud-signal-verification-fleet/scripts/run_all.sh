#!/usr/bin/env bash
# One-shot: test, score, print report, launch dashboard.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m unittest discover -s tests
python3 src/orchestrator.py
# sed (not head) so judge.py isn't SIGPIPE-killed under `set -o pipefail`.
python3 src/judge.py | sed -n '1,40p'
echo "Launching dashboard on http://localhost:8088 (Ctrl-C to stop)"
python3 dashboard/serve.py
