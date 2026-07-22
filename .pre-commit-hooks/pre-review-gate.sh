#!/usr/bin/env bash
# pre-review-gate.sh — auto-fix + validate staged files before commit.
# Blocking checks exit non-zero. Non-blocking warnings print but return 0.
# Accepts explicit file args for testing; otherwise uses git staged files.
set -u

RED=$'\033[0;31m'; YEL=$'\033[1;33m'; GRN=$'\033[0;32m'; NC=$'\033[0m'
ERR=0
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

if [ "$#" -gt 0 ]; then
  FILES=("$@")
else
  mapfile -t FILES < <(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null || true)
fi

[ "${#FILES[@]}" -eq 0 ] && exit 0

# ------------------------------------------------------------------
# Markdown: fence-aware auto-fix + lint
# ------------------------------------------------------------------
fix_markdown() {
  local f="$1"
  [ -f "$f" ] || return 0
  python3 - "$f" <<'PY'
import re, sys
p = sys.argv[1]
try:
    with open(p, 'r', encoding='utf-8') as fh:
        src = fh.read()
except Exception:
    sys.exit(0)

lines = src.split('\n')
out = []
in_fence = False
fence_re = re.compile(r'^\s*(```|~~~)')
# Match a bare URL not already inside <>, [](), or a link.
url_re = re.compile(r'(?<![\(<\[\w`"\'/])(https?://[^\s<>\)\]`]+)')
for ln in lines:
    if fence_re.match(ln):
        in_fence = not in_fence
        out.append(ln)
        continue
    if in_fence:
        out.append(ln)
        continue
    # inline code spans: skip lines that are entirely inside code (naive but safe)
    # replace bare URLs → <url>
    new = url_re.sub(r'<\1>', ln)
    out.append(new)

# collapse >1 consecutive blank lines
collapsed = []
blank = 0
for ln in out:
    if ln.strip() == '':
        blank += 1
        if blank <= 1:
            collapsed.append(ln)
    else:
        blank = 0
        collapsed.append(ln)

new_src = '\n'.join(collapsed)
if new_src != src:
    with open(p, 'w', encoding='utf-8') as fh:
        fh.write(new_src)
PY
}

lint_markdown() {
  local f="$1"
  local cfg="$REPO_ROOT/.markdownlint.jsonc"
  local cli="$REPO_ROOT/node_modules/.bin/markdownlint-cli2"
  if [ -x "$cli" ]; then
    if [ -f "$cfg" ]; then
      "$cli" --config "$cfg" "$f" || return 1
    else
      "$cli" "$f" || return 1
    fi
  fi
  return 0
}

# ------------------------------------------------------------------
# YAML with real duplicate-key detection
# ------------------------------------------------------------------
validate_yaml() {
  local f="$1"
  python3 - "$f" <<'PY'
import sys
try:
    import yaml
except ImportError:
    sys.exit(0)  # PyYAML not installed → skip silently

p = sys.argv[1]
try:
    with open(p, 'r', encoding='utf-8') as fh:
        text = fh.read()
except Exception as e:
    print(f"YAML read error: {e}", file=sys.stderr); sys.exit(1)

class DupCheckLoader(yaml.SafeLoader):
    pass

def _mapping(loader, node, deep=False):
    mapping = {}
    for k_node, v_node in node.value:
        key = loader.construct_object(k_node, deep=deep)
        if key in mapping:
            raise yaml.constructor.ConstructorError(
                None, None,
                f"duplicate key {key!r} (line {k_node.start_mark.line + 1})",
                k_node.start_mark)
        mapping[key] = loader.construct_object(v_node, deep=deep)
    return mapping

DupCheckLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _mapping)

try:
    list(yaml.load_all(text, Loader=DupCheckLoader))
except yaml.YAMLError as e:
    print(f"YAML error in {p}: {e}", file=sys.stderr); sys.exit(1)
PY
}

validate_json() {
  local f="$1"
  python3 -c "import json,sys; json.load(open(sys.argv[1], encoding='utf-8'))" "$f" 2>&1
}

# ------------------------------------------------------------------
# Non-blocking secret warning
# ------------------------------------------------------------------
warn_secrets() {
  local f="$1"
  [ -f "$f" ] || return 0
  if grep -InE '(AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{20,})' "$f" >/dev/null 2>&1; then
    printf "%b" "${YEL}⚠ possible secret in $f (not blocking)${NC}\n" >&2
  fi
}

for f in "${FILES[@]}"; do
  [ -f "$f" ] || continue
  case "$f" in
    *.md|*.markdown)
      fix_markdown "$f"
      if ! lint_markdown "$f"; then
        printf "%b" "${RED}✗ markdown lint failed: $f${NC}\n" >&2; ERR=1
      fi
      # re-stage after auto-fix
      git add "$f" 2>/dev/null || true
      ;;
    *.yml|*.yaml)
      if ! validate_yaml "$f"; then
        printf "%b" "${RED}✗ YAML invalid: $f${NC}\n" >&2; ERR=1
      fi
      ;;
    *.json|*.jsonc)
      # jsonc allows comments; skip strict for .jsonc
      case "$f" in
        *.jsonc) ;;
        *)
          if ! validate_json "$f" >/dev/null 2>&1; then
            msg=$(validate_json "$f" 2>&1 || true)
            printf "%b" "${RED}✗ JSON invalid: $f — $msg${NC}\n" >&2; ERR=1
          fi
          ;;
      esac
      ;;
  esac
  warn_secrets "$f"
done

if [ "$ERR" -eq 0 ]; then
  printf "%b" "${GRN}✓ pre-review-gate passed${NC}\n"
fi
exit "$ERR"
