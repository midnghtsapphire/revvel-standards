#!/usr/bin/env bash
#
# Provide a working `python3 -m flake8` for `npm test`.
#
# scripts/flake8-baseline-gate.js shells out to `python3 -m flake8`. Two tests
# in tests/python-flake8-workflow.test.js spawn that gate, so on an image where
# that invocation cannot work the whole `npm test` step fails — regardless of
# what the PR changed. That is what kept ci/circleci:lint-and-test red on every
# PR (see WR #17746).
#
# What cimg/node actually ships: `python3` IS present — it is the interpreter's
# BATTERIES that are missing. There is no `ensurepip`, so `python3 -m venv`
# fails outright:
#
#   The virtual environment was not created successfully because ensurepip is
#   not available.  On Debian/Ubuntu systems, you need to install the
#   python3-venv package [...] apt install python3.10-venv
#
# and `python3 -m pip` is unavailable too, which is why the gate's own
# `pip install --user flake8` fallback could never rescue it.
#
# So the install must be gated on the CAPABILITY, not on `command -v python3`.
# Checking for the binary finds it, skips the install, and leaves the job
# exactly as broken as before — this script's first version made that mistake.
#
# Contract (CLAUDE.md gotcha #6): exit 0 means "python3 -m flake8 runs", not
# "the install command finished." The verification at the bottom is the gate.
set -euo pipefail

FLAKE8_VERSION="7.1.1" # keep in sync with ensureFlake8() in scripts/flake8-baseline-gate.js
VENV="${HOME}/.flake8-venv"

# `import ensurepip` is the precise precondition for `python3 -m venv`, so test
# that rather than a proxy. Absent python3 also lands here, which is correct.
if ! python3 -c "import ensurepip" >/dev/null 2>&1; then
  echo "python3 cannot build a venv (no ensurepip) — installing from apt"
  # Ubuntu splits the stdlib: the venv module lives in a versioned package, and
  # the unversioned name does not always pull it. Ask for both; the versioned
  # name is derived from the interpreter that is actually installed.
  PY_MINOR="$(python3 -c 'import sys; print("%d.%d" % sys.version_info[:2])' 2>/dev/null || true)"
  sudo apt-get update -qq
  sudo apt-get install -y -qq python3 python3-venv ${PY_MINOR:+"python${PY_MINOR}-venv"}

  # Assert the install achieved the thing it was for, rather than trusting that
  # apt exiting 0 means venv now works.
  python3 -c "import ensurepip" || {
    echo "ERROR: python3-venv installed but ensurepip is still unavailable." >&2
    exit 1
  }
fi

# A venv, not `pip install --user`: Ubuntu images from 24.04 mark the system
# interpreter externally-managed (PEP 668) and refuse --user installs outright.
python3 -m venv "$VENV"
"$VENV/bin/python" -m pip install --quiet --upgrade pip
"$VENV/bin/python" -m pip install --quiet "flake8==${FLAKE8_VERSION}"

# The gate spawns a bare `python3`, so the venv has to win on PATH for every
# subsequent step. BASH_ENV is sourced by each CircleCI step; exporting in this
# step's shell alone would not survive.
#
# Default it rather than dereferencing it bare: under `set -u` an unset
# BASH_ENV aborts this script with "unbound variable", which would turn a
# missing CircleCI convenience variable into a hard CI failure.
BASH_ENV="${BASH_ENV:-$HOME/.bash_env}"
touch "$BASH_ENV"
echo "export PATH=\"${VENV}/bin:\$PATH\"" >> "$BASH_ENV"
export PATH="${VENV}/bin:$PATH"

# Assert, do not comment: prove the exact invocation the gate makes works.
python3 -m flake8 --version
echo "python + flake8 ready: $(command -v python3)"
