#!/usr/bin/env bash
# pre-review-gate.sh — fast local commit gate.
#
# Rules:
#   - Blocking checks exit non-zero and abort the commit.
#   - Advisory checks (secrets) print a warning but never block.
#   - Reuses repo's own .markdownlint.jsonc — no second config, no CI drift.
#
# Usage:
#   pre-review-gate.sh                # process staged files (git index)
#   pre-review-gate.sh f1 f2 ...      # process explicit files (for tests)
set -u

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT" || exit 0

RED=$'\033[31m'; YEL=$'\033[33m'; GRN=$'\033[32m'; RST=$'\033[0m'
EXIT=0

# ---------- collect files ----------
files=()
if [ "$#" -gt 0 ]; then
  for f in "$@"; do files+=("$f"); done
else
  # staged (added / copied / modified), NUL-safe
  while IFS= read -r -d '' f; do files+=("$f"); done < <(git diff --cached --name-only --diff-filter=ACM -z 2>/dev/null || true)
fi

[ "${#files[@]}" -eq 0 ] && exit 0

is_md()   { case "$1" in *.md|*.markdown) return 0 ;; esac; return 1; }
is_yaml() { case "$1" in *.yml|*.yaml)    return 0 ;; esac; return 1; }
is_json() { case "$1" in *.json)          return 0 ;; esac; return 1; }

# ---------- fence-aware markdown auto-fix ----------
# - bare URL on its own line → <url>  (fix MD034) — but never inside ``` fences.
# - collapse 3+ blank lines to 1.
md_autofix_py() {
  python3 - "$1" <<'PY'
import sys, re, io
path = sys.argv[1]
try:
    with io.open(path, 'r', encoding='utf-8') as f:
        src = f.read()
except Exception:
    sys.exit(0)
lines = src.split('\n')
out = []
in_fence = False
fence_re = re.compile(r'^\s*```')
bare_url_re = re.compile(r'^(\s*)(https?://\S+)\s*$')
link_re = re.compile(r'[\[\(<]')  # if a URL line already has [ ( < near it, skip
for ln in lines:
    if fence_re.match(ln):
        in_fence = not in_fence
        out.append(ln)
        continue
    if not in_fence:
        m = bare_url_re.match(ln)
        if m and not link_re.search(ln):
            ln = f"{m.group(1)}<{m.group(2)}>"
    out.append(ln)
# collapse 3+ consecutive blank lines
result = []
blank = 0
for ln in out:
    if ln.strip() == '':
        blank += 1
        if blank <= 1:
            result.append(ln)
    else:
        blank = 0
        result.append(ln)
new_src = '\n'.join(result)
if new_src != src:
    with io.open(path, 'w', encoding='utf-8') as f:
        f.write(new_src)
PY
}

for f in "${files[@]}"; do
  [ -f "$f" ] || continue
  if is_md "$f"; then
    if command -v python3 >/dev/null 2>&1; then
      md_autofix_py "$f"
      # re-stage if we were called from a real hook (no positional args)
      if [ "$#" -eq 0 ]; then git add -- "$f" 2>/dev/null || true; fi
    fi
  fi
done

# ---------- markdownlint (reuse repo config) ----------
md_files=()
for f in "${files[@]}"; do [ -f "$f" ] && is_md "$f" && md_files+=("$f"); done
if [ "${#md_files[@]}" -gt 0 ]; then
  cfg=""
  [ -f "$REPO_ROOT/.markdownlint.jsonc" ] && cfg="$REPO_ROOT/.markdownlint.jsonc"
  [ -z "$cfg" ] && [ -f "$REPO_ROOT/.markdownlint.json" ] && cfg="$REPO_ROOT/.markdownlint.json"
  bin=""
  if [ -x "$REPO_ROOT/node_modules/.bin/markdownlint-cli2" ]; then
    bin="$REPO_ROOT/node_modules/.bin/markdownlint-cli2"
  elif command -v markdownlint-cli2 >/dev/null 2>&1; then
    bin="markdownlint-cli2"
  fi
  if [ -n "$bin" ]; then
    args=()
    [ -n "$cfg" ] && args+=("--config" "$cfg")
    if ! "$bin" "${args[@]}" "${md_files[@]}"; then
      echo "${RED}✗ markdownlint failed${RST}" >&2
      EXIT=1
    fi
  fi
fi

# ---------- YAML validation w/ duplicate-key detection ----------
yaml_files=()
for f in "${files[@]}"; do [ -f "$f" ] && is_yaml "$f" && yaml_files+=("$f"); done
if [ "${#yaml_files[@]}" -gt 0 ] && command -v python3 >/dev/null 2>&1; then
  for f in "${yaml_files[@]}"; do
    python3 - "$f" <<'PY'
import sys
try:
    import yaml
except Exception:
    sys.exit(0)  # yaml module unavailable → skip silently
path = sys.argv[1]

class StrictLoader(yaml.SafeLoader):
    pass

def _no_duplicates(loader, node, deep=False):
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in mapping:
            raise yaml.constructor.ConstructorError(
                'while constructing a mapping', node.start_mark,
                f"duplicate key {key!r} (line {key_node.start_mark.line + 1})",
                key_node.start_mark)
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping

StrictLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _no_duplicates)

try:
    with open(path, 'r', encoding='utf-8') as fh:
        list(yaml.load_all(fh, Loader=StrictLoader))
except yaml.YAMLError as e:
    print(f"YAML error in {path}: {e}", file=sys.stderr)
    sys.exit(2)
PY
    rc=$?
    if [ $rc -eq 2 ]; then
      echo "${RED}✗ YAML invalid: $f${RST}" >&2
      EXIT=1
    fi
  done
fi

# ---------- JSON validation ----------
for f in "${files[@]}"; do
  [ -f "$f" ] || continue
  is_json "$f" || continue
  if command -v python3 >/dev/null 2>&1; then
    if ! python3 -c "import json,sys; json.load(open(sys.argv[1], encoding='utf-8'))" "$f" 2>/tmp/_prg_json_err; then
      echo "${RED}✗ JSON invalid: $f${RST}" >&2
      cat /tmp/_prg_json_err >&2 || true
      EXIT=1
    fi
  fi
done

# ---------- secret warning (advisory, never blocks) ----------
secret_patterns='(AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|ghp_[0-9A-Za-z]{36}|gho_[0-9A-Za-z]{36}|sk-[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)'
for f in "${files[@]}"; do
  [ -f "$f" ] || continue
  if grep -EIn "$secret_patterns" "$f" >/dev/null 2>&1; then
    echo "${YEL}⚠ possible secret pattern in $f (advisory, not blocking)${RST}" >&2
  fi
done

if [ $EXIT -eq 0 ]; then
  echo "${GRN}✓ pre-review-gate passed${RST}"
fi
exit $EXIT
