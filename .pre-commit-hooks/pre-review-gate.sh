#!/usr/bin/env bash
# Pre-review gate — local commit-time validation ("less is more" edition).
#
# What it does, per staged file type:
#   Markdown  auto-fix bare URLs -> <url> (MD034, skipping fenced code
#             blocks), collapse duplicate blank lines, then lint with the
#             repo's markdownlint-cli2 + .markdownlint.jsonc (same config
#             CI uses — no second config file, no drift).
#   YAML      validate syntax AND duplicate keys (PyYAML's safe_load
#             silently keeps the last duplicate, so a custom loader is
#             required to actually catch them). Blocks the commit.
#   JSON      validate syntax. Blocks the commit.
#   JS/TS     optional prettier/eslint --fix, only when installed in the
#             repo's own node_modules (a global install won't trigger
#             surprise reformatting).
#   Secrets   non-blocking warning on hardcoded-credential patterns.
#
# Usage:
#   .pre-commit-hooks/pre-review-gate.sh            # staged files (hook mode)
#   .pre-commit-hooks/pre-review-gate.sh FILE...    # explicit files (test mode)
#
# Install as a git hook (chained with the existing JSONL gate):
#   bash scripts/setup-pre-review.sh
#
# Env:
#   PRE_REVIEW_NO_LINT=1   skip the markdownlint step (used by tests)
set -uo pipefail

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

restage=0
if [ "$#" -gt 0 ]; then
  files=("$@")
else
  # bash 3.2 (macOS default) has no `mapfile`; use a portable read loop.
  # Include R so renamed-and-modified files are validated, not skipped.
  files=()
  while IFS= read -r _f; do
    [ -n "$_f" ] && files+=("$_f")
  done < <(git diff --cached --name-only --diff-filter=ACMR)
  restage=1
fi

if [ "${#files[@]}" -eq 0 ]; then
  echo "pre-review: no files staged — passing"
  exit 0
fi

md=()
yamlf=()
jsonf=()
jsf=()
existing=()
for f in "${files[@]}"; do
  [ -f "$f" ] || continue
  existing+=("$f")
  case "$f" in
    *.md | *.markdown) md+=("$f") ;;
    *.yml | *.yaml) yamlf+=("$f") ;;
    *.json) jsonf+=("$f") ;;
    *.js | *.jsx | *.ts | *.tsx) jsf+=("$f") ;;
  esac
done

if [ "${#existing[@]}" -eq 0 ]; then
  echo "pre-review: only deletions staged — passing"
  exit 0
fi

fail=0
have_python=1
command -v python3 >/dev/null 2>&1 || have_python=0
if [ "$have_python" -eq 0 ]; then
  echo "pre-review: WARNING python3 not found — YAML/JSON validation and markdown auto-fix skipped"
fi

# ---------------------------------------------------------------------------
# Markdown: auto-fix (fence-aware), then lint with the repo's own config
# ---------------------------------------------------------------------------
if [ "${#md[@]}" -gt 0 ]; then
  echo "pre-review: markdown — ${#md[@]} file(s)"
  if [ "$have_python" -eq 1 ]; then
    python3 - "${md[@]}" <<'PY'
import re
import sys

# Bare URL preceded by start-of-line or whitespace. Already-wrapped (<url>) and
# markdown links ([t](url)) don't match. Inline code spans ARE protected
# separately (see rewrite_outside_code) because a URL inside `code` IS preceded
# by whitespace and would otherwise be corrupted. Trailing punctuation stays out.
URL_RE = re.compile(r"(^|\s)(https?://[^\s<>`]+?)([.,;:!?]*)(?=\s|$)")
FENCE_RE = re.compile(r"^\s*(```|~~~)")
CODE_SPAN_RE = re.compile(r"`[^`]*`")


def rewrite_outside_code(line):
    # Only rewrite bare URLs outside inline-code spans: splitting on `...`
    # yields code at odd indices, prose at even indices.
    parts = CODE_SPAN_RE.split(line)
    spans = CODE_SPAN_RE.findall(line)
    rebuilt = []
    for i, seg in enumerate(parts):
        rebuilt.append(URL_RE.sub(lambda m: f"{m.group(1)}<{m.group(2)}>{m.group(3)}", seg))
        if i < len(spans):
            rebuilt.append(spans[i])
    return "".join(rebuilt)

def fix(path):
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    out = []
    in_fence = False
    prev_blank = False
    for line in text.split("\n"):
        if FENCE_RE.match(line):
            in_fence = not in_fence
            out.append(line)
            prev_blank = False
            continue
        if in_fence:
            out.append(line)
            prev_blank = False
            continue
        blank = line.strip() == ""
        if blank and prev_blank:
            continue  # collapse duplicate blank lines
        prev_blank = blank
        out.append(rewrite_outside_code(line))
    fixed = "\n".join(out)
    if fixed != text:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(fixed)
        print(f"pre-review: auto-fixed {path}")

for p in sys.argv[1:]:
    fix(p)
