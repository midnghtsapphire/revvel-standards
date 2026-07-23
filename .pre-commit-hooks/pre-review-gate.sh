#!/usr/bin/env bash
# Local pre-review commit gate.
# Auto-fixes and validates staged files. Blocking checks exit non-zero.
# Usage:
#   pre-review-gate.sh                # scan staged files
#   pre-review-gate.sh file1 file2..  # scan explicit files (for testing)
set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT" || exit 1

if [ "$#" -gt 0 ]; then
  FILES=("$@")
else
  # newline-safe collection of staged files
  mapfile -t FILES < <(git diff --cached --name-only --diff-filter=ACMR)
fi

if [ "${#FILES[@]}" -eq 0 ]; then
  exit 0
fi

EXIT=0
WARN() { printf '\033[33m[pre-review WARN]\033[0m %s\n' "$*" >&2; }
FAIL() { printf '\033[31m[pre-review FAIL]\033[0m %s\n' "$*" >&2; EXIT=1; }
OK()   { printf '\033[32m[pre-review OK]\033[0m %s\n' "$*"; }

# ---- Markdown auto-fix (fence-aware) ----
# Wraps bare http(s):// URLs in <...> for MD034, but skips fenced code blocks
# and existing inline links/autolinks/images.
fix_markdown() {
  local f="$1"
  [ -f "$f" ] || return 0
  python3 - "$f" <<'PY' || return 0
import re, sys, io
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
# Match bare URL not preceded by (, <, ], = or already inside markdown link syntax
url_re = re.compile(r'(?<![\(\<\[\"=/])(https?://[^\s<>\)\]\"]+)')
for ln in lines:
    if fence_re.match(ln):
        in_fence = not in_fence
        out.append(ln)
        continue
    if in_fence or ln.lstrip().startswith('    '):
        out.append(ln)
        continue
    # Skip lines that already contain markdown link/image syntax around URLs
    def repl(m):
        u = m.group(1)
        # don't wrap if immediately preceded by ]( on same line before this match
        return '<' + u + '>'
    # Avoid double-wrapping: check surrounding chars
    def safe_sub(line):
        result = []
        i = 0
        while i < len(line):
            m = url_re.search(line, i)
            if not m:
                result.append(line[i:])
                break
            start, end = m.span(1)
            # Check if inside []() link: search back for `](` without whitespace break
            before = line[:start]
            # in markdown link target: '](' just before
            if before.rstrip().endswith('](') or before.endswith('<'):
                result.append(line[i:end])
                i = end
                continue
            after = line[end:end+1]
            if after == '>':
                result.append(line[i:end])
                i = end
                continue
            result.append(line[i:start])
            result.append('<' + m.group(1) + '>')
            i = end
        return ''.join(result)
    out.append(safe_sub(ln))
new = '\n'.join(out)
# Collapse 3+ blank lines to 2
new = re.sub(r'\n{3,}', '\n\n', new)
if new != src:
    with open(p, 'w', encoding='utf-8') as fh:
        fh.write(new)
PY
}

# ---- YAML validation with real duplicate-key detection ----
validate_yaml() {
  local f="$1"
  [ -f "$f" ] || return 0
  python3 - "$f" <<'PY'
import sys
try:
    import yaml
except ImportError:
    print('YAML validation unavailable: PyYAML is required', file=sys.stderr)
    sys.exit(2)
p = sys.argv[1]

class StrictLoader(yaml.SafeLoader):
    pass

def no_dups(loader, node, deep=False):
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in mapping:
            raise yaml.constructor.ConstructorError(
                'while constructing a mapping', node.start_mark,
                "duplicate key %r (line %d)" % (key, key_node.start_mark.line + 1),
                key_node.start_mark)
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping

StrictLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, no_dups)

try:
    with open(p, 'r', encoding='utf-8') as fh:
        list(yaml.load_all(fh, Loader=StrictLoader))
except Exception as e:
    print('YAML error in %s: %s' % (p, e), file=sys.stderr)
    sys.exit(2)
PY
  local rc=$?
  if [ $rc -eq 2 ]; then
    FAIL "YAML validation failed: $f"
  fi
}

# ---- JSON validation ----
validate_json() {
  local f="$1"
  [ -f "$f" ] || return 0
  if ! python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$f" 2>/dev/null; then
    # Try jsonc (strip comments) for .jsonc files only
    case "$f" in
      *.jsonc) return 0 ;;
    esac
    FAIL "JSON invalid: $f"
  fi
}

# ---- Markdownlint (optional; only if repo has markdownlint-cli2) ----
run_markdownlint() {
  local md_files=("$@")
  [ "${#md_files[@]}" -eq 0 ] && return 0
  if [ -x "node_modules/.bin/markdownlint-cli2" ]; then
    if ! node_modules/.bin/markdownlint-cli2 --config .markdownlint.jsonc "${md_files[@]}" 2>&1; then
      FAIL "markdownlint found issues (see above)"
    fi
  fi
}

# ---- Secret warning (non-blocking) ----
secret_scan() {
  local f="$1"
  [ -f "$f" ] || return 0
  # simple heuristics; non-blocking
  if grep -qE '(AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)' "$f" 2>/dev/null; then
    WARN "possible secret pattern in $f"
  fi
}

MD_FILES=()
for f in "${FILES[@]}"; do
  [ -f "$f" ] || continue
  case "$f" in
    *.md|*.markdown)
      fix_markdown "$f"
      MD_FILES+=("$f")
      ;;
    *.yml|*.yaml)
      validate_yaml "$f"
      ;;
    *.json)
      validate_json "$f"
      ;;
  esac
  secret_scan "$f"
done

run_markdownlint "${MD_FILES[@]}"

# Re-stage any files we may have auto-fixed (only when in git commit context)
if [ "$#" -eq 0 ]; then
  for f in "${MD_FILES[@]}"; do
    git add "$f" 2>/dev/null || true
  done
fi

if [ $EXIT -eq 0 ]; then
  OK "pre-review gate passed (${#FILES[@]} file(s))"
fi
exit $EXIT
