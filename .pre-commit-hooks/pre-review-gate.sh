#!/usr/bin/env bash
# Local pre-review commit gate.
# Fence-aware markdown auto-fix, markdownlint via repo config, YAML/JSON validation,
# non-blocking secret warning. Blocking checks exit non-zero.
#
# Usage:
#   pre-review-gate.sh            # act on staged files
#   pre-review-gate.sh FILE...    # act on explicit files (for tests)
set -u

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT" || exit 1

RED=$'\033[31m'; YEL=$'\033[33m'; GRN=$'\033[32m'; RST=$'\033[0m'
BLOCK=0

list_files() {
  if [ "$#" -gt 0 ]; then
    printf '%s\n' "$@"
  else
    git diff --cached --name-only --diff-filter=ACMR
  fi
}

filter_ext() {
  local ext="$1"; shift
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    [ -f "$f" ] || continue
    case "$f" in *."$ext") echo "$f";; esac
  done
}

mapfile -t ALL_FILES < <(list_files "$@")
mapfile -t MD_FILES  < <(printf '%s\n' "${ALL_FILES[@]}" | filter_ext md)
mapfile -t YAML_FILES < <(printf '%s\n' "${ALL_FILES[@]}" | filter_ext yml; printf '%s\n' "${ALL_FILES[@]}" | filter_ext yaml)
mapfile -t JSON_FILES < <(printf '%s\n' "${ALL_FILES[@]}" | filter_ext json)

# ---- Markdown auto-fix (fence-aware) ----
md_autofix() {
  local f="$1"
  [ -f "$f" ] || return 0
  python3 - "$f" <<'PY'
import re, sys
p = sys.argv[1]
try:
    with open(p, 'r', encoding='utf-8') as fh: src = fh.read()
except Exception: sys.exit(0)
lines = src.split('\n')
out = []
in_fence = False
fence_re = re.compile(r'^\s*(```|~~~)')
url_re = re.compile(r'(?<![<\(\["\'`])(https?://[^\s<>\]\)`]+)(?![>\]\)])')
for ln in lines:
    if fence_re.match(ln):
        in_fence = not in_fence
        out.append(ln); continue
    if in_fence:
        out.append(ln); continue
    # Skip lines that look like markdown links/images or already-wrapped
    fixed = url_re.sub(lambda m: f"<{m.group(1)}>", ln)
    out.append(fixed)
# Collapse 3+ blank lines to 1
collapsed = []
blank = 0
for ln in out:
    if ln.strip() == '':
        blank += 1
        if blank <= 1: collapsed.append(ln)
    else:
        blank = 0; collapsed.append(ln)
new = '\n'.join(collapsed)
if new != src:
    with open(p, 'w', encoding='utf-8') as fh: fh.write(new)
PY
}

if [ "${#MD_FILES[@]}" -gt 0 ]; then
  echo "→ markdown auto-fix"
  for f in "${MD_FILES[@]}"; do md_autofix "$f"; done
  # Re-stage if operating on staged files (no explicit args)
  if [ "$#" -eq 0 ]; then git add -- "${MD_FILES[@]}" 2>/dev/null || true; fi
  # markdownlint via repo config, if available
  if [ -f "$REPO_ROOT/node_modules/.bin/markdownlint-cli2" ]; then
    if ! "$REPO_ROOT/node_modules/.bin/markdownlint-cli2" "${MD_FILES[@]}"; then
      echo "${RED}✗ markdownlint failed${RST}"; BLOCK=1
    fi
  fi
fi

# ---- YAML validation with duplicate-key detection ----
yaml_check() {
  local f="$1"
  python3 - "$f" <<'PY'
import sys
try:
    import yaml
except ImportError:
    sys.exit(0)  # not installed → skip silently
p = sys.argv[1]
try:
    with open(p, 'r', encoding='utf-8') as fh: text = fh.read()
except Exception as e:
    print(f"cannot read {p}: {e}"); sys.exit(2)

class DupSafeLoader(yaml.SafeLoader): pass
def _no_dup(loader, node, deep=False):
    mapping = {}
    for k_node, v_node in node.value:
        key = loader.construct_object(k_node, deep=deep)
        if key in mapping:
            line = k_node.start_mark.line + 1
            raise yaml.constructor.ConstructorError(
                None, None,
                f"duplicate key {key!r} (line {line})",
                k_node.start_mark)
        mapping[key] = loader.construct_object(v_node, deep=deep)
    return mapping
DupSafeLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _no_dup)
try:
    list(yaml.load_all(text, Loader=DupSafeLoader))
except yaml.YAMLError as e:
    print(str(e)); sys.exit(2)
PY
}
if [ "${#YAML_FILES[@]}" -gt 0 ]; then
  echo "→ yaml validate"
  for f in "${YAML_FILES[@]}"; do
    if ! out=$(yaml_check "$f" 2>&1); then
      echo "${RED}✗ $f${RST}"; echo "$out"; BLOCK=1
    fi
  done
fi

# ---- JSON validation ----
if [ "${#JSON_FILES[@]}" -gt 0 ]; then
  echo "→ json validate"
  for f in "${JSON_FILES[@]}"; do
    if ! python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$f" 2>err.log; then
      echo "${RED}✗ $f${RST}"; cat err.log; rm -f err.log; BLOCK=1
    fi
  done
  rm -f err.log
fi

# ---- Non-blocking secret warning ----
if [ "${#ALL_FILES[@]}" -gt 0 ]; then
  secret_pat='(AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{20,})'
  hit=0
  for f in "${ALL_FILES[@]}"; do
    [ -f "$f" ] || continue
    if grep -EnI "$secret_pat" "$f" >/dev/null 2>&1; then
      echo "${YEL}⚠ possible secret in $f${RST}"; hit=1
    fi
  done
  [ $hit -eq 0 ] || echo "${YEL}(secret warnings are non-blocking; review before pushing)${RST}"
fi

if [ $BLOCK -ne 0 ]; then
  echo "${RED}pre-review-gate: BLOCKED${RST}"
  exit 1
fi
echo "${GRN}pre-review-gate: OK${RST}"
exit 0
