#!/usr/bin/env bash
# One-shot: test, score, print report, launch dashboard.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m unittest discover -s tests
python3 src/orchestrator.py
python3 src/judge.py | head -40
echo "Launching dashboard on http://localhost:8088 (Ctrl-C to stop)"
python3 dashboard/serve.py
