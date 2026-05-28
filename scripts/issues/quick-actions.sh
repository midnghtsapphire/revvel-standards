#!/bin/bash
#
# GitHub Issues UI Quick Actions
# Enhanced CLI workflows for faster issue management
#
# Usage: source this file in your .bashrc/.zshrc or run directly
#

# Configuration
REPO_OWNER="${GITHUB_REPO_OWNER:-midnghtsapphire}"
REPO_NAME="${GITHUB_REPO_NAME:-revvel-standards}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Quick issue creation with AI triage
issue_create_quick() {
  local type="$1"
  local title="$2"
  local body="$3"
  
  gh issue create \
    --repo "$REPO_OWNER/$REPO_NAME" \
    --title "[$type] $title" \
    --body "$body" \
    --label "needs-triage" \
    --assignee "@me"
}

# Create issue with linked branch and PR
issue_create_with_pr() {
  local title="$1"
  local body="$2"
  
  ISSUE=$(gh issue create \
    --repo "$REPO_OWNER/$REPO_NAME" \
    --title "$title" \
    --body "$body" \
    --label "enhancement" \
    --json number \
    --jq .number)
  
  # Branch name pattern: issue-{number}-{title-sanitized-40-chars}
  # Steps: lowercase → keep only alphanumeric+hyphen → limit 40 chars → remove trailing hyphens
  BRANCH="issue-$ISSUE-$(echo "$title" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]-' | cut -c1-40 | sed 's/-$//')"
  
  git fetch origin main
  git checkout -b "$BRANCH" origin/main
  
  echo -e "${GREEN}✅ Created issue #$ISSUE and branch $BRANCH${NC}"
}

# AI-powered issue search
issue_search() {
  local query="$1"
  
  echo -e "${CYAN}🔍 Searching for: $query${NC}"
  gh issue list \
    --repo "$REPO_OWNER/$REPO_NAME" \
    --state all \
    --limit 100 \
    --json number,title,body \
    --jq ".[] | select(.title + .body | ascii_downcase | contains(\"$query\" | ascii_downcase)) | \"#\(.number): \(.title)\""
}

# Batch label application
issue_batch_label() {
  local label="$1"
  shift
  
  echo -e "${BLUE}🏷️  Applying label '$label' to ${#@} issues...${NC}"
  for issue in "$@"; do
    gh issue edit "$issue" \
      --repo "$REPO_OWNER/$REPO_NAME" \
      --add-label "$label"
    echo -e "${GREEN}  ✓ Issue #$issue${NC}"
  done
}

# Issue metrics and statistics
issue_metrics() {
  echo -e "${PURPLE}📊 Issue Metrics for $REPO_OWNER/$REPO_NAME${NC}"
  echo ""
  
  local total_open=$(gh issue list --repo "$REPO_OWNER/$REPO_NAME" --state open --json number --jq length)
  local total_closed=$(gh issue list --repo "$REPO_OWNER/$REPO_NAME" --state closed --limit 1000 --json number --jq length)
  
  echo -e "Total Open: ${GREEN}$total_open${NC}"
  echo -e "Total Closed: ${CYAN}$total_closed${NC}"
  echo ""
  
  echo -e "${YELLOW}By Label:${NC}"
  gh label list --repo "$REPO_OWNER/$REPO_NAME" --json name --jq '.[].name' | while read -r label; do
    count=$(gh issue list --repo "$REPO_OWNER/$REPO_NAME" --label "$label" --json number --jq length)
    if [ "$count" -gt 0 ]; then
      echo -e "  $label: ${GREEN}$count${NC}"
    fi
  done
}

# Find issues by label
issue_by_label() {
  local label="$1"
  
  echo -e "${CYAN}Issues with label '$label':${NC}"
  gh issue list \
    --repo "$REPO_OWNER/$REPO_NAME" \
    --label "$label" \
    --json number,title,state \
    --jq '.[] | "#\(.number) [\(.state)]: \(.title)"'
}

