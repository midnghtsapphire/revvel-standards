#!/usr/bin/env bash
# pre-review-gate.sh — fence-aware markdown auto-fix + validation gate.
#
# Blocking checks (exit 1 on failure):
#   - YAML syntax + duplicate-key detection (via python custom loader)
#   - JSON syntax
#   - markdownlint-cli2 (only when installed in repo node_modules)
#
# Non-blocking:
#   - secret warning (regex heuristic)
#
# Auto-fixes staged markdown:
#   - bare URL → <url> (MD034), only outside fenced code blocks and existing links
#   - collapse ≥3 blank lines to 1
#
# Usage:
#   ./pre-review-gate.sh                      # act on `git diff --cached --name-only`
#   ./pre-review-gate.sh file1.md file2.yml   # act on explicit files (for tests)

set -u
set -o pipefail

EXIT_CODE=0
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT" || exit 1

# Collect files
if [ "$#" -gt 0 ]; then
  FILES=("$@")
else
  mapfile -d '' -t FILES < <(git diff --cached --name-only --diff-filter=ACMR -z)
fi

if [ "${#FILES[@]}" -eq 0 ]; then
  exit 0
fi

# ---------- Markdown auto-fix (fence-aware) ----------
md_autofix() {
  local f="$1"
  [ -f "$f" ] || return 0
  python3 - "$f" <<'PY'
import re, sys
path = sys.argv[1]
try:
    with open(path, 'r', encoding='utf-8') as fh:
        text = fh.read()
except UnicodeDecodeError:
    sys.exit(0)

lines = text.split('\n')
out = []
in_fence = False
fence_re = re.compile(r'^\s*(```|~~~)')
# URL not already inside <...>, [text](...), or backticks; end at whitespace or terminal punctuation
url_re = re.compile(r'(?<![<\(`\["\'])\bhttps?://[^\s<>\[\]`)"\']+[^\s<>\[\]`)"\'.,;:!?]')

for line in lines:
    if fence_re.match(line):
        in_fence = not in_fence
        out.append(line)
        continue
    if in_fence:
        out.append(line)
        continue
    # Wrap bare URLs
    fixed = url_re.sub(lambda m: '<' + m.group(0) + '>', line)
    out.append(fixed)

new_text = '\n'.join(out)
# Collapse 3+ blank lines to 1
new_text = re.sub(r'\n{3,}', '\n\n', new_text)

if new_text != text:
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(new_text)
PY
}

# ---------- YAML validate (with duplicate keys) ----------
yaml_validate() {
  local f="$1"
  python3 - "$f" <<'PY'
import sys
path = sys.argv[1]
try:
    import yaml
except ImportError:
    sys.exit(0)  # PyYAML not installed → skip (non-blocking)

from yaml.constructor import SafeConstructor, ConstructorError

class DupKeyLoader(yaml.SafeLoader):
    pass

def _construct_mapping(loader, node, deep=False):
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in mapping:
            raise ConstructorError(
                'while constructing a mapping', node.start_mark,
                "duplicate key '%s' (line %d)" % (key, key_node.start_mark.line + 1),
                key_node.start_mark)
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping

DupKeyLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _construct_mapping)

try:
    with open(path, 'r', encoding='utf-8') as fh:
        list(yaml.load_all(fh, Loader=DupKeyLoader))
except Exception as e:
    print("YAML error in %s: %s" % (path, e), file=sys.stderr)
    sys.exit(1)
sys.exit(0)
PY
}

# ---------- JSON validate ----------
json_validate() {
  local f="$1"
  python3 - "$f" <<'PY'
import json, sys
path = sys.argv[1]
try:
    with open(path, 'r', encoding='utf-8') as fh:
        json.load(fh)
except Exception as e:
    print("JSON error in %s: %s" % (path, e), file=sys.stderr)
    sys.exit(1)
PY
}

# ---------- Secret warning ----------
secret_warn() {
  local f="$1"
  [ -f "$f" ] || return 0
  if grep -EinH \
    -e '(aws|amazon)_?(secret|access)_?key' \
    -e 'AKIA[0-9A-Z]{16}' \
    -e 'ghp_[A-Za-z0-9]{20,}' \
    -e 'gh[opsu]_[A-Za-z0-9]{20,}' \
    -e 'xox[baprs]-[A-Za-z0-9-]{10,}' \
    -e 'sk-[A-Za-z0-9]{20,}' \
    -e 'BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY' \
    "$f" >/dev/null 2>&1; then
    echo "⚠️  pre-review-gate: possible secret in $f (non-blocking, please review)" >&2
  fi
}

# ---------- Main loop ----------
MD_FILES=()
for f in "${FILES[@]}"; do
  [ -f "$f" ] || continue  # deleted / missing
  case "$f" in
    *.md|*.markdown)
      md_autofix "$f"
      MD_FILES+=("$f")
      secret_warn "$f"
      # re-stage if changed
      git add "$f" 2>/dev/null || true
      ;;
    *.yml|*.yaml)
      if ! yaml_validate "$f"; then EXIT_CODE=1; fi
      secret_warn "$f"
      ;;
    *.json|*.jsonc)
      # jsonc allows comments — skip strict validate for .jsonc
      case "$f" in
        *.json) if ! json_validate "$f"; then EXIT_CODE=1; fi ;;
      esac
      secret_warn "$f"
      ;;
    *)
      secret_warn "$f"
      ;;
  esac
done

# ---------- Markdownlint (only if installed locally) ----------
if [ "${#MD_FILES[@]}" -gt 0 ] && [ -x "node_modules/.bin/markdownlint-cli2" ]; then
  if [ -f ".markdownlint.jsonc" ] || [ -f ".markdownlint.json" ]; then
    if ! node_modules/.bin/markdownlint-cli2 "${MD_FILES[@]}" >&2; then
      EXIT_CODE=1
    fi
  fi
fi

exit "$EXIT_CODE"
