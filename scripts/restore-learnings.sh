#!/usr/bin/env bash
# restore-learnings.sh — repair corrupted learnings.md from a known-good source.
#
# Context: 2026-07-14 audit found learnings.md corrupted to 1.9KB on audit branch.
# Main branch is untouched. This script restores from main (or a specified ref)
# and verifies via byte-count + sha256.
#
# Usage:
#   scripts/restore-learnings.sh                 # restore from origin/main
#   scripts/restore-learnings.sh <ref>           # restore from <ref>
#   scripts/restore-learnings.sh --verify-only   # just print current size + sha

set -euo pipefail

TARGET="learnings.md"
REF="${1:-origin/main}"

if [[ "${1:-}" == "--verify-only" ]]; then
  if [[ -f "$TARGET" ]]; then
    size=$(wc -c <"$TARGET" | tr -d ' ')
    sha=$(sha256sum "$TARGET" | awk '{print $1}')
    echo "file:   $TARGET"
    echo "size:   $size bytes"
    echo "sha256: $sha"
  else
    echo "missing: $TARGET" >&2
    exit 1
  fi
  exit 0
fi

echo "[restore-learnings] fetching latest refs..."
git fetch --quiet origin || true

if ! git rev-parse --verify "$REF" >/dev/null 2>&1; then
  echo "error: ref '$REF' not found" >&2
  exit 2
fi

echo "[restore-learnings] restoring $TARGET from $REF"
git show "$REF:$TARGET" >"$TARGET.restore.tmp"

src_size=$(wc -c <"$TARGET.restore.tmp" | tr -d ' ')
if (( src_size < 10000 )); then
  echo "error: source $REF:$TARGET is only $src_size bytes — refusing restore" >&2
  rm -f "$TARGET.restore.tmp"
  exit 3
fi

mv "$TARGET.restore.tmp" "$TARGET"

new_size=$(wc -c <"$TARGET" | tr -d ' ')
new_sha=$(sha256sum "$TARGET" | awk '{print $1}')
echo "[restore-learnings] done"
echo "  size:   $new_size bytes"
echo "  sha256: $new_sha"
echo
echo "Next: append audit-2026-07-14 learnings via wr/memory/learnings-append-2026-07-14.md"
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
