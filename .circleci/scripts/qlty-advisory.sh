#!/usr/bin/env bash
# ADVISORY Qlty CLI check on files changed in the PR. Never fails the build
# until Audrey says to gate. Free local mode: no Qlty Cloud account, no token.
# Config: .qlty/qlty.toml (small plugin set). Artifacts: qlty.sarif, qlty.txt
# in /tmp/advisory-artifacts/qlty.
# WR #18490.
set -uo pipefail

OUT=/tmp/advisory-artifacts/qlty
mkdir -p "$OUT"
export PATH="$HOME/.qlty/bin:$PATH"

if ! command -v qlty >/dev/null 2>&1; then
  # Pinned so runs are reproducible; bump QLTY_VERSION on purpose.
  export QLTY_VERSION="${QLTY_VERSION:-0.671.0}"
  curl -fsSL https://qlty.sh | sh >/dev/null 2>&1 || {
    echo "Qlty advisory: could not install the Qlty CLI. Not failing the build: this job is advisory."
    exit 0
  }
fi
qlty --version

BASE="$(bash .circleci/scripts/advisory-base-ref.sh)"
if [ -z "$BASE" ]; then
  echo "Qlty advisory: no PR base found, skipping instead of checking the whole repo."
  echo "skipped: no base commit" > "$OUT/qlty.txt"
  exit 0
fi

# Changed files only. --no-fail / --no-error keep the exit code at 0.
qlty check --upstream "$BASE" --no-progress --no-fail --no-error --sarif > "$OUT/qlty.sarif" 2> "$OUT/qlty.stderr.txt" || true
qlty check --upstream "$BASE" --no-progress --no-fail --no-error 2>&1 | tee "$OUT/qlty.txt" || true

echo "Qlty advisory: results are in the job artifacts (qlty.txt, qlty.sarif). Not gating."
exit 0
