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
#                   file-deletion check; mirrors no-destroy-guard.js behaviour).
#                   When unset, and CIRCLE_PULL_REQUEST names a PR, the label is
#                   resolved from the GitHub API — see resolve_allow_destroy().
#   BASE_SHA        merge-base commit to diff against (auto-detected when unset)
#   GITHUB_TOKEN    (or GH_TOKEN) read access, for that label lookup
#
# Usage in CI (CircleCI):
#   - run:
#       name: RVS-AGENT-001 archival policy check
#       command: bash .circleci/scripts/check-archival-policy.sh
#
# 2026-11-15: owner no-delete rule supersedes the historical label descriptions.
# No GitHub token/network access is needed. HEAD_SHA defaults to HEAD.
# Reference: standards/COMMENT-DONT-DELETE.md

set -euo pipefail

# ── allow-destroy resolution ──────────────────────────────────────────────────
#
# RVS-AGENT-001 §7 reserves deletion to a human, and the sanctioned way for a
# human to ratify one is the `allow-destroy` label. GitHub Actions'
# no-destroy-guard.yml reads that label. CircleCI's policy-check hardcoded
#
#     ALLOW_DESTROY: "false"
#
# in .circleci/config.yml, with a comment saying the label "is not available in
# CircleCI context" — so the sanctioned path had a required check that could
# never turn green, and a ratified deletion could not merge (#17829).
#
# The label IS reachable: CIRCLE_PULL_REQUEST carries the PR URL on every PR
# build. It needs a token, because this repository is private.
#
# Fails CLOSED, and says why. An unreadable label is not permission.
# REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
# REASON: 2026-10-30 owner rule prohibits all file deletion; labels/env cannot override it. No token or label lookup is needed.
# resolve_allow_destroy() {
#   # An explicit setting always wins — a human or another job may have decided.
#   if [ -n "${ALLOW_DESTROY:-}" ]; then
#     echo "${ALLOW_DESTROY}"
#     return 0
#   fi
#   if [ -z "${CIRCLE_PULL_REQUEST:-}" ]; then
#     echo "false"
#     return 0
#   fi
#
#   local pr_number="${CIRCLE_PULL_REQUEST##*/}"
#   case "$pr_number" in
#     ''|*[!0-9]*)
#       echo "::warn:: could not read a PR number from CIRCLE_PULL_REQUEST" >&2
#       echo "false"; return 0 ;;
#   esac
#
#   local token="${GITHUB_TOKEN:-${GH_TOKEN:-}}"
#   if [ -z "$token" ]; then
#     echo "   ℹ️  allow-destroy cannot be checked: no GITHUB_TOKEN in this job." >&2
#     echo "      Add GITHUB_TOKEN (read access) to the CircleCI project or a" >&2
#     echo "      context attached to policy-check, and a human's allow-destroy" >&2
#     echo "      label will ratify a deletion here as it already does in" >&2
#     echo "      no-destroy-guard.yml. Until then this check stays strict." >&2
#     echo "false"; return 0
#   fi
#
#   # Secret on stdin, never in argv — `curl -H "Authorization: Bearer $T"` puts
#   # the token in the process list for anything that can read /proc
#   # (CLAUDE.md gotcha #4). --config - takes the header from stdin instead.
#   local slug="${CIRCLE_PROJECT_USERNAME:-}/${CIRCLE_PROJECT_REPONAME:-}"
#   local body
#   if ! body="$(
#     printf 'header = "Authorization: Bearer %s"\nheader = "Accept: application/vnd.github+json"\n' "$token" \
#       | curl --config - --silent --show-error --fail --max-time 20 \
#           "https://api.github.com/repos/${slug}/pulls/${pr_number}" 2>/dev/null
#   )"; then
#     echo "   ℹ️  allow-destroy lookup failed (API unreachable or token lacks" >&2
#     echo "      access to ${slug}). Staying strict." >&2
#     echo "false"; return 0
#   fi
#
#   # Match the label by name inside the labels array, not anywhere in the body:
#   # a PR whose TITLE or BODY merely says "allow-destroy" must not ratify itself.
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
#     echo "   ✅ allow-destroy label found on PR #${pr_number} — deletions ratified." >&2
#     echo "true"; return 0
#   fi
#   echo "false"
# }
#
# ALLOW_DESTROY="$(resolve_allow_destroy)"
# REVVEL-DISABLED-END

