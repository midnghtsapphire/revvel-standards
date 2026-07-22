#!/usr/bin/env bash
# Local pre-review commit gate.
# Auto-fixes and validates staged files. Blocking checks exit non-zero.
# Accepts explicit file args for testing; otherwise operates on staged files.
set -u

fail=0

files=()
if [ "$#" -gt 0 ]; then
  files=("$@")
else
  while IFS= read -r f; do
    [ -n "$f" ] && files+=("$f")
  done < <(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)
fi

[ "${#files[@]}" -eq 0 ] && exit 0

# ---- markdown auto-fix: bare URL → <url>, collapse duplicate blank lines
# Fence-aware: skips content inside ``` fenced blocks and inline `code`.
fix_markdown() {
  local file="$1"
  python3 - "$file" <<'PY'
import re, sys
p = sys.argv[1]
try:
    with open(p, 'r', encoding='utf-8') as f:
        text = f.read()
except (OSError, UnicodeDecodeError):
    sys.exit(0)

lines = text.split('\n')
out = []
in_fence = False
url_re = re.compile(r'(?<![<\(\["\'/=])(https?://[^\s<>`\)\]\"\']+)')

def wrap_outside_code(line):
    # split on backtick inline code spans; only wrap in non-code segments
    parts = re.split(r'(`[^`]*`)', line)
    for i, seg in enumerate(parts):
        if seg.startswith('`') and seg.endswith('`'):
            continue
        # avoid wrapping URLs already inside markdown link/image syntax [text](url)
        # url_re negative lookbehind handles the common cases.
        parts[i] = url_re.sub(r'<\1>', seg)
    return ''.join(parts)

for line in lines:
    stripped = line.lstrip()
    if stripped.startswith('```') or stripped.startswith('~~~'):
        in_fence = not in_fence
        out.append(line)
        continue
    if in_fence:
        out.append(line)
        continue
    out.append(wrap_outside_code(line))

# collapse 3+ blank lines to 1
collapsed = []
blank_run = 0
for line in out:
    if line.strip() == '':
        blank_run += 1
        if blank_run <= 1:
            collapsed.append(line)
    else:
        blank_run = 0
        collapsed.append(line)

new = '\n'.join(collapsed)
if new != text:
    with open(p, 'w', encoding='utf-8') as f:
        f.write(new)
PY
}

# ---- YAML validate (with real duplicate-key detection)
validate_yaml() {
  local file="$1"
  python3 - "$file" <<'PY'
import sys, yaml
p = sys.argv[1]

class DupCheckLoader(yaml.SafeLoader):
    pass

def construct_mapping(loader, node, deep=False):
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in mapping:
            raise yaml.constructor.ConstructorError(
                'while constructing a mapping', node.start_mark,
                "duplicate key %r" % (key,), key_node.start_mark)
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping

DupCheckLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG,
    construct_mapping)

try:
    with open(p, 'r', encoding='utf-8') as f:
        list(yaml.load_all(f, Loader=DupCheckLoader))
except yaml.YAMLError as e:
    mark = getattr(e, 'problem_mark', None)
    problem = getattr(e, 'problem', str(e))
    line = (mark.line + 1) if mark else '?'
    print(f'YAML error in {p}: {problem} (line {line})', file=sys.stderr)
    sys.exit(1)
except OSError as e:
    print(f'YAML read error {p}: {e}', file=sys.stderr)
    sys.exit(1)
PY
}

# ---- JSON validate
validate_json() {
  local file="$1"
  python3 - "$file" <<'PY'
import sys, json
p = sys.argv[1]
try:
    with open(p, 'r', encoding='utf-8') as f:
        json.load(f)
except (json.JSONDecodeError, OSError) as e:
    print(f'JSON error in {p}: {e}', file=sys.stderr)
    sys.exit(1)
PY
}

# ---- secret warning (non-blocking)
secret_scan() {
  local file="$1"
  # common patterns; grep -E, quiet output, only warn
  if grep -EnI '(AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|ghp_[A-Za-z0-9]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)' "$file" >/dev/null 2>&1; then
    echo "pre-review WARN: possible secret in $file (not blocking)" >&2
  fi
}

for f in "${files[@]}"; do
  [ -f "$f" ] || continue
  case "$f" in
    *.md|*.markdown)
      fix_markdown "$f"
      # re-stage after auto-fix
      git add "$f" 2>/dev/null || true
      # optional markdownlint via repo's config
      if [ -x "node_modules/.bin/markdownlint-cli2" ] && [ -f .markdownlint.jsonc ]; then
        if ! node_modules/.bin/markdownlint-cli2 "$f" >&2; then
          fail=1
        fi
      fi
      secret_scan "$f"
      ;;
    *.yml|*.yaml)
      if ! validate_yaml "$f"; then fail=1; fi
      secret_scan "$f"
      ;;
    *.json|*.jsonc)
      # jsonc is a superset; only strict-validate plain .json
      case "$f" in
        *.json) if ! validate_json "$f"; then fail=1; fi ;;
      esac
      secret_scan "$f"
      ;;
    *)
      secret_scan "$f"
      ;;
  esac
done

exit "$fail"
