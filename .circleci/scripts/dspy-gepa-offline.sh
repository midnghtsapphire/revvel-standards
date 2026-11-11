#!/usr/bin/env bash
# Offline DSPy GEPA gate for WR #18338.
#
# Installs the pinned lock into its own venv, runs the unit tests, prints the
# historical-example count and the LM-call upper bound, and requires the
# optimize command to refuse a non-local endpoint. No API key is read. The
# optimizer is not started. Exit 0 means those postconditions hold.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

python3 - << 'PY'
import sys
if sys.version_info < (3, 10) or sys.version_info >= (3, 16):
    raise SystemExit(
        "DSPy 3.5.0 needs Python >=3.10 and <3.16; this image has {0}".format(sys.version)
    )
print("python", sys.version.split()[0])
PY

if ! python3 -c "import ensurepip" >/dev/null 2>&1; then
  echo "python3 cannot build a venv (no ensurepip) — installing from apt"
  PY_MINOR="$(python3 -c 'import sys; print("%d.%d" % sys.version_info[:2])')"
  sudo apt-get update -qq
  sudo apt-get install -y -qq python3 python3-venv "python${PY_MINOR}-venv"
  python3 -c "import ensurepip"
fi

VENV="${HOME}/.dspy-gepa-venv"
python3 -m venv "$VENV"
"$VENV/bin/python" -m pip install --quiet --upgrade pip
"$VENV/bin/python" -m pip install --quiet -r scripts/dspy_gepa/requirements.lock
"$VENV/bin/python" -c 'import dspy,gepa,openai; print("dspy", dspy.__version__)'

export PYTHONPATH=scripts
"$VENV/bin/python" -m unittest tests.dspy_gepa_test

# Rebuilds from wr/issues and exits 2 when the example count is under 100.
"$VENV/bin/python" -m dspy_gepa build-trainset > /tmp/dspy-gepa-trainset.json
"$VENV/bin/python" -m dspy_gepa estimate

set +e
"$VENV/bin/python" -m dspy_gepa optimize \
  --prompt goap-agent \
  --model openai/local-test \
  --endpoint https://example.invalid/v1
code=$?
set -e
if [[ "$code" -eq 0 ]]; then
  echo "optimize returned 0 for a non-local endpoint without spend approval" >&2
  exit 1
fi
echo "non-local optimize refused (exit ${code})"