ERRORS=0

# ── Determine diff base ────────────────────────────────────────────────────────
# REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
# REASON: Fail closed on missing refs or Git errors and compare the PR to its merge-base.
# if [ -z "${BASE_SHA:-}" ]; then
#   BASE_SHA="$(git merge-base origin/main HEAD 2>/dev/null || true)"
# fi
#
# if [ -z "$BASE_SHA" ]; then
#   echo "ERROR: Could not determine merge base with origin/main." >&2
#   echo "       Set BASE_SHA in the environment or ensure origin/main is fetched." >&2
#   exit 1
# fi
# REVVEL-DISABLED-END
# Resolve both commits and their actual common ancestor. Explicit BASE_SHA may
# name a diverged base tip; never diff that tip directly against the PR.
if ! HEAD_SHA="$(git rev-parse --verify --end-of-options "${HEAD_SHA:-HEAD}^{commit}" 2>/dev/null)"; then
  echo "ERROR: Could not resolve HEAD_SHA." >&2; exit 1
fi
if ! BASE_COMMIT="$(git rev-parse --verify --end-of-options "${BASE_SHA:-origin/main}^{commit}" 2>/dev/null)"; then
  echo "ERROR: Could not resolve BASE_SHA; ensure the base is fetched." >&2; exit 1
fi
if ! BASE_SHA="$(git merge-base "$BASE_COMMIT" "$HEAD_SHA" 2>/dev/null)"; then
  echo "ERROR: Could not determine merge base." >&2; exit 1
fi
# Disposable checked Git outputs only; no repository work is removed by cleanup.
SCAN_DIR="$(mktemp -d "$PWD/.archival-policy.XXXXXX")"
trap 'rm -rf -- "$SCAN_DIR"' EXIT

echo "🔍 RVS-AGENT-001 archival policy check (diff base: ${BASE_SHA:0:8}…)"
echo ""

# ── 1. File deletions ──────────────────────────────────────────────────────────
# REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
# REASON: Global deletion block; checked NUL-delimited paths cannot be split by tabs/newlines.
# if [ "$ALLOW_DESTROY" != "true" ]; then
#   DELETED_FILES=$(git diff --name-only --diff-filter=D "$BASE_SHA" HEAD 2>/dev/null || true)
#   if [ -n "$DELETED_FILES" ]; then
#     echo "❌ Deleted files detected:" >&2
#     while IFS= read -r f; do
#       echo "   - $f" >&2
#     done <<< "$DELETED_FILES"
#     echo "" >&2
#     echo "   Per RVS-AGENT-001 (standards/COMMENT-DONT-DELETE.md): tracked files" >&2
#     echo "   must not be silently deleted. Options:" >&2
#     echo "     1. Comment out file contents with REVVEL-DISABLED header + open an issue." >&2
#     echo "     2. Add the 'allow-destroy' label to the PR for intentional/ratified removal." >&2
#     ERRORS=$((ERRORS + 1))
#   fi
# fi
# REVVEL-DISABLED-END
if ! git diff --no-ext-diff --no-textconv --no-renames --name-only -z --diff-filter=D "$BASE_SHA" "$HEAD_SHA" -- > "$SCAN_DIR/deleted"; then
  echo "ERROR: Could not read deleted-file diff." >&2; exit 1
