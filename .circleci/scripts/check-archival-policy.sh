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
# build. A token is only required when the GitHub API refuses an anonymous
# read (private repo, or rate-limited). This repo is public — PR labels
# return 200 without auth. Job 18484 on #17891 stayed red after allow-destroy
# was applied because the old path refused to call the API at all when
# CircleCI had no GITHUB_TOKEN, so the sanctioned label could never ratify.
#
# Fails CLOSED, and says why. An unreadable label is not permission.
resolve_allow_destroy() {
  # An explicit setting always wins — a human or another job may have decided.
  if [ -n "${ALLOW_DESTROY:-}" ]; then
    echo "${ALLOW_DESTROY}"
    return 0
  fi
  if [ -z "${CIRCLE_PULL_REQUEST:-}" ]; then
    echo "false"
    return 0
  fi

  local pr_number="${CIRCLE_PULL_REQUEST##*/}"
  case "$pr_number" in
    ''|*[!0-9]*)
      echo "::warn:: could not read a PR number from CIRCLE_PULL_REQUEST" >&2
      echo "false"; return 0 ;;
  esac

  local token="${GITHUB_TOKEN:-${GH_TOKEN:-}}"
  # Secret on stdin, never in argv — `curl -H "Authorization: Bearer $T"` puts
  # the token in the process list for anything that can read /proc
  # (CLAUDE.md gotcha #4). --config - takes the header from stdin instead.
  # Authorization is omitted when no token is set so a public repo can still
  # be read. Do not send "Bearer " with an empty token — GitHub treats that
  # as a bad credential and 401s a request that would have been 200 anonymous.
  local slug="${CIRCLE_PROJECT_USERNAME:-}/${CIRCLE_PROJECT_REPONAME:-}"
  local curl_cfg
  if [ -n "$token" ]; then
    curl_cfg="$(printf 'header = "Authorization: Bearer %s"\nheader = "Accept: application/vnd.github+json"\n' "$token")"
  else
    curl_cfg=$'header = "Accept: application/vnd.github+json"\n'
  fi
  local body
  if ! body="$(
    printf '%s' "$curl_cfg" \
      | curl --config - --silent --show-error --fail --max-time 20 \
          "https://api.github.com/repos/${slug}/pulls/${pr_number}" 2>/dev/null
  )"; then
    if [ -z "$token" ]; then
      echo "   ℹ️  allow-destroy cannot be checked: anonymous GitHub API lookup" >&2
      echo "      failed and no GITHUB_TOKEN is set in this job." >&2
      echo "      Public repos should succeed without a token; if this repo is" >&2
      echo "      private, add GITHUB_TOKEN (read access) to the CircleCI" >&2
      echo "      project or a context attached to policy-check." >&2
    else
      echo "   ℹ️  allow-destroy lookup failed (API unreachable or token lacks" >&2
      echo "      access to ${slug}). Staying strict." >&2
    fi
    echo "false"; return 0
  fi

  # Match the label by name inside the labels array, not anywhere in the body:
  # a PR whose TITLE or BODY merely says "allow-destroy" must not ratify itself.
  if printf '%s' "$body" | node -e '
      let raw = "";
      process.stdin.on("data", (c) => { raw += c; });
      process.stdin.on("end", () => {
        let pr;
        try { pr = JSON.parse(raw); } catch { process.exit(1); }
        const names = (pr.labels || []).map((l) => (typeof l === "string" ? l : l.name));
        process.exit(names.includes("allow-destroy") ? 0 : 1);
      });
    '; then
    echo "   ✅ allow-destroy label found on PR #${pr_number} — deletions ratified." >&2
    echo "true"; return 0
  fi
  echo "false"
}

ALLOW_DESTROY="$(resolve_allow_destroy)"
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
