#!/usr/bin/env bash
# WR #18334. Build the GOAP sales PDF and the static landing page, then prove
# the page returns HTTP 200 on loopback. Exit 0 means those URLs returned 200
# and the PDF magic was present, not merely that a command was launched.
#
# cimg/node has python3 without ensurepip. The venv install below is the same
# remedy as install-python-flake8.sh. ReportLab is imported by
# products/goap-swarm-console/scripts/build_sales_deck.py. If this step fails
# with "No module named reportlab", the venv did not land on PATH for that
# python. If the curl loop fails, read /tmp/agent-fte-http.log.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if ! python3 -c "import ensurepip" >/dev/null 2>&1; then
  echo "python3 cannot build a venv — installing python3-venv"
  sudo apt-get update -qq
  sudo apt-get install -y -qq python3 python3-venv
  python3 -c "import ensurepip"
fi

VENV="${HOME}/.agent-fte-venv"
python3 -m venv "$VENV"
"$VENV/bin/python" -m pip install --quiet --upgrade pip
"$VENV/bin/python" -m pip install --quiet "reportlab==4.2.5"

cd products/goap-swarm-console
node --test tests/*.test.js
"$VENV/bin/python" scripts/build_sales_deck.py
node scripts/build-agent-fte-landing.mjs

PORT=8765
cd landing-dist
python3 -m http.server "$PORT" >/tmp/agent-fte-http.log 2>&1 &
PID=$!
cleanup() { kill "$PID" >/dev/null 2>&1 || true; }
trap cleanup EXIT

code=""
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  code="$(curl -s -o /tmp/agent-fte-index.html -w "%{http_code}" "http://127.0.0.1:${PORT}/" || true)"
  if [ "$code" = "200" ]; then
    break
  fi
  sleep 0.25
done
if [ "$code" != "200" ]; then
  echo "landing page returned ${code:-none}, expected 200" >&2
  cat /tmp/agent-fte-http.log >&2 || true
  exit 1
fi
grep -q "Proof pending" /tmp/agent-fte-index.html
curl -fsS -o /dev/null "http://127.0.0.1:${PORT}/health"
curl -fsS -o /dev/null "http://127.0.0.1:${PORT}/deck.html"
curl -fsS -o /tmp/agent-fte-deck.pdf "http://127.0.0.1:${PORT}/goap-agent-sales-deck.pdf"
python3 -c 'import pathlib; data = pathlib.Path("/tmp/agent-fte-deck.pdf").read_bytes(); assert data.startswith(b"%PDF-"), data[:20]'

mkdir -p /tmp/agent-fte-artifacts
cp /tmp/agent-fte-deck.pdf /tmp/agent-fte-artifacts/goap-agent-sales-deck.pdf
cp /tmp/agent-fte-index.html /tmp/agent-fte-artifacts/index.html
echo "agent-as-fte local HTTP 200 ok"
