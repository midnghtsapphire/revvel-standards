#!/usr/bin/env bash
# Fail if AGENTS.md and .github/copilot-instructions.md are not byte-identical.
# Copilot has no import, so the instructions file is a generated copy of the
# rulebook. This check is the CircleCI step that keeps them from drifting.
# No symlinks: they break on Windows checkouts.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LEFT="$ROOT/AGENTS.md"
RIGHT="$ROOT/.github/copilot-instructions.md"

if [[ ! -f "$LEFT" ]]; then
  echo "missing $LEFT" >&2
  exit 1
fi
if [[ ! -f "$RIGHT" ]]; then
  echo "missing $RIGHT" >&2
  exit 1
fi
if [[ -L "$LEFT" || -L "$RIGHT" ]]; then
  echo "AGENTS.md and .github/copilot-instructions.md must be regular files, not symlinks." >&2
  ls -l "$LEFT" "$RIGHT" >&2
  exit 1
fi
if ! cmp -s "$LEFT" "$RIGHT"; then
  echo "AGENTS.md and .github/copilot-instructions.md differ." >&2
  echo "Copy AGENTS.md to .github/copilot-instructions.md so they match exactly." >&2
  diff -u "$LEFT" "$RIGHT" >&2 || true
  exit 1
fi
echo "OK: AGENTS.md and .github/copilot-instructions.md match."
