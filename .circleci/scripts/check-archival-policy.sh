#!/usr/bin/env bash
# check-archival-policy.sh — RVS-AGENT-001 archival comment policy gate.
#
# Validates that every REVVEL-DISABLED block introduced in the current branch
# diff contains the required metadata fields (AGENT, MODEL, WR, DATE, STATUS).
# Also checks that no existing tracked files are being deleted without either:
#   (a) a REVVEL-DISABLED comment in the same commit, or
#   (b) the allow-destroy label (checked via ALLOW_DESTROY env, set by CI).
#
# Exit codes:
#   0  — policy satisfied (or no violations found)
#   1  — policy violated (details printed to stderr)
#
# Env:
#   ALLOW_DESTROY   'true' when the PR carries the allow-destroy label (skips
#                   file-deletion check; mirrors no-destroy-guard.js behaviour)
#   BASE_SHA        merge-base commit to diff against (auto-detected when unset)
#
# Usage in CI (CircleCI):
#   - run:
#       name: RVS-AGENT-001 archival policy check
#       command: bash .circleci/scripts/check-archival-policy.sh
#
# Reference: standards/COMMENT-DONT-DELETE.md

set -euo pipefail

ALLOW_DESTROY="${ALLOW_DESTROY:-false}"
ERRORS=0

# ── Determine diff base ────────────────────────────────────────────────────────
if [ -z "${BASE_SHA:-}" ]; then
  BASE_SHA="$(git merge-base origin/main HEAD 2>/dev/null || true)"
fi

if [ -z "$BASE_SHA" ]; then
  echo "ERROR: Could not determine merge base with origin/main." >&2
  echo "       Set BASE_SHA in the environment or ensure origin/main is fetched." >&2
  exit 1
fi

echo "🔍 RVS-AGENT-001 archival policy check (diff base: ${BASE_SHA:0:8}…)"
echo ""

# ── 1. File deletions ──────────────────────────────────────────────────────────
if [ "$ALLOW_DESTROY" != "true" ]; then
  DELETED_FILES=$(git diff --name-only --diff-filter=D "$BASE_SHA" HEAD 2>/dev/null || true)
  if [ -n "$DELETED_FILES" ]; then
    echo "❌ Deleted files detected:" >&2
    while IFS= read -r f; do
      echo "   - $f" >&2
    done <<< "$DELETED_FILES"
    echo "" >&2
    echo "   Per RVS-AGENT-001 (standards/COMMENT-DONT-DELETE.md): tracked files" >&2
    echo "   must not be silently deleted. Options:" >&2
    echo "     1. Comment out file contents with REVVEL-DISABLED header + open an issue." >&2
    echo "     2. Add the 'allow-destroy' label to the PR for intentional/ratified removal." >&2
    ERRORS=$((ERRORS + 1))
  fi
fi

# ── 2. REVVEL-DISABLED block validation ───────────────────────────────────────
# Scan every added/modified file in the diff. If a file introduces a
# REVVEL-DISABLED block, verify the opening header has all required fields.
REQUIRED_FIELDS=("AGENT:" "MODEL:" "WR:" "DATE:" "STATUS:")
CHANGED_FILES=$(git diff --name-only --diff-filter=ACM "$BASE_SHA" HEAD 2>/dev/null || true)

if [ -n "$CHANGED_FILES" ]; then
  while IFS= read -r file; do
    [ -f "$file" ] || continue
    # Only scan text files that could contain REVVEL-DISABLED blocks
    case "$file" in
      *.min.js|*.min.css|*.lock|package-lock.json) continue ;;
    esac
    # Read the current version of the file and scan for blocks
    IN_BLOCK=false
    BLOCK_LINE=0
    LINE_NO=0
    while IFS= read -r line; do
      LINE_NO=$((LINE_NO + 1))
      # Anchor on the canonical header shape (COMMENT-DONT-DELETE.md §3):
      # a real opener is a COMMENT — one of the comment markers the standard's
      # examples use (// # ; /* * <!-- --) followed by the token and its
      # pipe-separated field list. Anything looser opens phantom blocks on
      # prose: a bare-token match bit learnings.md's prose in PR #15623 (same
      # bug class as wr-lint rule 11), and a permissive any-punctuation prefix
      # still matched Markdown bullets/blockquotes (cubic review, same PR).
      # Markdown bullets ("- "), blockquotes (">"), and backtick code spans
      # ("`REVVEL-DISABLED |`") all fail this anchor; SQL "--" still passes.
      if echo "$line" | grep -qE '^[[:space:]]*(//|#|;|/\*|\*|<!--|--)[[:space:]]*REVVEL-DISABLED \|' && ! echo "$line" | grep -qF 'REVVEL-DISABLED-END'; then
        IN_BLOCK=true
        BLOCK_LINE=$LINE_NO
        BLOCK_HEADER="$line"
      elif echo "$line" | grep -qF 'REVVEL-DISABLED-END'; then
        if [ "$IN_BLOCK" = true ]; then
          # Validate required fields in opening header
          for field in "${REQUIRED_FIELDS[@]}"; do
            if ! echo "$BLOCK_HEADER" | grep -qF "$field"; then
              echo "❌ $file:$BLOCK_LINE — REVVEL-DISABLED block missing '$field'" >&2
              echo "   Header: $BLOCK_HEADER" >&2
              echo "   See standards/COMMENT-DONT-DELETE.md §2.1 for the required format." >&2
              ERRORS=$((ERRORS + 1))
            fi
          done
          IN_BLOCK=false
          BLOCK_HEADER=""
        fi
      fi
    done < "$file"
    # Unclosed block
    if [ "$IN_BLOCK" = true ]; then
      echo "❌ $file:$BLOCK_LINE — REVVEL-DISABLED block opened but never closed with REVVEL-DISABLED-END" >&2
      ERRORS=$((ERRORS + 1))
    fi
  done <<< "$CHANGED_FILES"
fi

# ── Result ─────────────────────────────────────────────────────────────────────
echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "❌ RVS-AGENT-001 policy: $ERRORS violation(s) found." >&2
  echo "   Fix the issues above, or open an issue + get human ratification before merging." >&2
  exit 1
fi

echo "✅ RVS-AGENT-001 archival policy: all checks passed."