# Find issues assigned to me
issue_my() {
  echo -e "${BLUE}My assigned issues:${NC}"
  gh issue list \
    --repo "$REPO_OWNER/$REPO_NAME" \
    --assignee "@me" \
    --json number,title,labels \
    --jq '.[] | "#\(.number): \(.title) [\(.labels | map(.name) | join(", "))]"'
}

# Issues created today
issue_today() {
  local today=$(date +%Y-%m-%d)
  
  echo -e "${GREEN}Issues created today ($today):${NC}"
  gh issue list \
    --repo "$REPO_OWNER/$REPO_NAME" \
    --json createdAt,number,title \
    --jq ".[] | select(.createdAt | startswith(\"$today\")) | \"#\(.number): \(.title)\""
}

# Bulk label bugs
issue_label_bugs() {
  echo -e "${RED}Auto-labeling bug-related issues...${NC}"
  gh issue list \
    --repo "$REPO_OWNER/$REPO_NAME" \
    --json number,title \
    --jq '.[] | select(.title | test("bug|error|crash|fail"; "i")) | .number' | \
    while read -r num; do
      gh issue edit "$num" --repo "$REPO_OWNER/$REPO_NAME" --add-label "bug"
      echo -e "${GREEN}  ✓ Issue #$num${NC}"
    done
}

# Export issues to CSV
issue_export() {
  local filename="${1:-issues-export-$(date +%Y-%m-%d).csv}"
  
  echo -e "${CYAN}Exporting issues to $filename...${NC}"
  
  echo "Number,Title,State,Labels,Assignees,Comments,Created,Updated" > "$filename"

  # Paginate via the REST API so we don't silently truncate at 1000 (the gh
  # --limit hard ceiling). Per Octopus audit 2026-05-28: repos with >1000
  # issues used to lose data here. Also: switched to @tsv internally to avoid
  # CSV corruption from titles with embedded commas/quotes, then convert TSV
  # rows to CSV-safe form via a final jq pass.
  local page=1
  while :; do
    local rows
    rows=$(gh api -X GET "/repos/$REPO_OWNER/$REPO_NAME/issues" \
      -f state=all -f per_page=100 -f page="$page" \
      --jq '
        [ .[] | select(.pull_request | not) | [
          .number,
          .title,
          .state,
          ([.labels[]?.name] | join(";")),
          ([.assignees[]?.login] | join(";")),
          .comments,
          .created_at,
          .updated_at
        ] ] | @json
      ') || break
    [ "$rows" = "[]" ] && break
    # Emit CSV-safe rows (jq's @csv handles quoting commas/newlines).
    echo "$rows" | jq -r '.[] | @csv' >> "$filename"
    page=$((page + 1))
  done

  echo -e "${GREEN}✅ Exported to $filename${NC}"
}

# Show help
issue_help() {
  cat << 'EOF'
GitHub Issues UI - Quick Actions CLI

Usage:
  issue_create_quick <type> <title> <body>  - Quick issue creation
  issue_create_with_pr <title> <body>       - Create issue + branch
  issue_search <query>                      - Search issues
  issue_batch_label <label> <issue>...      - Apply label to multiple issues
  issue_metrics                             - Show statistics
  issue_by_label <label>                    - Find issues by label
  issue_my                                  - Show my assigned issues
  issue_today                               - Issues created today
  issue_label_bugs                          - Auto-label bug-related issues
  issue_export [filename]                   - Export issues to CSV
  issue_help                                - Show this help

Examples:
  issue_create_quick "Bug" "API errors" "The /api/users endpoint returns 500"
  issue_search "authentication"
  issue_batch_label "priority:high" 123 456 789
  issue_metrics
  issue_export issues-2026-04-30.csv

Environment Variables:
  GITHUB_REPO_OWNER - Default: midnghtsapphire
  GITHUB_REPO_NAME  - Default: revvel-standards
EOF
}

# If script is executed directly (not sourced), show help
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  issue_help
fi
