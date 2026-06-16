#!/bin/bash
# cleanup-repo.sh - Clean up old/stale issues and PRs

set -euo pipefail

REPO="midnghtsapphire/revvel-standards"
TOKEN="${GITHUB_TOKEN}"

echo "🧹 Cleaning up midnghtsapphire/revvel-standards"
echo "═══════════════════════════════════════════════"

# Close old FAILURE issues from May 2026
echo ""
echo "📌 Closing old FAILURE issues (May 2026)..."
MAY_ISSUES="3459 3461 3462 3464 3465 3467 3468 3470 3471 3474 3477 3479 3482 3483 3485 3486 3488 3489 3491 3492 3494 3495 3497 3498"

for i in $MAY_ISSUES; do
  result=$(curl -s -X PATCH \
    -H "Authorization: token $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"state": "closed", "state_reason": "not_planned"}' \
    "https://api.github.com/repos/$REPO/issues/$i")
  
  if echo "$result" | jq -e '.state == "closed"' > /dev/null 2>&1; then
    echo "  ✅ Closed #$i"
  else
    echo "  ⚠️  #$i - $(echo "$result" | jq -r '.title // .message')"
  fi
done

# Close duplicate WRs (same title)
echo ""
echo "📌 Closing duplicate WRs..."

# Find issues with same titles and close duplicates
echo "  Checking for duplicates..."

# Get all open WRs
WRs=$(curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/$REPO/issues?state=open&per_page=100&labels=work-request" | \
  jq -r '.[] | "\(.number)|\(.title)"')

declare -A title_counts
declare -A first_issue

while IFS='|' read -r num title; do
  if [ -n "$title" ]; then
    count=${title_counts[$title]:-0}
    title_counts[$title]=$((count + 1))
    
    if [ -z "${first_issue[$title]}" ]; then
      first_issue[$title]=$num
    fi
  fi
done <<< "$WRs"

# Close duplicates (keep lowest number)
for title in "${!title_counts[@]}"; do
  count=${title_counts[$title]}
  if [ "$count" -gt 1 ]; then
    first=${first_issue[$title]}
    echo "  Found $count duplicates of: $title"
    
    # Get all issue numbers for this title
    while IFS='|' read -r num t; do
      if [ "$t" = "$title" ] && [ "$num" != "$first" ]; then
        result=$(curl -s -X PATCH \
          -H "Authorization: token $TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"state": "closed", "state_reason": "duplicate", "comments": "Duplicate of #'${first}'"}' \
          "https://api.github.com/repos/$REPO/issues/$num")
        
        if echo "$result" | jq -e '.state == "closed"' > /dev/null 2>&1; then
          echo "    ✅ Closed duplicate #$num"
        fi
      fi
    done <<< "$WRs"
  fi
done

# Add stale label to issues > 14 days old
echo ""
echo "📌 Labeling stale issues (> 14 days old)..."
curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/$REPO/issues?state=open&per_page=100" | \
  jq -r '.[] | "\(.number)|\(.created_at)"' | while IFS='|' read -r num date; do
  
  # Calculate days since creation
  created=$(date -d "$date" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "${date:0:19}" +%s 2>/dev/null || echo "0")
  now=$(date +%s)
  days=$(( (now - created) / 86400 ))
  
  if [ "$days" -gt 14 ]; then
    # Add stale label if not already present
    result=$(curl -s -X POST \
      -H "Authorization: token $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"labels": ["stale"]}' \
      "https://api.github.com/repos/$REPO/issues/$num/labels" 2>/dev/null)
    
    echo "  ⏰ Labeled #$num as stale ($days days old)"
  fi
done

echo ""
echo "═══════════════════════════════════════════════"
echo "✅ Cleanup complete!"
echo "═══════════════════════════════════════════════"
