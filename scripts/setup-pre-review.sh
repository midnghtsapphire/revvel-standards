#!/usr/bin/env bash
# Install the pre-review commit gate, chaining any existing wr/memory JSONL gate.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

HOOK_DIR="$REPO_ROOT/.git/hooks"
HOOK="$HOOK_DIR/pre-commit"
GATE="$REPO_ROOT/.pre-commit-hooks/pre-review-gate.sh"
JSONL_GATE="$REPO_ROOT/.pre-commit-hooks/wr-jsonl-gate.sh"

mkdir -p "$HOOK_DIR"
chmod +x "$GATE" 2>/dev/null || true

# Back up any existing non-managed hook.
if [ -f "$HOOK" ] && ! grep -q 'pre-review-gate.sh' "$HOOK" 2>/dev/null; then
  cp "$HOOK" "$HOOK.bak.$(date +%s 2>/dev/null || echo backup)"
  echo "Backed up existing pre-commit hook."
fi

cat > "$HOOK" <<'EOF'
#!/usr/bin/env bash
# Managed by scripts/setup-pre-review.sh — chains pre-review + JSONL gates.
set -u
REPO_ROOT="$(git rev-parse --show-toplevel)"

rc=0
# 1. pre-review gate (blocking)
if [ -f "$REPO_ROOT/.pre-commit-hooks/pre-review-gate.sh" ]; then
  bash "$REPO_ROOT/.pre-commit-hooks/pre-review-gate.sh" || rc=$?
fi
[ $rc -ne 0 ] && exit $rc

# 2. wr/memory JSONL gate (blocking, if present)
if [ -f "$REPO_ROOT/.pre-commit-hooks/wr-jsonl-gate.sh" ]; then
  bash "$REPO_ROOT/.pre-commit-hooks/wr-jsonl-gate.sh" || rc=$?
fi
exit $rc
EOF
chmod +x "$HOOK"
echo "Installed $HOOK"
[ -f "$JSONL_GATE" ] && echo "Chained JSONL gate detected: $JSONL_GATE"
