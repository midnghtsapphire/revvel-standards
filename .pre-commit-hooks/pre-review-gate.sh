#!/usr/bin/env bash
# Pre-review commit gate — auto-fix + validate staged files.
# Blocking checks exit non-zero. Reuses repo .markdownlint.jsonc when present.
set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT" || exit 1

# Collect staged files (or accept explicit args for testing)
if [ "$#" -gt 0 ]; then
  FILES=("$@")
else
  mapfile -t FILES < <(git diff --cached --name-only --diff-filter=ACMR)
fi

if [ "${#FILES[@]}" -eq 0 ]; then
  exit 0
fi

EXIT=0
WARN() { printf '\033[33m[pre-review] warn:\033[0m %s\n' "$*" >&2; }
FAIL() { printf '\033[31m[pre-review] fail:\033[0m %s\n' "$*" >&2; EXIT=1; }
INFO() { printf '\033[36m[pre-review]\033[0m %s\n' "$*" >&2; }

# Fence-aware markdown auto-fix: wrap bare URLs (MD034), collapse duplicate blank lines.
# Skip fenced code blocks and existing links/URLs.
md_autofix() {
  local file="$1"
  python3 - "$file" <<'PYEOF' || return 1
import re, sys, io
path = sys.argv[1]
try:
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()
except Exception as e:
    sys.exit(0)

lines = src.split('\n')
out = []
in_fence = False
fence_re = re.compile(r'^(```|~~~)')
url_re = re.compile(r'(?<![\(<\[\w])(https?://[^\s<>\)\]]+)')

for line in lines:
    if fence_re.match(line.strip()):
        in_fence = not in_fence
        out.append(line)
        continue
    if in_fence:
        out.append(line)
        continue
    # Skip lines that look like markdown links [text](url) or already wrapped <url>
    fixed = url_re.sub(lambda m: '<' + m.group(1) + '>', line)
    out.append(fixed)

# Collapse 3+ blank lines to 2
result = '\n'.join(out)
result = re.sub(r'\n{3,}', '\n\n', result)

if result != src:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(result)
PYEOF
}

# YAML validation with real duplicate-key detection
yaml_validate() {
  local file="$1"
  python3 - "$file" <<'PYEOF'
import sys
try:
    import yaml
except ImportError:
    sys.exit(0)  # PyYAML not installed — skip

path = sys.argv[1]

class DupCheckLoader(yaml.SafeLoader):
    pass

def construct_mapping(loader, node, deep=False):
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

DupCheckLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG,
    construct_mapping)

try:
    with open(path, 'r', encoding='utf-8') as f:
        list(yaml.load_all(f, Loader=DupCheckLoader))
except yaml.YAMLError as e:
    print(f"YAML error in {path}: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF
}

# JSON validation
json_validate() {
  local file="$1"
  python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$file" 2>&1
}

# Secret scan (non-blocking warning)
secret_scan() {
  local file="$1"
  if grep -qE '(AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{36}|sk-[A-Za-z0-9]{20,})' "$file" 2>/dev/null; then
    WARN "possible secret in $file (review before committing)"
  fi
}

HAS_MARKDOWNLINT=0
if [ -x "$REPO_ROOT/node_modules/.bin/markdownlint-cli2" ]; then
  HAS_MARKDOWNLINT=1
fi

for f in "${FILES[@]}"; do
  [ -f "$f" ] || continue
  case "$f" in
    *.md|*.markdown)
      md_autofix "$f"
      git add "$f" 2>/dev/null || true
      if [ "$HAS_MARKDOWNLINT" -eq 1 ]; then
        "$REPO_ROOT/node_modules/.bin/markdownlint-cli2" "$f" >&2 || FAIL "markdown lint: $f"
      fi
      secret_scan "$f"
      ;;
    *.yml|*.yaml)
      if ! yaml_validate "$f"; then
        FAIL "yaml validation: $f"
      fi
      secret_scan "$f"
      ;;
    *.json|*.jsonc)
      case "$f" in
        *.jsonc) : ;; # jsonc allows comments; skip strict parse
        *)
          if ! err=$(json_validate "$f"); then
            FAIL "json validation: $f — $err"
          fi
          ;;
      esac
      secret_scan "$f"
      ;;
    *)
      secret_scan "$f"
      ;;
  esac
done

if [ "$EXIT" -ne 0 ]; then
  INFO "pre-review gate blocked commit — fix issues above."
fi
exit "$EXIT"