PY
    if [ "$restage" -eq 1 ]; then
      git add -- "${md[@]}"
    fi
  fi

  if [ "${PRE_REVIEW_NO_LINT:-0}" != "1" ]; then
    lint_bin="$repo_root/node_modules/.bin/markdownlint-cli2"
    if [ -x "$lint_bin" ]; then
      if ! (cd "$repo_root" && "$lint_bin" "${md[@]}"); then
        echo "pre-review: ❌ markdownlint errors remain (config: .markdownlint.jsonc)"
        fail=1
      fi
    else
      echo "pre-review: markdownlint-cli2 not installed (run npm ci) — skipping markdown lint"
    fi
  fi
fi

# ---------------------------------------------------------------------------
# JS/TS: optional auto-fixers, only when installed in this repo
# ---------------------------------------------------------------------------
if [ "${#jsf[@]}" -gt 0 ]; then
  echo "pre-review: js/ts — ${#jsf[@]} file(s)"
  prettier_bin="$repo_root/node_modules/.bin/prettier"
  if [ -x "$prettier_bin" ]; then
    "$prettier_bin" --write --ignore-unknown "${jsf[@]}" || true
    [ "$restage" -eq 1 ] && git add -- "${jsf[@]}"
  fi
  eslint_bin="$repo_root/node_modules/.bin/eslint"
  if [ -x "$eslint_bin" ]; then
    if ! "$eslint_bin" --fix "${jsf[@]}"; then
      echo "pre-review: ❌ eslint errors remain after --fix"
      fail=1
    fi
    [ "$restage" -eq 1 ] && git add -- "${jsf[@]}"
  fi
fi

# ---------------------------------------------------------------------------
# YAML: syntax + duplicate keys (blocks)
# ---------------------------------------------------------------------------
if [ "${#yamlf[@]}" -gt 0 ] && [ "$have_python" -eq 1 ]; then
  echo "pre-review: yaml — ${#yamlf[@]} file(s)"
  if ! python3 - "${yamlf[@]}" <<'PY'; then
import sys

try:
    import yaml
except ImportError:
    # A blocking gate must not report success on YAML it never validated.
    # Fail closed with an actionable fix instead of a silent pass.
    print(
        "pre-review: PyYAML is required to validate staged YAML but is not "
        "installed. Install it (`python3 -m pip install pyyaml`) or unstage the "
        "YAML change. Refusing to pass unvalidated YAML.",
        file=sys.stderr,
    )
    sys.exit(1)

class Loader(yaml.SafeLoader):
    pass

def mapping_no_dups(loader, node):
    seen = set()
    for key_node, _value_node in node.value:
        try:
            key = loader.construct_object(key_node, deep=True)
        except Exception:
            key = key_node.value
        # unhashable keys (rare) are compared by repr
        if not isinstance(key, (str, int, float, bool, tuple, type(None))):
            key = repr(key)
        if key in seen:
            raise yaml.YAMLError(
                f"duplicate key {key!r} (line {key_node.start_mark.line + 1})"
            )
        seen.add(key)
    return loader.construct_mapping(node)

Loader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, mapping_no_dups)

status = 0
for path in sys.argv[1:]:
    try:
        with open(path, encoding="utf-8") as fh:
            list(yaml.load_all(fh, Loader=Loader))
        print(f"pre-review: ✅ {path}: valid YAML")
    except yaml.YAMLError as err:
        print(f"pre-review: ❌ {path}: {err}", file=sys.stderr)
        status = 1
sys.exit(status)
PY
    fail=1
  fi
fi

# ---------------------------------------------------------------------------
# JSON: syntax (blocks)
# ---------------------------------------------------------------------------
if [ "${#jsonf[@]}" -gt 0 ] && [ "$have_python" -eq 1 ]; then
  echo "pre-review: json — ${#jsonf[@]} file(s)"
  for f in "${jsonf[@]}"; do
    if python3 -m json.tool "$f" >/dev/null 2>&1; then
      echo "pre-review: ✅ $f: valid JSON"
    else
      echo "pre-review: ❌ $f: invalid JSON"
      fail=1
    fi
  done
fi

# ---------------------------------------------------------------------------
# Secrets: non-blocking warning
# ---------------------------------------------------------------------------
echo "pre-review: secret scan"
secret_pattern='(password|passwd|secret|token|api[_-]?key|auth[_-]?token)[[:space:]]*[=:][[:space:]]*["'"'"'][^"'"'"']{8,}'
hits=$(grep -nIiE "$secret_pattern" -- "${existing[@]}" 2>/dev/null | grep -v '\.secrets\.baseline' || true)
if [ -n "$hits" ]; then
  echo "pre-review: ⚠️  potential secrets detected — review before committing:"
  echo "$hits"
fi

if [ "$fail" -ne 0 ]; then
  echo "pre-review: ❌ FAILED — commit blocked; fix the errors above"
  exit 1
fi
echo "pre-review: ✅ passed"
