#!/usr/bin/env bash
# Backfill Octopus-created issues into the WR routing pipeline.
#
# Maps Octopus's label vocabulary to the dispatcher's by adding
# `work-request` + `wr:code` labels and prepending `[WR]` to titles
# that don't have it. Idempotent — safe to re-run.
#
# Prefer the workflow_dispatch path on .github/workflows/octopus-route.yml
# with `backfill: true` for the same effect from CI. This script exists
# for local / emergency use.
#
# Requires: gh CLI authenticated.

set -euo pipefail

REPO="${REPO:-midnghtsapphire/revvel-standards}"
DRY_RUN="${DRY_RUN:-false}"

echo "Backfilling open octopus-review[bot] issues in $REPO ..."
echo "DRY_RUN=$DRY_RUN"
echo

# Pull every open issue authored by octopus-review[bot] (paginated).
ISSUES=$(gh api -X GET "search/issues" \
  -f "q=repo:$REPO is:issue is:open author:app/octopus-review" \
  --paginate \
  --jq '.items[] | {number: .number, title: .title, labels: [.labels[].name]}')

if [[ -z "$ISSUES" ]]; then
  echo "No open Octopus issues found."
  exit 0
fi

translated=0
skipped=0

while IFS= read -r row; do
  num=$(echo "$row" | jq -r '.number')
  title=$(echo "$row" | jq -r '.title')
  labels=$(echo "$row" | jq -r '.labels | join(",")')

  has_work_request=false
  has_wr_code=false
  [[ ",$labels," == *",work-request,"* ]] && has_work_request=true
  [[ ",$labels," == *",wr:code,"* ]] && has_wr_code=true

  to_add=()
  $has_work_request || to_add+=("work-request")
  $has_wr_code || to_add+=("wr:code")

  needs_title_fix=false
  if [[ ! "$title" =~ ^\[WR\] ]]; then
    needs_title_fix=true
  fi

  if [[ ${#to_add[@]} -eq 0 && "$needs_title_fix" == "false" ]]; then
    echo "  #$num: already routed — skip"
    ((skipped++)) || true
    continue
  fi

  echo "  #$num: $title"
  if [[ ${#to_add[@]} -gt 0 ]]; then
    echo "     + labels: ${to_add[*]}"
    if [[ "$DRY_RUN" != "true" ]]; then
      gh issue edit "$num" --repo "$REPO" \
        $(printf -- "--add-label %s " "${to_add[@]}") >/dev/null
    fi
  fi
  if [[ "$needs_title_fix" == "true" ]]; then
    new_title="[WR] $title"
    echo "     + retitled: $new_title"
    if [[ "$DRY_RUN" != "true" ]]; then
      gh issue edit "$num" --repo "$REPO" --title "$new_title" >/dev/null
    fi
  fi
  ((translated++)) || true
done < <(echo "$ISSUES" | jq -c '.')

echo
echo "Translated: $translated"
echo "Skipped:    $skipped"
