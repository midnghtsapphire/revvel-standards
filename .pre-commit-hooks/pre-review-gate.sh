#!/usr/bin/env bash
# Local pre-review commit gate — auto-fixes and validates staged files.
# Usage:
#   pre-review-gate.sh                # act on git-staged files
#   pre-review-gate.sh file1 file2 …  # act on explicit files (for tests)
# Exit non-zero on blocking failures (see CLAUDE.md gotcha #6).
set -u

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT" || exit 1

BLOCKING=0

# ---- Determine target files ----
if [ $# -gt 0 ]; then
  FILES=("$@")
else
  # Only staged (Added/Copied/Modified/Renamed) files.
  mapfile -t FILES < <(git diff --cached --name-only --diff-filter=ACMR)
fi

if [ ${#FILES[@]} -eq 0 ]; then
  exit 0
fi

# ---- Fence-aware markdown auto-fix ----
# Wraps bare URLs in <> for MD034 outside fenced code blocks and existing
# links, collapses runs of >2 blank lines. The spec's simple sed corrupted
# fenced code; we track fence state line by line in awk.
auto_fix_md() {
  local f="$1"
  [ -f "$f" ] || return 0
  awk '
    BEGIN { in_fence = 0 }
    {
      line = $0
      # Toggle fence on ``` or ~~~ at start of trimmed line.
      tmp = line; sub(/^[ \t]+/, "", tmp)
      if (tmp ~ /^```/ || tmp ~ /^~~~/) { in_fence = !in_fence; print line; next }
      if (in_fence) { print line; next }
      # Skip if line is (or contains) an existing markdown link/image or angle-wrapped URL.
      # Simple heuristic: only wrap bare http(s) URLs not already inside () [] or <>.
      out = ""
      rest = line
      while (match(rest, /https?:\/\/[^ \t\)\]\>"'\''`]+/)) {
        url = substr(rest, RSTART, RLENGTH)
        before = substr(rest, 1, RSTART - 1)
        after = substr(rest, RSTART + RLENGTH)
        # Look at char immediately before the URL: skip wrapping if ( [ < or already in link syntax like ](
        prev = (RSTART > 1) ? substr(rest, RSTART - 1, 1) : " "
        if (prev == "(" || prev == "[" || prev == "<" || prev == "\"" || prev == "'\''" || prev == "`") {
          out = out before url
        } else {
          out = out before "<" url ">"
        }
        rest = after
      }
      out = out rest
      print out
    }
  ' "$f" > "$f.tmp" && mv "$f.tmp" "$f"

  # Collapse >2 consecutive blank lines to exactly one blank line.
  awk 'BEGIN{blank=0} { if ($0 ~ /^[[:space:]]*$/) { blank++; if (blank<=1) print "" } else { blank=0; print } }' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
}

# ---- Markdown lint via repo's markdownlint-cli2 + .markdownlint.jsonc ----
lint_md() {
  local f="$1"
  if [ -x "node_modules/.bin/markdownlint-cli2" ]; then
    node_modules/.bin/markdownlint-cli2 "$f" >&2 || return 1
  elif command -v markdownlint-cli2 >/dev/null 2>&1; then
    markdownlint-cli2 "$f" >&2 || return 1
  fi
  return 0
}

# ---- YAML validation with duplicate-key detection ----
validate_yaml() {
  local f="$1"
  # PyYAML safe_load does NOT detect duplicate keys — use a custom loader.
  python3 - "$f" <<'PY' >&2
import sys, yaml
path = sys.argv[1]

class DupCheckLoader(yaml.SafeLoader):
    pass

def _construct_mapping(loader, node, deep=False):
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in mapping:
            raise yaml.constructor.ConstructorError(
                None, None,
                "duplicate key %r (line %d)" % (key, key_node.start_mark.line + 1),
                key_node.start_mark)
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping

DupCheckLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG,
    _construct_mapping)

try:
    with open(path, 'r', encoding='utf-8') as fh:
        list(yaml.load_all(fh, Loader=DupCheckLoader))
except Exception as exc:
    print("YAML error in %s: %s" % (path, exc), file=sys.stderr)
    sys.exit(1)
PY
}

validate_json() {
  local f="$1"
  python3 -c 'import json, sys; json.load(open(sys.argv[1], "r", encoding="utf-8"))' "$f" 2>&1 >&2
}

# ---- Secret warning (non-blocking) ----
secret_warn() {
  local f="$1"
  # Quick heuristic patterns; do not block — CI/secret scanner is authoritative.
  if grep -E -I -n \
      -e 'AKIA[0-9A-Z]{16}' \
      -e 'ghp_[A-Za-z0-9]{20,}' \
      -e 'xox[baprs]-[A-Za-z0-9-]+' \
      -e '-----BEGIN [A-Z ]*PRIVATE KEY-----' \
      "$f" >/dev/null 2>&1; then
    echo "⚠  possible secret in $f (not blocking; review before commit)" >&2
  fi
}

for f in "${FILES[@]}"; do
  [ -f "$f" ] || continue  # deleted file — skip
  case "$f" in
    *.md|*.markdown)
      auto_fix_md "$f"
      # Re-stage if this file was originally staged.
      if [ $# -eq 0 ]; then git add "$f"; fi
      lint_md "$f" || BLOCKING=1
      ;;
    *.yml|*.yaml)
      validate_yaml "$f" || BLOCKING=1
      ;;
    *.json|*.jsonc)
      # Skip jsonc (comments) — best-effort.
      case "$f" in *.jsonc) ;; *) validate_json "$f" || BLOCKING=1 ;; esac
      ;;
  esac
  secret_warn "$f"
done

exit $BLOCKING
