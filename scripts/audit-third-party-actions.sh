#!/usr/bin/env bash
# Third-party GitHub Action freshness audit.
#
# Scans .github/workflows/ for every `uses: <owner>/<action>@<ref>` line,
# classifies the action by publisher tier, and flags any single-author
# action whose latest release is older than the staleness threshold.
#
# Triggered by docs/THIRD_PARTY_ACTION_AUDIT.md — the recurrence guard
# added after sanjay3290/jules-pr-reviewer@v1 (abandoned, single-author)
# left PR #13916 with a stuck `jules/review` check.
#
# Output:
#   - Plain text report to stdout (default)
#   - JSON report to stderr if AUDIT_FORMAT=json (used by the workflow)
#
# Exit codes:
#   0 — no flagged actions
#   1 — flagged actions found (used by CI to file a tracking issue)
#   2 — script error
#
# Requires: gh (for release lookup), jq, grep, sort.
# Without gh auth, the script still classifies actions but skips release-age
# checks and treats unknown ages as "unknown" rather than "stale".

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
WORKFLOWS_DIR="${WORKFLOWS_DIR:-.github/workflows}"
# Default staleness: 12 months since last release.
STALENESS_MONTHS="${STALENESS_MONTHS:-12}"
# Output format: "text" (default) or "json".
AUDIT_FORMAT="${AUDIT_FORMAT:-text}"

# Publishers we trust without staleness checks (official / well-known).
# Add to this list as needed. Names are matched as exact owner prefix.
TRUSTED_OWNERS=(
  "actions"
  "github"
  "docker"
  "azure"
  "aws-actions"
  "google-github-actions"
  "hashicorp"
)

# Multi-author / org-published — still warn if stale, but don't flag as
# "single-author abandonment risk". Names are matched as exact owner prefix.
MULTI_AUTHOR_OWNERS=(
  "aquasecurity"
  "cypress-io"
  "digitalocean"
  "dopplerhq"
  "peter-evans"
  "peaceiris"
  "mentimeter"
  "neondatabase"
  "Mergifyio"
  "eco-infra"
  "green-coding-solutions"
  "BeksOmega"
)

# Exact owner/repo exceptions for active single-author actions that have
# already been dispositioned. Keep these narrow so one healthy project does not
# silently bless every other action from the same owner.
ACCEPTED_SINGLE_AUTHOR_ACTIONS=(
  # WR #14884: active releases/commits and already pinned to a full commit SHA.
  "robvanderleek/create-issue-branch"
  # WR #15673: org-published (ASD B.V.), active releases (v1.0.1), pinned to a
  # full commit SHA in devinci-debug.yml.
  "asd-engineering/asd-devinci"
  # WR #15672: Devin code-review lane (devin-code-review.yml); pinned to the
  # full v1 commit SHA per docs/THIRD_PARTY_ACTION_AUDIT.md disposition rules.
  "aaronsteers/devin-action"
  # WR #16270: markdown image empty-alt checker. Single-author, last release
  # 2023-04-21 (node16). Pinned to the v1 commit SHA in
  # markdown-image-alt-text-checker.yml; the local script is the PR gate so an
  # abandoned upstream cannot stick a required check. Accept the exact action
  # so the quarterly audit does not re-open a tracking WR every run.
  "ruthtxh/markdown-image-alt-text-checker"
)

# ── Helpers ──────────────────────────────────────────────────────────────────

contains() {
  local needle="${1,,}"; shift
  local item
  for item in "$@"; do
    # Case-insensitive compare — GitHub owner names are case-insensitive,
    # so a workflow file that says `BeksOmega/...` must match the
    # `BeksOmega` entry in MULTI_AUTHOR_OWNERS regardless of how either
    # side is cased. We lowercase BOTH sides at comparison time so the
    # OPTIONS array can keep its readable mixed-case entries. Without this,
    # mixed-case references silently mis-tier and the audit emits false
    # single-author warnings (Octopus finding #14004).
    [[ "${item,,}" == "$needle" ]] && return 0
  done
  return 1
}

classify_action() {
  local action="$1"
  local owner="${action%%/*}"
  if contains "$action" "${ACCEPTED_SINGLE_AUTHOR_ACTIONS[@]}"; then
    echo "multi-author"
  elif contains "$owner" "${TRUSTED_OWNERS[@]}"; then
    echo "trusted"
  elif contains "$owner" "${MULTI_AUTHOR_OWNERS[@]}"; then
    echo "multi-author"
  else
    echo "single-author"
  fi
}

# Returns last release ISO timestamp via gh, or empty string on failure.
last_release_date() {
  local repo="$1"
  if ! command -v gh >/dev/null 2>&1; then
    return 0
  fi
  gh api "repos/$repo/releases/latest" \
    --jq '.published_at // empty' 2>/dev/null || echo ""
}

