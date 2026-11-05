#!/usr/bin/env bash
# check-archival-policy.sh — RVS-AGENT-001 archival comment policy gate.
#
# Validates that every REVVEL-DISABLED block introduced in the current branch
# diff contains the required metadata fields (AGENT, MODEL, WR, DATE, STATUS).
# Also checks that no existing tracked files are being deleted.
#
# Deletions ALWAYS fail closed. No label, env, or flag may permit deletion.
#
# Exit codes:
#   0  — policy satisfied (or no violations found)
#   1  — policy violated (details printed to stderr)
#
# Env:
#   BASE_SHA        merge-base commit to diff against (auto-detected when unset)
#   GITHUB_TOKEN    (or GH_TOKEN) retained only for historical logging paths that
#                   are now commented out (2026-11-05). Not used for bypass.
#
# Usage in CI (CircleCI):
#   - run:
#       name: RVS-AGENT-001 archival policy check
#       command: bash .circleci/scripts/check-archival-policy.sh
#
# Reference: standards/COMMENT-DONT-DELETE.md
# OWNER RULE: AGENTS.md (Audrey Evans, 2026-10-30) — no label permits deletion.
# Audrey 2026-11-05 (via TriageChief): "ya not lets get rid of that."
#   ("that" = allow-destroy label bypass). Kill the bypass; keep old code visible.

set -euo pipefail

# ══════════════════════════════════════════════════════════════════════════════
# SUPERSEDED 2026-11-05 — allow-destroy / ALLOW_DESTROY bypass (COMMENTED OUT)
# Audrey Evans (exact, 2026-11-05 via TriageChief / t59u):
#   "ya not lets get rid of that. we also need to rewrite all the standards.
#    some of that is when i first started and didn't know any better then wrote
#    rules told them not to do it anymore and they were not deleting so i think
#    it could be more metal and less wordy"
# ("that" = allow-destroy label bypass)
# AGENTS.md OWNER RULE (2026-10-30): "NEVER delete … No label, flag, or agent
# judgment permits deletion."
# Keep the old path visible below. Do not revive. Fail closed always.
# Related draft #18261 runtime-ignored the bypass; this commit comments it out.
# ══════════════════════════════════════════════════════════════════════════════
#
# # ── allow-destroy resolution (DEAD — 2026-11-05) ────────────────────────────
# # Historical: RVS-AGENT-001 §7 / no-destroy-guard.yml once treated the
# # `allow-destroy` label as human ratification of a deletion (#17829).
# resolve_allow_destroy() {
#   if [ -n "${ALLOW_DESTROY:-}" ]; then
#     echo "${ALLOW_DESTROY}"
#     return 0
#   fi
#   if [ -z "${CIRCLE_PULL_REQUEST:-}" ]; then
#     echo "false"
#     return 0
#   fi
#   local pr_number="${CIRCLE_PULL_REQUEST##*/}"
#   case "$pr_number" in
#     ''|*[!0-9]*)
#       echo "::warn:: could not read a PR number from CIRCLE_PULL_REQUEST" >&2
#       echo "false"; return 0 ;;
#   esac
#   local token="${GITHUB_TOKEN:-${GH_TOKEN:-}}"
#   if [ -z "$token" ]; then
#     echo "   ℹ️  allow-destroy cannot be checked: no GITHUB_TOKEN in this job." >&2
#     echo "false"; return 0
#   fi
#   local slug="${CIRCLE_PROJECT_USERNAME:-}/${CIRCLE_PROJECT_REPONAME:-}"
#   local body
#   if ! body="$(
#     printf 'header = "Authorization: Bearer %s"\nheader = "Accept: application/vnd.github+json"\n' "$token" \
#       | curl --config - --silent --show-error --fail --max-time 20 \
#           "https://api.github.com/repos/${slug}/pulls/${pr_number}" 2>/dev/null
#   )"; then
#     echo "   ℹ️  allow-destroy lookup failed. Staying strict." >&2
#     echo "false"; return 0
#   fi
#   if printf '%s' "$body" | node -e '
#       let raw = "";
#       process.stdin.on("data", (c) => { raw += c; });
#       process.stdin.on("end", () => {
#         let pr;
#         try { pr = JSON.parse(raw); } catch { process.exit(1); }
#         const names = (pr.labels || []).map((l) => (typeof l === "string" ? l : l.name));
#         process.exit(names.includes("allow-destroy") ? 0 : 1);
#       });
#     '; then
#     echo "   ✅ allow-destroy label found — deletions ratified." >&2
#     echo "true"; return 0
#   fi
#   echo "false"
# }
# ALLOW_DESTROY="$(resolve_allow_destroy)"
#
# # Old gated deletion check (DEAD — used to skip when ALLOW_DESTROY=true):
# # if [ "$ALLOW_DESTROY" != "true" ]; then
# #   DELETED_FILES=... ; fail if deletions
# # fi
# ══════════════════════════════════════════════════════════════════════════════

ERRORS=0

# ── Determine diff base ────────────────────────────────────────────────────────
if [ -z "${BASE_SHA:-}" ]; then
  BASE_SHA="$(git merge-base origin/main HEAD 2>/dev/null || true)"
fi

if [ -z "$BASE_SHA" ]; then
  echo "ERROR: Could not determine merge-base with origin/main." >&2
  echo "       Set BASE_SHA in the environment or ensure origin/main is fetched." >&2
  exit 1
fi

echo "🔍 RVS-AGENT-001 archival policy check (diff base: ${BASE_SHA:0:8}…)"
echo ""

# ── 1. File deletions (ALWAYS fail closed — 2026-11-05) ───────────────────────
# No label may permit deletion. allow-destroy / ALLOW_DESTROY are dead (above).
if [ -n "${ALLOW_DESTROY:-}" ] && [ "${ALLOW_DESTROY}" = "true" ]; then
  echo "   ⚠️  ALLOW_DESTROY=true is IGNORED (dead bypass). Audrey 2026-11-05 +" >&2
  echo "      AGENTS.md OWNER RULE (2026-10-30): no label/flag permits deletion." >&2
fi

DELETED_FILES=$(git diff --name-only --diff-filter=D "$BASE_SHA" HEAD 2>/dev/null || true)
if [ -n "$DELETED_FILES" ]; then
  echo "❌ Deleted files detected:" >&2
  while IFS= read -r f; do
    echo "   - $f" >&2
  done <<< "$DELETED_FILES"
  echo "" >&2
  echo "   Per AGENTS.md OWNER RULE (2026-10-30) and Audrey 2026-11-05:" >&2
  echo "   tracked files must not be deleted. allow-destroy is dead." >&2
  echo "   Comment out with REVVEL-DISABLED, or archive-rename (Archive/YYYY-MM-DD/)." >&2
  echo "   Do not delete. Do not suggest the allow-destroy label." >&2
  ERRORS=$((ERRORS + 1))
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
    # The per-line loop below runs several greps per line. Fed a large binary
    # (a PDF, video or zip in an upload archive) it ran until CircleCI killed
    # the job, failing policy-check without ever reporting a violation. A file
    # that never mentions the token cannot open or close a block, so skip it
    # with one whole-file scan.
    # Earlier form skipped binaries first and lacked "--": a single NUL byte let
    # a malformed block evade the gate, and a path starting with "-" was read
    # as a grep option and silently skipped:
    # grep -Iq . "$file" 2>/dev/null || continue
    # grep -qF 'REVVEL-DISABLED' "$file" || continue
    grep -aqF 'REVVEL-DISABLED' -- "$file" || continue
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
