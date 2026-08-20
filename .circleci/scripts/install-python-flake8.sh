#!/usr/bin/env bash
#
# Provide `python3` + flake8 for `npm test`.
#
# scripts/flake8-baseline-gate.js shells out to `python3 -m flake8`. Two tests
# in tests/python-flake8-workflow.test.js spawn that gate, so on an image with
# no Python the whole `npm test` step fails — regardless of what the PR
# changed. That is what kept ci/circleci:lint-and-test red on every PR
# (see WR #17746).
#
# Contract (CLAUDE.md gotcha #6): exit 0 means "python3 -m flake8 runs", not
# "the install command finished." The verification at the bottom is the gate.
set -euo pipefail

FLAKE8_VERSION="7.1.1" # keep in sync with ensureFlake8() in scripts/flake8-baseline-gate.js
VENV="${HOME}/.flake8-venv"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not present — installing from apt"
  sudo apt-get update -qq
  sudo apt-get install -y -qq python3 python3-venv
fi

# A venv, not `pip install --user`: Ubuntu 24.04+ marks the system interpreter
# externally-managed (PEP 668) and refuses --user installs outright.
python3 -m venv "$VENV"
"$VENV/bin/python" -m pip install --quiet --upgrade pip
"$VENV/bin/python" -m pip install --quiet "flake8==${FLAKE8_VERSION}"

# The gate spawns a bare `python3`, so the venv has to win on PATH for every
# subsequent step. BASH_ENV is sourced by each CircleCI step; exporting in this
# step's shell alone would not survive.
echo "export PATH=\"${VENV}/bin:\$PATH\"" >> "$BASH_ENV"
export PATH="${VENV}/bin:$PATH"

# Assert, do not comment: prove the exact invocation the gate makes works.
python3 -m flake8 --version
echo "python + flake8 ready: $(command -v python3)"