# Days between an ISO date and today. Tries GNU `date -d` first (Linux
# runners) and falls back to BSD `date -j -f` (macOS / local dev). Without
# the BSD fallback, every age check silently returned empty on macOS and
# all single-author actions got demoted to `warn` instead of `flag`,
# making the tool misleading when run locally (Octopus finding #14000).
days_since() {
  local iso="$1"
  [[ -z "$iso" ]] && { echo ""; return; }
  local then_secs now_secs
  then_secs=$(date -d "$iso" +%s 2>/dev/null) \
    || then_secs=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$iso" +%s 2>/dev/null) \
    || then_secs=""
  [[ -z "$then_secs" ]] && { echo ""; return; }
  now_secs=$(date +%s)
  echo $(( (now_secs - then_secs) / 86400 ))
}

# ── Scan ─────────────────────────────────────────────────────────────────────

if [[ ! -d "$WORKFLOWS_DIR" ]]; then
  echo "audit: no $WORKFLOWS_DIR directory; nothing to scan" >&2
  exit 0
fi

# Collect unique owner/repo pairs from `uses:` lines.
# Strip @ref, comments, and the sub-path for monorepo actions
# (e.g. github/codeql-action/init → github/codeql-action).
mapfile -t USES < <(
  grep -rh -E "^[[:space:]]*-?[[:space:]]*uses:[[:space:]]*[^#]+" "$WORKFLOWS_DIR" 2>/dev/null \
    | sed -E 's/^[[:space:]]*-?[[:space:]]*uses:[[:space:]]*//' \
    | sed -E 's/[[:space:]]*#.*$//' \
    | sed -E 's/@.*$//' \
    | sed -E 's|^([^/]+/[^/]+)/.*$|\1|' \
    | grep -v '^\./' \
    | grep -v '^docker://' \
    | sort -u
)

# Use calendar-accurate days/month (~30.44) instead of a flat 30. For a
# 12-month threshold the old math gave 360 days, so an action released
# 361 days ago could be flagged when it's still within the calendar year.
# Octopus finding #13998.
stale_threshold_days=$(( (STALENESS_MONTHS * 3044 + 50) / 100 ))
flagged=()
report_rows=()
json_rows=()

for action in "${USES[@]}"; do
  [[ -z "$action" ]] && continue
  owner="${action%%/*}"
  tier=$(classify_action "$action")
  last_release=$(last_release_date "$action")
  age_days=$(days_since "$last_release")

  status="ok"
  reason=""

  case "$tier" in
    trusted)
      status="ok"
      ;;
    multi-author)
      if [[ -n "$age_days" && "$age_days" -gt "$stale_threshold_days" ]]; then
        status="warn"
        reason="multi-author but no release in ${age_days}d (>${stale_threshold_days}d)"
      fi
      ;;
    single-author)
      if [[ -z "$age_days" ]]; then
        status="warn"
        reason="single-author, no published release found (or rate-limited)"
      elif [[ "$age_days" -gt "$stale_threshold_days" ]]; then
        status="flag"
        reason="single-author, last release ${age_days}d ago (>${stale_threshold_days}d threshold)"
        flagged+=("$action")
      fi
      ;;
  esac

  report_rows+=("$(printf '%-9s %-13s %-50s %s' "$status" "$tier" "$action" "$reason")")

  # Escape for JSON.
  json_rows+=("$(jq -n \
    --arg action "$action" \
    --arg tier "$tier" \
    --arg last_release "${last_release:-}" \
    --arg age_days "${age_days:-}" \
    --arg status "$status" \
    --arg reason "$reason" \
    '{action:$action, tier:$tier, last_release:$last_release, age_days:$age_days, status:$status, reason:$reason}')")
done

# ── Output ───────────────────────────────────────────────────────────────────

if [[ "$AUDIT_FORMAT" == "json" ]]; then
  printf '%s\n' "${json_rows[@]}" | jq -s '.' > /dev/stderr || true
fi

printf '%-9s %-13s %-50s %s\n' "STATUS" "TIER" "ACTION" "NOTE"
printf '%-9s %-13s %-50s %s\n' "------" "----" "------" "----"
for row in "${report_rows[@]}"; do
  printf '%s\n' "$row"
done

echo
echo "Scanned ${#USES[@]} unique third-party actions."
echo "Threshold: ${STALENESS_MONTHS} months since last release for single-author actions."

if (( ${#flagged[@]} > 0 )); then
  echo
  echo "FLAGGED for review (${#flagged[@]}):"
  printf '  - %s\n' "${flagged[@]}"
  echo
  echo "See docs/THIRD_PARTY_ACTION_AUDIT.md for the response process."
  exit 1
fi

exit 0
