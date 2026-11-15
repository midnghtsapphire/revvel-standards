#!/usr/bin/env bash
# stage-changed-files.sh <outdir> — copy the files this PR adds or changes into
# <outdir>, keeping their paths, so a scanner reads only what the PR touched
# (the full checkout is ~860 MB). Prints "staged N file(s)" on stdout's last line.
#
# Base: BASE_SHA if set, else merge-base of origin/main and HEAD (fetching
# origin/main --depth=200 first if the checkout is shallow, same as policy-check).
# Files over MAX_FILE_MB (default 50) are listed and skipped, not skipped silently.
# Fails closed (exit 2) if the base cannot be found.
# Part of Proofy security gate 2 (docs/security-gates/PLAN.md).
set -euo pipefail

out="${1:?usage: stage-changed-files.sh <outdir>}"
max_mb="${MAX_FILE_MB:-50}"

base="${BASE_SHA:-}"
if [ -z "$base" ]; then
  base="$(git merge-base origin/main HEAD 2>/dev/null || true)"
fi
if [ -z "$base" ]; then
  git fetch origin main --depth=200 >/dev/null 2>&1 || true
  base="$(git merge-base origin/main HEAD 2>/dev/null || true)"
fi
if [ -z "$base" ]; then
  echo "stage-changed-files: cannot find the PR base (no origin/main merge-base). Failing closed: a scan that cannot see the change must not pass." >&2
  exit 2
fi

rm -rf "$out"
mkdir -p "$out"
count=0
while IFS= read -r -d '' f; do
  [ -f "$f" ] || continue
  [ -L "$f" ] && continue
  size_mb=$(( ($(stat -c %s "$f") + 1048575) / 1048576 ))
  if [ "$size_mb" -gt "$max_mb" ]; then
    echo "stage-changed-files: skipping $f (${size_mb} MB > ${max_mb} MB limit)" >&2
    continue
  fi
  mkdir -p "$out/$(dirname "$f")"
  cp -- "$f" "$out/$f"
  count=$((count + 1))
done < <(git diff --name-only -z --diff-filter=ACMR "$base" HEAD)
echo "staged $count file(s) from $base"
