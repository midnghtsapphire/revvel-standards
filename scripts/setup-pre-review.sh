#!/usr/bin/env bash
# One-time installer for the local pre-review gate.
#
# Writes .git/hooks/pre-commit as a thin wrapper that runs the two
# versioned hook scripts in .pre-commit-hooks/ — so hook logic updates
# flow in with normal git pulls, and the existing wr/memory JSONL gate
# keeps running alongside the new pre-review gate.
#
# Usage: bash scripts/setup-pre-review.sh
set -euo pipefail

root=$(git rev-parse --show-toplevel)
# Resolve the hooks dir through git so this works in linked worktrees too,
# where `.git` is a file, not a directory (a hard-coded "$root/.git/hooks"
# fails there).
hooks_dir=$(cd "$root" && git rev-parse --git-path hooks)
case "$hooks_dir" in
  /*) : ;;                       # already absolute
  *) hooks_dir="$root/$hooks_dir" ;;
esac
hook="$hooks_dir/pre-commit"

mkdir -p "$hooks_dir"

if [ -e "$hook" ] && ! grep -q 'pre-review-gate' "$hook" 2>/dev/null; then
  cp "$hook" "$hook.bak"
  echo "setup-pre-review: existing pre-commit hook backed up to $hook.bak"
fi

cat >"$hook" <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
root=$(git rev-parse --show-toplevel)
# invoke via bash so checked-in file modes (missing +x) can't break the hook
bash "$root/.pre-commit-hooks/pre-review-gate.sh"
bash "$root/.pre-commit-hooks/validate-memory-jsonl.sh"
HOOK
chmod +x "$hook" "$root/.pre-commit-hooks/pre-review-gate.sh"

echo "setup-pre-review: ✅ installed"
echo ""
echo "Every git commit now runs, on staged files only:"
echo "  • markdown auto-fix (bare URLs, duplicate blank lines) + markdownlint-cli2"
echo "    using the repo's existing .markdownlint.jsonc (same config as CI)"
echo "  • YAML validation incl. duplicate-key detection (blocks commit)"
echo "  • JSON validation (blocks commit)"
echo "  • optional prettier/eslint --fix when installed in node_modules"
echo "  • secret-pattern warning (non-blocking)"
echo "  • wr/memory JSONL validation (pre-existing gate, still active)"
echo ""
echo "Test it: git add <file> && git commit -m 'test'"
