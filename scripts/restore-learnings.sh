#!/usr/bin/env bash
# restore-learnings.sh — one-shot repair for learnings.md (audit 2026-07-14)
# Context: a Zapier whole-file write replaced learnings.md with a single entry,
# losing the GOAP header and all history ON THIS BRANCH ONLY (main untouched).
# The full pre-edit content is preserved in git at blob 58bb597a417c3b8afe594ee7af3b07e7bd0e2e65.
# This script restores it and appends the audit entry atomically, per the log's own write rules.
set -euo pipefail

BLOB="58bb597a417c3b8afe594ee7af3b07e7bd0e2e65"
ENTRY_FILE="wr/memory/learnings-append-2026-07-14.md"
TARGET="learnings.md"
TMP="learnings.tmp"

# 1. Restore full pre-edit content from the content-addressed blob
git cat-file -p "$BLOB" > "$TMP"

# 2. Append the audit entry (atomic: write temp, then move — per the log's header rules)
if [ -f "$ENTRY_FILE" ]; then
  printf '\n' >> "$TMP"
  cat "$ENTRY_FILE" >> "$TMP"
fi

# 3. Sanity: header + history must be present before we overwrite anything
grep -q '^# Goap Agent Memory' "$TMP"
grep -q '2026-07-13' "$TMP"
grep -q 'Audits decay' "$TMP"

mv "$TMP" "$TARGET"
echo "learnings.md restored: $(wc -c < "$TARGET") bytes"
