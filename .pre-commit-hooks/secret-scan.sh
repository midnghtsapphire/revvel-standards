#!/usr/bin/env bash
# Local secret scan for pre-commit (own code — no marketplace Actions).
# Brain-dump #6.
set -euo pipefail
repo_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$repo_root"
if [ "$#" -gt 0 ]; then
  files=("$@")
else
  files=()
  while IFS= read -r _f; do
    [ -n "$_f" ] && files+=("$_f")
  done < <(git diff --cached --name-only --diff-filter=ACMR)
fi
if [ "${#files[@]}" -eq 0 ]; then
  echo "secret-scan: no files — passing"
  exit 0
fi
exec python3 "$repo_root/scripts/secret_scan.py" "${files[@]}"
