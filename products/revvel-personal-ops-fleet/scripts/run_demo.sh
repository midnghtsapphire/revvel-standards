#!/usr/bin/env bash
# Offline end-to-end demo. Makes zero external calls.
set -euo pipefail
cd "$(dirname "$0")/.."
export PYTHONPATH="src:${PYTHONPATH:-}"

echo "== doctor =="
python -m revvel_ops.cli doctor
echo "== identities =="
python -m revvel_ops.cli identities
echo "== demo inventory =="
python -m revvel_ops.cli inventory --demo
echo "== plan (review_everything) =="
python -m revvel_ops.cli plan --mode review_everything
echo "== dry-run (policy_automation) =="
python -m revvel_ops.cli dry-run --mode policy_automation
echo "== verify audit chain =="
python -m revvel_ops.cli verify-audit || true
