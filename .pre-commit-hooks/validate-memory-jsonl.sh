#!/usr/bin/env bash
# Pre-commit hook: validate wr/memory/*.jsonl files.
# Install by symlinking or copying to .git/hooks/pre-commit, or wire via pre-commit framework.
set -euo pipefail

changed=$(git diff --cached --name-only --diff-filter=ACM | grep -E '^wr/memory/.*\.jsonl$' || true)
if [ -z "$changed" ]; then
  exit 0
fi

echo "[pre-commit] Validating JSONL: $changed"
python3 scripts/validate_jsonl.py $changed
