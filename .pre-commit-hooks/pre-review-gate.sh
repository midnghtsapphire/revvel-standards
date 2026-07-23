#!/usr/bin/env bash
# Local pre-review commit gate.
# Auto-fixes and validates staged files before every commit.
#
# Usage:
#   .pre-commit-hooks/pre-review-gate.sh                # gate staged files
#   .pre-commit-hooks/pre-review-gate.sh path1 path2    # gate explicit files (for tests)
#
# Exits non-zero on blocking failures (markdown lint, YAML/JSON syntax).
# Warns (non-blocking) on suspected secrets.
set -u

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT" || exit 0

# ---------- Collect files ----------
if [ "$#" -gt 0 ]; then
  FILES=("$@")
else
  # Staged files (added, copied, modified, renamed).
  mapfile -t FILES < <(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null || true)
fi

if [ "${#FILES[@]}" -eq 0 ]; then
  exit 0
fi

filter_ext() {
  local ext="$1"
  local f
  for f in "${FILES[@]}"; do
    [ -f "$f" ] || continue
    case "$f" in *."$ext") echo "$f" ;; esac
  done
}

MD_FILES=()
while IFS= read -r f; do [ -n "$f" ] && MD_FILES+=("$f"); done < <(filter_ext md)
YAML_FILES=()
while IFS= read -r f; do [ -n "$f" ] && YAML_FILES+=("$f"); done < <(filter_ext yml; filter_ext yaml)
JSON_FILES=()
while IFS= read -r f; do [ -n "$f" ] && JSON_FILES+=("$f"); done < <(filter_ext json)

BLOCKING_FAIL=0

# ---------- Markdown: fence-aware auto-fix ----------
# 1. Wrap bare URLs in <...> (MD034) — skip inside fenced code blocks and inside existing links/images/angle-bracket URLs.
# 2. Collapse duplicate blank lines.
md_autofix() {
  local file="$1"
  python3 - "$file" <<'PY'
import re, sys
path = sys.argv[1]
try:
    with open(path, 'r', encoding='utf-8') as fh:
        src = fh.read()
except Exception:
    sys.exit(0)

lines = src.split('\n')
out = []
in_fence = False
fence_re = re.compile(r'^\s*(```|~~~)')
# Bare-URL match — must not be preceded by ]( or < or =" (attribute), and not followed by ) or > or "
url_re = re.compile(r'(?<![\(<="\'\[])\b(https?://[^\s<>\)\]\"\']+)')
for line in lines:
    if fence_re.match(line):
        in_fence = not in_fence
        out.append(line)
        continue
    if in_fence:
        out.append(line)
        continue
    # Skip lines that look like they already have a markdown link containing a URL
    # (we still wrap bare ones with the regex which excludes ]( context).
    fixed = url_re.sub(lambda m: '<' + m.group(1) + '>', line)
    out.append(fixed)

# Collapse runs of >1 blank line to a single blank outside fenced code blocks.
collapsed = []
blank_run = 0
in_fence = False
for line in out:
    if fence_re.match(line):
        in_fence = not in_fence
        blank_run = 0
        collapsed.append(line)
    elif in_fence:
        collapsed.append(line)
    elif line.strip() == '':
        blank_run += 1
        if blank_run <= 1:
            collapsed.append(line)
    else:
        blank_run = 0
        collapsed.append(line)

result = '\n'.join(collapsed)
if result != src:
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(result)
PY
}

if [ "${#MD_FILES[@]}" -gt 0 ] && command -v python3 >/dev/null 2>&1; then
  for f in "${MD_FILES[@]}"; do
    md_autofix "$f"
    # Re-stage if we're running against staged files (no explicit args)
    if [ "$#" -eq 0 ]; then
      git add "$f" 2>/dev/null || true
    fi
  done
fi

