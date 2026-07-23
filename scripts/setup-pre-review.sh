#!/usr/bin/env bash
# Install the pre-review gate as a git pre-commit hook, chaining any
# pre-existing wr/memory JSONL gate.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

HOOK_DIR="$(git rev-parse --git-path hooks)"
HOOK="$HOOK_DIR/pre-commit"
GATE=".pre-commit-hooks/pre-review-gate.sh"
JSONL_GATE=".pre-commit-hooks/wr-memory-gate.sh"

mkdir -p "$HOOK_DIR"

# Back up an existing unrelated hook once.
if [ -f "$HOOK" ] && ! grep -q 'pre-review-gate.sh' "$HOOK" 2>/dev/null; then
  cp "$HOOK" "$HOOK.bak.$(date +%s 2>/dev/null || echo backup)"
  echo "backed up existing pre-commit hook to $HOOK.bak.*"
fi

cat > "$HOOK" <<'HOOKEOF'
#!/usr/bin/env bash
# Chained pre-commit: pre-review gate + optional wr/memory JSONL gate.
# Invoke scripts via bash so checked-in file modes cannot break the hook.
set -uo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"
RC=0

if [ -f "$REPO_ROOT/.pre-commit-hooks/pre-review-gate.sh" ]; then
  bash "$REPO_ROOT/.pre-commit-hooks/pre-review-gate.sh" || RC=$?
  [ "$RC" -ne 0 ] && exit "$RC"
fi

if [ -f "$REPO_ROOT/.pre-commit-hooks/validate-memory-jsonl.sh" ]; then
  bash "$REPO_ROOT/.pre-commit-hooks/validate-memory-jsonl.sh" || RC=$?
  [ "$RC" -ne 0 ] && exit "$RC"
fi

exit 0
HOOKEOF

chmod +x "$HOOK"
chmod +x "$GATE" 2>/dev/null || true
[ -f "$JSONL_GATE" ] && chmod +x "$JSONL_GATE" 2>/dev/null || true

echo "pre-review gate installed at $HOOK"
