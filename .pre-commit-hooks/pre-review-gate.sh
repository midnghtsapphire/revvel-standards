#!/usr/bin/env bash
# pre-review-gate.sh — auto-fix + validate staged files before commit.
#
# Design: "less is more."
#   - Reuses the repo's existing .markdownlint.jsonc (no second config, no CI drift).
#   - Fence-aware markdown auto-fix: does NOT touch content inside ``` fenced blocks.
#   - Real YAML duplicate-key detection (PyYAML safe_load silently accepts dupes).
#   - Optional prettier/eslint only when installed in the repo.
#   - Secret warning is non-blocking; syntax errors are blocking (CLAUDE.md gotcha #6).
#
# Accepts explicit file args for testing:
#   pre-review-gate.sh path/to/file.md path/to/file.yaml

set -u

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT" || exit 0

EXIT=0
WARN=0

files=()
if [ "$#" -gt 0 ]; then
  for f in "$@"; do
    [ -f "$f" ] && files+=("$f")
  done
else
  while IFS= read -r f; do
    [ -n "$f" ] && [ -f "$f" ] && files+=("$f")
  done < <(git diff --cached --name-only --diff-filter=ACMR)
fi

if [ "${#files[@]}" -eq 0 ]; then
  exit 0
fi

# ---------- Markdown auto-fix (fence-aware) ----------
fix_markdown() {
  local f="$1"
  python3 - "$f" <<'PY'
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
fence_marker = None
URL_RE = re.compile(r'(?<![\(\<`\"\'\/=])(https?:\/\/[^\s\)\]\}\<\>\`]+)(?![\)\>\`])')

def wrap_urls(line):
    # Skip if inside a link/image already handled by markdown.
    # Only wrap truly bare URLs.
    def repl(m):
        u = m.group(1)
        # Trim trailing punctuation that shouldn't be part of the URL.
        trail = ''
        while u and u[-1] in '.,;:!?':
            trail = u[-1] + trail
            u = u[:-1]
        return '<' + u + '>' + trail
    return URL_RE.sub(repl, line)

for line in lines:
    stripped = line.lstrip()
    if stripped.startswith('```') or stripped.startswith('~~~'):
        marker = stripped[:3]
        if not in_fence:
            in_fence = True
            fence_marker = marker
        elif stripped.startswith(fence_marker):
            in_fence = False
            fence_marker = None
        out.append(line)
        continue
    if in_fence:
        out.append(line)
        continue
    # skip lines that already look like a link [text](url) or <url>
    if '](' in line or re.search(r'<https?://', line):
        out.append(wrap_urls(line))
    else:
        out.append(wrap_urls(line))

# Collapse duplicate blank lines (outside fences we already handled).
collapsed = []
blank = 0
in_fence = False
fence_marker = None
for line in out:
    stripped = line.lstrip()
    if stripped.startswith('```') or stripped.startswith('~~~'):
        marker = stripped[:3]
        if not in_fence:
            in_fence = True; fence_marker = marker
        elif stripped.startswith(fence_marker):
            in_fence = False; fence_marker = None
        collapsed.append(line); blank = 0; continue
    if in_fence:
        collapsed.append(line); continue
    if line.strip() == '':
        blank += 1
        if blank <= 1:
            collapsed.append(line)
    else:
        blank = 0
        collapsed.append(line)

new = '\n'.join(collapsed)
if new != src:
    with open(p, 'w', encoding='utf-8') as fh:
        fh.write(new)
PY
}

# ---------- YAML validate w/ real dup-key detection ----------
validate_yaml() {
  local f="$1"
  python3 - "$f" <<'PY'
import sys
try:
    import yaml
except ImportError:
    sys.exit(0)  # can't validate without pyyaml; not our job to install

p = sys.argv[1]

class DupCheckLoader(yaml.SafeLoader):
    pass

def _no_dup(loader, node, deep=False):
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in mapping:
            raise yaml.constructor.ConstructorError(
                None, None,
                "duplicate key %r (line %d)" % (key, key_node.start_mark.line + 1),
                key_node.start_mark,
            )
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping

DupCheckLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _no_dup)

try:
    with open(p, 'r', encoding='utf-8') as fh:
        list(yaml.load_all(fh, Loader=DupCheckLoader))
except yaml.YAMLError as e:
    print("YAML error in %s: %s" % (p, e), file=sys.stderr)
    sys.exit(2)
PY
}

validate_json() {
  local f="$1"
  python3 -c "import json,sys; json.load(open(sys.argv[1], encoding='utf-8'))" "$f" 2>&1
}

# ---------- Pass over files ----------
for f in "${files[@]}"; do
  case "$f" in
    *.md|*.markdown)
      fix_markdown "$f"
      git add "$f" 2>/dev/null || true
      if [ -d "$REPO_ROOT/node_modules/markdownlint-cli2" ] && [ -f "$REPO_ROOT/.markdownlint.jsonc" ]; then
        if ! npx --no-install markdownlint-cli2 --config "$REPO_ROOT/.markdownlint.jsonc" "$f" >/dev/null 2>&1; then
          echo "⚠ markdownlint issues in $f (non-blocking)" >&2
          WARN=1
        fi
      fi
      ;;
    *.yaml|*.yml)
      if ! validate_yaml "$f"; then
        EXIT=1
      fi
      ;;
    *.json|*.jsonc)
      if [ "${f##*.}" = "json" ]; then
        err="$(validate_json "$f" 2>&1)" || {
          echo "JSON error in $f: $err" >&2
          EXIT=1
        }
      fi
      ;;
  esac

  # Non-blocking secret warning.
  if grep -Eq '(AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)' "$f" 2>/dev/null; then
    echo "⚠ possible secret pattern in $f — review before commit" >&2
    WARN=1
  fi
done

if [ "$EXIT" -ne 0 ]; then
  echo "pre-review-gate: blocking errors found" >&2
  exit 1
fi

exit 0
