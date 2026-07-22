#!/usr/bin/env bash
# setup-pre-review.sh — installs .git/hooks/pre-commit that chains:
#   1. .pre-commit-hooks/pre-review-gate.sh   (this repo's gate)
#   2. .pre-commit-hooks/wr-jsonl-gate.sh     (pre-existing, optional)
#
# Any unrelated existing pre-commit hook is backed up to pre-commit.bak-<timestamp>.

set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

HOOK=".git/hooks/pre-commit"
GATE=".pre-commit-hooks/pre-review-gate.sh"
JSONL=".pre-commit-hooks/wr-jsonl-gate.sh"

if [ ! -f "$GATE" ]; then
  echo "error: $GATE not found" >&2
  exit 1
fi
chmod +x "$GATE" 2>/dev/null || true

mkdir -p .git/hooks

# Back up existing hook if it isn't already our wrapper
if [ -f "$HOOK" ] && ! grep -q 'pre-review-gate.sh' "$HOOK" 2>/dev/null; then
  ts="$(date +%Y%m%d-%H%M%S)"
  mv "$HOOK" "${HOOK}.bak-${ts}"
  echo "backed up existing hook to ${HOOK}.bak-${ts}"
fi

cat > "$HOOK" <<'HOOK_EOF'
#!/usr/bin/env bash
# Chained pre-commit wrapper — invoke each gate via bash so on-disk mode can't break us.
set -e
REPO_ROOT="$(git rev-parse --show-toplevel)"
if [ -f "$REPO_ROOT/.pre-commit-hooks/pre-review-gate.sh" ]; then
  bash "$REPO_ROOT/.pre-commit-hooks/pre-review-gate.sh"
fi
if [ -f "$REPO_ROOT/.pre-commit-hooks/wr-jsonl-gate.sh" ]; then
  bash "$REPO_ROOT/.pre-commit-hooks/wr-jsonl-gate.sh"
fi
HOOK_EOF

chmod +x "$HOOK"
echo "installed $HOOK"
echo "  → chains: pre-review-gate.sh${JSONL:+ + wr-jsonl-gate.sh (if present)}"
