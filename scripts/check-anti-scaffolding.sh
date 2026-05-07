#!/usr/bin/env bash
# Anti-scaffolding check
#
# Detects placeholder/stub/TODO scaffolding code that should not be merged.
#
# Excludes legitimate uses:
#   - HTML placeholder="..." attributes (form inputs)
#   - CSS ::placeholder pseudo-element
#   - placeholder values/attributes in JSX/TSX/HTML
#   - Search placeholder text

set -euo pipefail

# Files to scan (passed as args, or default to staged files)
if [ "$#" -gt 0 ]; then
  FILES=("$@")
else
  mapfile -t FILES < <(git diff --cached --name-only --diff-filter=ACM)
fi

if [ "${#FILES[@]}" -eq 0 ]; then
  exit 0
fi

# Pattern that catches scaffolding "placeholder" code while excluding
# legitimate form/CSS placeholder usage.
#
# Exclusions (via grep -v after match):
#   - placeholder="..."           (HTML/JSX attribute)
#   - placeholder='...'           (HTML/JSX attribute)
#   - ::placeholder               (CSS pseudo-element)
#   - placeholder:                (CSS property / object key)
#   - "placeholder":              (JSON key)
#   - placeholder=\{               (JSX expression attribute)
#
# Flagged (actual scaffolding):
#   - // placeholder
#   - /* placeholder */
#   - # placeholder
#   - return "placeholder"
#   - // TODO: placeholder
#   - function ... { /* placeholder */ }

found_issues=0

for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    continue
  fi

  # Skip binary files
  if ! grep -Iq . "$f"; then
    continue
  fi

  # Find candidate lines mentioning "placeholder" (case-insensitive)
  # then filter out legitimate uses.
  matches=$(grep -niE 'placeholder' "$f" 2>/dev/null \
    | grep -viE 'placeholder[[:space:]]*=[[:space:]]*"[^"]*"' \
    | grep -viE "placeholder[[:space:]]*=[[:space:]]*'[^']*'" \
    | grep -viE 'placeholder[[:space:]]*=[[:space:]]*\{' \
    | grep -viE '::placeholder' \
    | grep -viE '["'\'']placeholder["'\'']?[[:space:]]*:' \
    | grep -viE '\bplaceholder[[:space:]]*:[[:space:]]*["'\'']' \
    | grep -viE 'aria-placeholder' \
    | grep -viE 'search.*placeholder|placeholder.*search' \
    || true)

  # Now, from remaining matches, flag only obvious scaffolding patterns:
  scaffolding=$(echo "$matches" | grep -iE '(//|/\*|#|<!--)[[:space:]]*placeholder|return[[:space:]]+["'\'']placeholder["'\'']|TODO.*placeholder|FIXME.*placeholder|STUB.*placeholder' || true)

  if [ -n "$scaffolding" ]; then
    echo "Anti-scaffolding check failed in: $f"
    echo "$scaffolding"
    found_issues=1
  fi
done

if [ "$found_issues" -ne 0 ]; then
  echo ""
  echo "Remove scaffolding/placeholder code before committing."
  exit 1
fi

exit 0
