#!/usr/bin/env bash
set -euo pipefail

git fetch origin main --depth=200

BASE="$(git merge-base origin/main HEAD 2>/dev/null || true)"
if [ -z "$BASE" ]; then
  echo "ERROR: Could not determine merge base with origin/main; refusing to skip markdownlint." >&2
  exit 1
fi

FILES="$(git diff --name-only --diff-filter=d "$BASE" HEAD -- '*.md' || true)"
if [ -z "$FILES" ]; then
  echo "No changed Markdown files to lint."
else
  echo "Linting changed Markdown:"
  echo "$FILES"
  mapfile -t MARKDOWN_FILES < <(printf '%s\n' "$FILES")
  npx markdownlint-cli2 "${MARKDOWN_FILES[@]}"
fi
