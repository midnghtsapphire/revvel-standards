#!/usr/bin/env bash
# Install .git/hooks/pre-commit as a chain: pre-review gate + pre-existing JSONL gate.
# Idempotent. Backs up unrelated existing hooks.
set -eu

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

HOOK=".git/hooks/pre-commit"
GATE=".pre-commit-hooks/pre-review-gate.sh"
JSONL_GATE=".pre-commit-hooks/wr-memory-jsonl.sh"

if [ ! -f "$GATE" ]; then
  echo "error: $GATE missing" >&2
  exit 1
fi
chmod +x "$GATE"

# Back up unrelated existing hook
if [ -f "$HOOK" ] && ! grep -q 'PRE-REVIEW GATE INSTALLED' "$HOOK" 2>/dev/null; then
  cp "$HOOK" "$HOOK.bak.$(date -u +%Y%m%dT%H%M%SZ 2>/dev/null || echo backup)"
  echo "backed up existing $HOOK"
fi

cat > "$HOOK" <<'HOOK'
#!/usr/bin/env bash
# PRE-REVIEW GATE INSTALLED — managed by scripts/setup-pre-review.sh
set -u
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

STATUS=0

if [ -f .pre-commit-hooks/pre-review-gate.sh ]; then
  bash .pre-commit-hooks/pre-review-gate.sh || STATUS=$?
fi

if [ "$STATUS" -ne 0 ]; then
  exit "$STATUS"
fi

if [ -f .pre-commit-hooks/wr-memory-jsonl.sh ]; then
  bash .pre-commit-hooks/wr-memory-jsonl.sh || STATUS=$?
fi

exit "$STATUS"
HOOK

chmod +x "$HOOK"
echo "installed $HOOK (pre-review gate + JSONL gate chain)"
