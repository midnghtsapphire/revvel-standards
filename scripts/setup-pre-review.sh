#!/usr/bin/env bash
# Install the pre-review gate as the git pre-commit hook.
# Chains (does not replace) the existing wr/memory JSONL hook if present.
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

hook_dir="$(git rev-parse --git-path hooks)"
mkdir -p "$hook_dir"
target="$hook_dir/pre-commit"

gate=".pre-commit-hooks/pre-review-gate.sh"
jsonl_gate=".pre-commit-hooks/jsonl-gate.sh"  # optional pre-existing gate

if [ -f "$target" ] && ! grep -q 'PRE_REVIEW_GATE_INSTALLED' "$target" 2>/dev/null; then
  backup="$target.backup.$(date +%s 2>/dev/null || echo bak)"
  cp "$target" "$backup"
  echo "Backed up existing pre-commit to $backup"
fi

cat > "$target" <<EOF
#!/usr/bin/env bash
# PRE_REVIEW_GATE_INSTALLED
# Chained pre-commit: pre-review gate → JSONL gate (if present).
set -u
fail=0
if [ -f "$gate" ]; then
  bash "$gate" || fail=1
fi
if [ -f "$jsonl_gate" ]; then
  bash "$jsonl_gate" || fail=1
fi
exit "\$fail"
EOF

chmod +x "$target"
chmod +x "$gate" 2>/dev/null || true
echo "Installed pre-commit hook at $target"
