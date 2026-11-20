#!/usr/bin/env bash
# bootstrap.sh — the one-line include. Fetches the Proofy security gates from
# midnghtsapphire/revvel-standards at a PINNED commit and runs them in the repo
# you are standing in (run it after `checkout`).
#
#   curl -fsSL https://raw.githubusercontent.com/midnghtsapphire/revvel-standards/<SHA>/scripts/security-gates/bootstrap.sh \
#     | REVVEL_STANDARDS_SHA=<SHA> bash
#
# <SHA> must be a full 40-character commit hash (immutable). A branch name is
# refused, because a moving pin means the gate can change under you.
# Only scripts/security-gates/ and scripts/llm-spend-gate.js are downloaded
# (sparse partial fetch, a few hundred KB; the full repo is ~860 MB).
#
# Env: REVVEL_STANDARDS_SHA (required), REVVEL_STANDARDS_REPO_URL (default the
# public GitHub repo; tests point it at a local repo), SECURITY_GATES_DIR
# (default /tmp/revvel-security-gates). Anything run-all.sh reads passes through.
# Print a ready-made snippet with the current main SHA:
#   bash scripts/security-gates/print-adopt-snippet.sh
set -euo pipefail

sha="${REVVEL_STANDARDS_SHA:-}"
if ! [[ "$sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "bootstrap: REVVEL_STANDARDS_SHA must be a full 40-character commit hash (got '${sha:-nothing}'). Branch names are refused on purpose." >&2
  exit 2
fi
url="${REVVEL_STANDARDS_REPO_URL:-https://github.com/midnghtsapphire/revvel-standards.git}"
dest="${SECURITY_GATES_DIR:-/tmp/revvel-security-gates}"

rm -rf "$dest"
mkdir -p "$dest"
(
  cd "$dest"
  git init -q
  git remote add origin "$url"
  git sparse-checkout init --no-cone
  git sparse-checkout set 'scripts/security-gates/' 'scripts/llm-spend-gate.js'
  if ! git fetch -q --depth 1 --filter=blob:none origin "$sha" 2>/dev/null; then
    git fetch -q --depth 1 origin "$sha"
  fi
  git checkout -q FETCH_HEAD
  [ "$(git rev-parse HEAD)" = "$sha" ] || { echo "bootstrap: fetched commit does not match the pin" >&2; exit 2; }
)
echo "bootstrap: security gates at ${sha:0:10} in $dest"
if [ ! -f "$dest/scripts/security-gates/run-all.sh" ]; then
  echo "bootstrap: commit ${sha:0:10} does not contain scripts/security-gates/run-all.sh. Pin a commit from after the security gates merged." >&2
  exit 2
fi
GATES_DIR="$dest/scripts/security-gates" exec bash "$dest/scripts/security-gates/run-all.sh"
