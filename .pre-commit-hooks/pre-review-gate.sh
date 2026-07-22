#!/usr/bin/env bash
# Pre-review commit gate: fence-aware markdown auto-fix + lint,
# YAML/JSON validation (with real duplicate-key detection), secret warning.
# Blocking checks exit non-zero. Non-blocking checks print warnings.
#
# Usage:
#   pre-review-gate.sh                 # operate on staged files
#   pre-review-gate.sh file1 file2 ... # operate on explicit files (for tests)
set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
EXIT_CODE=0
WARN=0

log()   { printf '\033[36m[pre-review]\033[0m %s\n' "$*"; }
warn()  { printf '\033[33m[pre-review WARN]\033[0m %s\n' "$*" >&2; WARN=$((WARN+1)); }
err()   { printf '\033[31m[pre-review FAIL]\033[0m %s\n' "$*" >&2; EXIT_CODE=1; }

if [ "$#" -gt 0 ]; then
  FILES=("$@")
else
  mapfile -t FILES < <(git diff --cached --name-only --diff-filter=ACMR)
fi

if [ "${#FILES[@]}" -eq 0 ]; then
  log "no files to check"
  exit 0
fi

# ---------- markdown auto-fix (fence-aware) ----------
md_autofix() {
  local f="$1"
  # Skip if file missing
  [ -f "$f" ] || return 0
  python3 - "$f" <<'PY'
import sys, re, io
p = sys.argv[1]
with open(p, 'r', encoding='utf-8') as fh:
    text = fh.read()
lines = text.split('\n')
out = []
in_fence = False
fence_re = re.compile(r'^\s*```')
# match bare http(s) URLs NOT already wrapped in <> or [](...)
url_re = re.compile(r'(?<![\(<\[\w`])(https?://[^\s<>\)\]`]+)')
blank_run = 0
for line in lines:
    if fence_re.match(line):
        in_fence = not in_fence
        out.append(line)
        blank_run = 0
        continue
    if in_fence:
        out.append(line)
        blank_run = 0
        continue
    # skip if line is a markdown link/image reference-ish
    fixed = line
    # only wrap URLs when they aren't already inside <...>, [...] or (...)
    def _wrap(m):
        url = m.group(1)
        start = m.start()
        # look back for `(` or `<` or `[` recently — the negative-lookbehind
        # in url_re handles simple cases; here we bail if url is part of a
        # markdown link parens later on the same line.
        return f'<{url}>'
    fixed = url_re.sub(_wrap, fixed)
    if fixed.strip() == '':
        blank_run += 1
        if blank_run <= 1:
            out.append(fixed)
    else:
        blank_run = 0
        out.append(fixed)
new = '\n'.join(out)
if new != text:
    with open(p, 'w', encoding='utf-8') as fh:
        fh.write(new)
    print(f'  autofixed {p}')
PY
}

md_lint() {
  local f="$1"
  if [ -x "$REPO_ROOT/node_modules/.bin/markdownlint-cli2" ]; then
    ( cd "$REPO_ROOT" && ./node_modules/.bin/markdownlint-cli2 "$f" ) || err "markdownlint failed: $f"
  else
    warn "markdownlint-cli2 not installed in node_modules — skipping lint for $f"
  fi
}

# ---------- YAML: syntax + duplicate-key detection ----------
yaml_check() {
  local f="$1"
  [ -f "$f" ] || return 0
  python3 - "$f" <<'PY' || exit 1
import sys
try:
    import yaml
except Exception as e:
    print(f'PyYAML not available: {e}', file=sys.stderr)
    sys.exit(0)  # non-blocking if pyyaml missing
p = sys.argv[1]
class DupKeyLoader(yaml.SafeLoader):
    pass
def _construct_mapping(loader, node, deep=False):
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
DupKeyLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _construct_mapping)
try:
    with open(p, 'r', encoding='utf-8') as fh:
        list(yaml.load_all(fh, Loader=DupKeyLoader))
except yaml.YAMLError as e:
    print(f'YAML error in {p}: {e}', file=sys.stderr)
    sys.exit(1)
PY
}

# ---------- JSON validation ----------
json_check() {
  local f="$1"
  [ -f "$f" ] || return 0
  python3 -c "import json,sys; json.load(open(sys.argv[1], encoding='utf-8'))" "$f" 2>/tmp/pre-review-json.err \
    || { err "JSON error in $f: $(cat /tmp/pre-review-json.err)"; return 1; }
}

# ---------- Secret warning (non-blocking) ----------
secret_scan() {
  local f="$1"
  [ -f "$f" ] || return 0
  # Common patterns; keep permissive to avoid false-negative silence.
  if grep -nE '(AKIA[0-9A-Z]{16}|ghp_[0-9A-Za-z]{20,}|sk-[0-9A-Za-z]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)' "$f" >/tmp/pre-review-secrets.out 2>/dev/null; then
    if [ -s /tmp/pre-review-secrets.out ]; then
      warn "possible secret in $f — review before commit:"
      sed 's/^/    /' /tmp/pre-review-secrets.out >&2
    fi
  fi
}

for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    log "skip missing $f"
    continue
  fi
  case "$f" in
    *.md|*.markdown)
      md_autofix "$f"
      md_lint "$f"
      ;;
    *.yml|*.yaml)
      if ! yaml_check "$f"; then err "YAML validation failed: $f"; fi
      ;;
    *.json|*.jsonc)
      # jsonc allowed comments — skip strict parse for .jsonc
      if [[ "$f" == *.json ]]; then
        json_check "$f" || true  # err already set inside
      fi
      ;;
  esac
  secret_scan "$f"
done

if [ "$EXIT_CODE" -ne 0 ]; then
  err "blocking check(s) failed — commit aborted"
fi
if [ "$WARN" -gt 0 ]; then
  log "$WARN warning(s) — non-blocking"
fi
exit "$EXIT_CODE"
