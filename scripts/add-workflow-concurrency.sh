#!/bin/bash
# Add concurrency controls to workflows missing them
#
# This script adds appropriate concurrency blocks to workflows based on their:
# - Triggers (PR, issue, scheduled)
# - Priority (P0, P1, P2)
# - Cancel behavior

set -euo pipefail

WORKFLOWS_DIR=".github/workflows"
DRY_RUN="${DRY_RUN:-false}"

echo "🔧 Adding concurrency controls to workflows..."
echo ""

if [ "$DRY_RUN" = "true" ]; then
  echo "⚠️ DRY RUN MODE - No files will be modified"
  echo ""
fi

# Function to add concurrency block after 'on:' section
add_concurrency() {
  local file="$1"
  local group="$2"
  local cancel="$3"
  local priority="$4"
  
  if grep -q "^concurrency:" "$file"; then
    echo "  ✓ Already has concurrency control"
    return 0
  fi
  
  echo "  + Adding concurrency control (Priority: $priority, Cancel: $cancel)"
  
  if [ "$DRY_RUN" = "true" ]; then
    return 0
  fi
  
  # Find the line number after the 'on:' section ends (before 'permissions:' or 'jobs:')
  local insert_line=$(awk '/^on:/,/^(permissions|jobs|env|concurrency):/{
    if (/^(permissions|jobs|env|concurrency):/) {
      print NR-1; 
      exit
    }
  }' "$file")
  
  if [ -z "$insert_line" ]; then
    echo "  ⚠️ Could not find insertion point, skipping"
    return 1
  fi
  
  # Create concurrency block with comment
  local comment="# $priority - "
  if [ "$priority" = "P0" ]; then
    comment+="Critical workflow: must complete before PR merge"
  elif [ "$priority" = "P1" ]; then
    comment+="Important workflow: can cancel old runs for newer commits"
  else
    comment+="Optional workflow: runs async, doesn't block merge"
  fi
  
  # Insert concurrency block
  local temp_file="${file}.tmp"
  awk -v line="$insert_line" -v group="$group" -v cancel="$cancel" -v comment="$comment" '
    NR == line {
      print "";
      print comment;
      print "concurrency:";
      print "  group: " group;
      print "  cancel-in-progress: " cancel;
      print "";
    }
    { print }
  ' "$file" > "$temp_file"
  
  mv "$temp_file" "$file"
  echo "  ✓ Concurrency control added"
}

# Process workflows
PROCESSED=0
SKIPPED=0

# PR-triggered workflows (high priority)
echo "📋 Processing PR-triggered workflows..."
echo ""

for workflow in "$WORKFLOWS_DIR"/*.yml; do
  name=$(basename "$workflow")
  
  # Skip if already has concurrency
  if grep -q "^concurrency:" "$workflow"; then
    continue
  fi
  
  # Check if PR-triggered
  if ! grep -qE "pull_request|pull_request_target" "$workflow"; then
    continue
  fi
  
  echo "Processing: $name"
  
  # Determine priority based on workflow name/purpose
  PRIORITY="P2"
  CANCEL="true"
  
  if echo "$name" | grep -qiE "review.*status|credential|secret|compliance|security"; then
    PRIORITY="P0"
    CANCEL="false"
  elif echo "$name" | grep -qiE "review|ai|label|triage|ready"; then
    PRIORITY="P1"
    CANCEL="true"
  fi
  
  # Generate group pattern
  GROUP="\${{ github.workflow }}-\${{ github.event.pull_request.number || github.ref }}"
  
  add_concurrency "$workflow" "$GROUP" "$CANCEL" "$PRIORITY"
  PROCESSED=$((PROCESSED + 1))
  echo ""
done

# Issue-triggered workflows
echo "📋 Processing issue-triggered workflows..."
echo ""

for workflow in "$WORKFLOWS_DIR"/*.yml; do
  name=$(basename "$workflow")
  
  # Skip if already has concurrency or is PR-triggered
  if grep -q "^concurrency:" "$workflow"; then
    continue
  fi
  
  if grep -qE "pull_request|pull_request_target" "$workflow"; then
    continue
  fi
  
  # Check if issue-triggered
  if ! grep -qE "^  issues:" "$workflow"; then
    continue
  fi
  
  echo "Processing: $name"
  
  PRIORITY="P1"
  CANCEL="false"
  
  if echo "$name" | grep -qiE "credential|secret|gatekeeper"; then
    PRIORITY="P0"
  fi
  
  GROUP="\${{ github.workflow }}-\${{ github.event.issue.number || inputs.issue_number || github.run_id }}"
  
  add_concurrency "$workflow" "$GROUP" "$CANCEL" "$PRIORITY"
  PROCESSED=$((PROCESSED + 1))
  echo ""
done

# Scheduled workflows
echo "📋 Processing scheduled workflows..."
echo ""

for workflow in "$WORKFLOWS_DIR"/*.yml; do
  name=$(basename "$workflow")
  
  # Skip if already has concurrency
  if grep -q "^concurrency:" "$workflow"; then
    continue
  fi
  
  # Skip if already processed
  if grep -qE "pull_request|^  issues:" "$workflow"; then
    continue
  fi
  
  # Check if scheduled
  if ! grep -qE "schedule:|cron:" "$workflow"; then
    continue
  fi
  
  echo "Processing: $name"
  
  PRIORITY="P2"
  CANCEL="false"
  
  GROUP="\${{ github.workflow }}"
  
  add_concurrency "$workflow" "$GROUP" "$CANCEL" "$PRIORITY"
  PROCESSED=$((PROCESSED + 1))
  echo ""
done

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Concurrency Control Update Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Processed: $PROCESSED workflows"
echo "Skipped (already configured): $SKIPPED workflows"
echo ""

if [ "$DRY_RUN" = "true" ]; then
  echo "⚠️ DRY RUN MODE - Run without DRY_RUN=true to apply changes"
else
  echo "✅ Changes applied!"
  echo ""
  echo "Next steps:"
  echo "  1. Review changes: git diff .github/workflows/"
  echo "  2. Run audit: ./scripts/audit-workflow-concurrency.sh"
  echo "  3. Commit: git add .github/workflows/ && git commit"
fi