# ---------- Markdown lint (uses repo's .markdownlint.jsonc) ----------
run_markdownlint() {
  local bin=""
  if [ -x "node_modules/.bin/markdownlint-cli2" ]; then
    bin="node_modules/.bin/markdownlint-cli2"
  elif command -v markdownlint-cli2 >/dev/null 2>&1; then
    bin="markdownlint-cli2"
  else
    echo "[pre-review] markdownlint-cli2 not installed — skipping markdown lint"
    return 0
  fi
  local cfg=""
  [ -f ".markdownlint.jsonc" ] && cfg=".markdownlint.jsonc"
  [ -z "$cfg" ] && [ -f ".markdownlint.json" ] && cfg=".markdownlint.json"
  if [ -n "$cfg" ]; then
    "$bin" --config "$cfg" "${MD_FILES[@]}" || return 1
  else
    "$bin" "${MD_FILES[@]}" || return 1
  fi
}

if [ "${#MD_FILES[@]}" -gt 0 ]; then
  if ! run_markdownlint; then
    echo "[pre-review] ✗ markdown lint failed"
    BLOCKING_FAIL=1
  fi
fi

# ---------- YAML validation with duplicate-key detection ----------
validate_yaml() {
  python3 - "$@" <<'PY'
import sys
try:
    import yaml
except ImportError:
    print('[pre-review] PyYAML is required for YAML validation', file=sys.stderr)
    sys.exit(1)

class StrictLoader(yaml.SafeLoader):
    pass

def _no_duplicates(loader, node, deep=False):
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in mapping:
            raise yaml.constructor.ConstructorError(
                None, None,
                f"duplicate key {key!r} (line {key_node.start_mark.line + 1})",
                key_node.start_mark)
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping

StrictLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _no_duplicates)

failed = 0
for path in sys.argv[1:]:
    try:
        with open(path, 'r', encoding='utf-8') as fh:
            list(yaml.load_all(fh, Loader=StrictLoader))
    except FileNotFoundError:
        continue
    except Exception as e:
        print(f'[pre-review] ✗ YAML {path}: {e}', file=sys.stderr)
        failed += 1
sys.exit(1 if failed else 0)
PY
}

if [ "${#YAML_FILES[@]}" -gt 0 ] && command -v python3 >/dev/null 2>&1; then
  if ! validate_yaml "${YAML_FILES[@]}"; then
    BLOCKING_FAIL=1
  fi
fi

# ---------- JSON validation ----------
validate_json() {
  python3 - "$@" <<'PY'
import json, sys
failed = 0
for path in sys.argv[1:]:
    try:
        with open(path, 'r', encoding='utf-8') as fh:
            src = fh.read()
        # Allow JSONC (.jsonc) — strip line/block comments before parse
        if path.endswith('.jsonc'):
            import re
            src = re.sub(r'//[^\n]*', '', src)
            src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
        json.loads(src)
    except FileNotFoundError:
        continue
    except Exception as e:
        print(f'[pre-review] ✗ JSON {path}: {e}', file=sys.stderr)
        failed += 1
sys.exit(1 if failed else 0)
PY
}

if [ "${#JSON_FILES[@]}" -gt 0 ] && command -v python3 >/dev/null 2>&1; then
  if ! validate_json "${JSON_FILES[@]}"; then
    BLOCKING_FAIL=1
  fi
fi

# ---------- Optional: prettier / eslint (only if installed locally) ----------
if [ -x "node_modules/.bin/prettier" ]; then
  # Non-blocking format check
  node_modules/.bin/prettier --check "${FILES[@]}" >/dev/null 2>&1 || echo "[pre-review] ⚠ prettier: some files not formatted (non-blocking)"
fi

# ---------- Secret warning (non-blocking) ----------
SECRET_PATTERNS='(AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN (RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY-----)'
for f in "${FILES[@]}"; do
  [ -f "$f" ] || continue
  if grep -EIn "$SECRET_PATTERNS" "$f" >/dev/null 2>&1; then
    echo "[pre-review] ⚠ possible secret in $f — please review (non-blocking)"
  fi
done

if [ "$BLOCKING_FAIL" -ne 0 ]; then
  echo ""
  echo "[pre-review] Commit blocked. Fix errors above and re-stage."
  exit 1
fi

exit 0
