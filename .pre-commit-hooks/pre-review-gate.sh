#!/usr/bin/env bash
# Pre-review commit gate — auto-fix + validate staged files.
# Blocking checks exit non-zero. Non-blocking (secret warnings) print advisories only.
# Usage:
#   pre-review-gate.sh                # operate on git staged files
#   pre-review-gate.sh FILE [FILE...] # operate on explicit files (used by tests)
set -u

RED=$(printf '\033[31m'); YEL=$(printf '\033[33m'); GRN=$(printf '\033[32m'); DIM=$(printf '\033[2m'); RST=$(printf '\033[0m')
log()  { printf '%s[pre-review]%s %s\n' "$DIM" "$RST" "$*"; }
warn() { printf '%s[pre-review]%s %s\n' "$YEL" "$RST" "$*" >&2; }
err()  { printf '%s[pre-review]%s %s\n' "$RED" "$RST" "$*" >&2; }
ok()   { printf '%s[pre-review]%s %s\n' "$GRN" "$RST" "$*"; }

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$REPO_ROOT" || exit 1

# Collect target files
FILES=()
if [ "$#" -gt 0 ]; then
  for f in "$@"; do FILES+=("$f"); done
else
  while IFS= read -r line; do
    [ -n "$line" ] && FILES+=("$line")
  done < <(git diff --cached --name-only --diff-filter=ACMR)
fi

if [ "${#FILES[@]}" -eq 0 ]; then
  log "no staged files, nothing to do"
  exit 0
fi

EXIT=0

# ------------- Markdown auto-fix (fence-aware) -------------
# Wraps bare URLs (MD034) with <...> but never inside fenced code blocks,
# never inside inline code, and never if already inside markdown link/image or angle brackets.
md_autofix() {
  local file="$1"
  python3 - "$file" <<'PY' || return 1
import re, sys, io
path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    src = f.read()

lines = src.split('\n')
out = []
in_fence = False
fence_re = re.compile(r'^\s*(```|~~~)')
url_re = re.compile(r'(?<![\w<(\["\'`=])(https?://[^\s<>\)\]"\'`]+)')

def wrap_urls(line):
    # Skip lines that look like link definitions or image/link markdown targets already
    # We process only text outside inline `code` spans.
    parts = re.split(r'(`+[^`]*`+)', line)
    for i, p in enumerate(parts):
        if i % 2 == 1:
            continue  # inline code — leave alone
        # Avoid wrapping URLs already inside a markdown link [x](url) or <url>
        # Detect URL context: preceded by '(' with a preceding ']' -> link target, skip.
        def repl(m):
            url = m.group(1)
            start = m.start()
            before = p[max(0, start-2):start]
            if before.endswith('](') or before.endswith('<'):
                return url
            return f'<{url}>'
        parts[i] = url_re.sub(repl, p)
    return ''.join(parts)

for ln in lines:
    if fence_re.match(ln):
        in_fence = not in_fence
        out.append(ln)
        continue
    if in_fence:
        out.append(ln)
        continue
    out.append(wrap_urls(ln))

text = '\n'.join(out)
# Collapse 3+ consecutive blank lines to 2 (MD012)
text = re.sub(r'\n{3,}', '\n\n', text)

if text != src:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
PY
}

# ------------- YAML validation with duplicate-key detection -------------
yaml_validate() {
  local file="$1"
  python3 - "$file" <<'PY'
import sys
path = sys.argv[1]
try:
    import yaml
except ImportError:
    print(f"[skip] PyYAML not installed — skipping {path}", file=sys.stderr)
    sys.exit(0)

from yaml.loader import SafeLoader
from yaml.constructor import ConstructorError

class UniqueKeyLoader(SafeLoader):
    pass

def _construct_mapping(loader, node, deep=False):
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in mapping:
            raise ConstructorError(
                'while constructing a mapping', node.start_mark,
                f"duplicate key {key!r} (line {key_node.start_mark.line + 1})",
                key_node.start_mark)
        value = loader.construct_object(value_node, deep=deep)
        mapping[key] = value
    return mapping

UniqueKeyLoader.construct_mapping = _construct_mapping

try:
    with open(path, 'r', encoding='utf-8') as f:
        docs = list(yaml.load_all(f, Loader=UniqueKeyLoader))
except Exception as e:
    print(f"[YAML ERROR] {path}: {e}", file=sys.stderr)
    sys.exit(1)
sys.exit(0)
PY
}

# ------------- JSON validation -------------
json_validate() {
  local file="$1"
  python3 - "$file" <<'PY'
import json, sys
path = sys.argv[1]
try:
    with open(path, 'r', encoding='utf-8') as f:
        json.load(f)
except Exception as e:
    print(f"[JSON ERROR] {path}: {e}", file=sys.stderr)
    sys.exit(1)
PY
}

# ------------- Secret scan (non-blocking) -------------
secret_scan() {
  local file="$1"
  # Common obvious patterns: AWS AKIA, GitHub pat_, generic "secret =" "token ="
  if grep -EqI '(AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(api[_-]?key|secret|token|password)\s*[:=]\s*["'\''][^"'\'' ]{12,})' "$file" 2>/dev/null; then
    warn "possible secret in $file (non-blocking) — review before committing"
  fi
}

# ------------- Optional prettier/eslint (only if in repo node_modules) -------------
run_prettier() {
  local file="$1"
  if [ -x "node_modules/.bin/prettier" ]; then
    node_modules/.bin/prettier --write --log-level warn "$file" >/dev/null 2>&1 || true
  fi
}

run_markdownlint() {
  local file="$1"
  local cfg=".markdownlint.jsonc"
  [ -f "$cfg" ] || cfg=".markdownlint.json"
  if [ -x "node_modules/.bin/markdownlint-cli2" ]; then
    if [ -f "$cfg" ]; then
      node_modules/.bin/markdownlint-cli2 --config "$cfg" "$file" 2>&1 || return 1
    else
      node_modules/.bin/markdownlint-cli2 "$file" 2>&1 || return 1
    fi
  fi
  return 0
}

for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    log "skip missing file: $f"
    continue
  fi
  case "$f" in
    *.md|*.markdown)
      md_autofix "$f" || true
      run_prettier "$f"
      if ! run_markdownlint "$f"; then
        err "markdownlint failed on $f"
        EXIT=1
      fi
      # re-stage after autofix if we were run from a real commit
      git add "$f" 2>/dev/null || true
      ;;
    *.yml|*.yaml)
      if ! yaml_validate "$f"; then
        err "YAML validation failed on $f"
        EXIT=1
      fi
      ;;
    *.json|*.jsonc)
      # jsonc allows comments — skip strict json check
      if [[ "$f" == *.json ]]; then
        if ! json_validate "$f"; then
          err "JSON validation failed on $f"
          EXIT=1
        fi
      fi
      ;;
    *.js|*.mjs|*.cjs|*.ts|*.tsx|*.jsx)
      run_prettier "$f"
      git add "$f" 2>/dev/null || true
      ;;
  esac
  secret_scan "$f"
done

if [ "$EXIT" -eq 0 ]; then
  ok "pre-review checks passed (${#FILES[@]} file(s))"
else
  err "pre-review blocking checks failed"
fi

exit "$EXIT"