fi
if [ -s "$SCAN_DIR/deleted" ]; then
  echo "❌ Deleted files detected:" >&2
  while IFS= read -r -d '' f; do
    printf '   - %q\n' "$f" >&2
  done < "$SCAN_DIR/deleted"
  echo "   Owner rule: never delete tracked files; no label/env bypass is permitted." >&2
  echo "   Preserve existing work with dated REVVEL-DISABLED comments and additive edits." >&2
  ERRORS=$((ERRORS + 1))
fi

# ── 2. REVVEL-DISABLED block validation ───────────────────────────────────────
# Scan every added/modified file in the diff. If a file introduces a
# REVVEL-DISABLED block, verify the opening header has all required fields.
REQUIRED_FIELDS=("AGENT:" "MODEL:" "WR:" "DATE:" "STATUS:")
# REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
# REASON: Do not execute or dereference PR working-tree symlinks; inspect exact HEAD blobs as data.
# CHANGED_FILES=$(git diff --name-only --diff-filter=ACM "$BASE_SHA" HEAD 2>/dev/null || true)
#
# if [ -n "$CHANGED_FILES" ]; then
#   while IFS= read -r file; do
#     [ -f "$file" ] || continue
# REVVEL-DISABLED-END
if ! git diff --no-ext-diff --no-textconv --no-renames --name-only -z --diff-filter=ACMT "$BASE_SHA" "$HEAD_SHA" -- > "$SCAN_DIR/changed"; then
  echo "ERROR: Could not read changed-file diff." >&2; exit 1
fi

if [ -s "$SCAN_DIR/changed" ]; then
  while IFS= read -r -d '' file; do
    if ! git cat-file blob "$HEAD_SHA:$file" > "$SCAN_DIR/content" 2>/dev/null; then
      echo "ERROR: Could not read changed Git blob as data." >&2; exit 1
    fi
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
# REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
# REASON: Token pre-scan reads the checked Git blob, not an untrusted filesystem target.
#     grep -aqF 'REVVEL-DISABLED' -- "$file" || continue
# REVVEL-DISABLED-END
    grep -aqF 'REVVEL-DISABLED' -- "$SCAN_DIR/content" || continue
    # Read the current version of the file and scan for blocks
    IN_BLOCK=false
    BLOCK_LINE=0
    LINE_NO=0
# REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
# REASON: Validate the final line even without a trailing newline.
#     while IFS= read -r line; do
# REVVEL-DISABLED-END
    while IFS= read -r line || [ -n "$line" ]; do
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
# REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
# REASON: Metadata headers may contain credentials; never publish raw excerpts.
#               echo "   Header: $BLOCK_HEADER" >&2
# REVVEL-DISABLED-END
              echo "   Header excerpt omitted; review the source locally." >&2
              echo "   See standards/COMMENT-DONT-DELETE.md §2.1 for the required format." >&2
              ERRORS=$((ERRORS + 1))
            fi
          done
          IN_BLOCK=false
          BLOCK_HEADER=""
        fi
      fi
# REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
# REASON: Validate only committed PR blob data.
#     done < "$file"
# REVVEL-DISABLED-END
    done < "$SCAN_DIR/content"
    # Unclosed block
    if [ "$IN_BLOCK" = true ]; then
      echo "❌ $file:$BLOCK_LINE — REVVEL-DISABLED block opened but never closed with REVVEL-DISABLED-END" >&2
      ERRORS=$((ERRORS + 1))
    fi
# REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
# REASON: NUL-safe file iteration instead of newline splitting.
#   done <<< "$CHANGED_FILES"
# REVVEL-DISABLED-END
  done < "$SCAN_DIR/changed"
fi

# ── Result ─────────────────────────────────────────────────────────────────────
echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "❌ RVS-AGENT-001 policy: $ERRORS violation(s) found." >&2
  echo "   Fix the issues above, or open an issue + get human ratification before merging." >&2
  exit 1
fi

echo "✅ RVS-AGENT-001 archival policy: all checks passed."
