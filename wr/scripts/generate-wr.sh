#!/bin/bash

# generate-wr.sh - Generate a WR for a specific repository
# Usage: ./generate-wr.sh <repo-name>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WR_DIR="$(dirname "$SCRIPT_DIR")"
TEMPLATE_FILE="$WR_DIR/WR_TEMPLATE.md"
REPOS_DIR="$WR_DIR/repos"

# Check if repo name provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Repository name required${NC}"
    echo "Usage: $0 <repo-name>"
    echo "Example: $0 neurooz"
    exit 1
fi

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: gh CLI not found${NC}"
    echo "Please install GitHub CLI: https://cli.github.com/"
    echo "Or authenticate: gh auth login"
    exit 1
fi

# Check if gh CLI is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: gh CLI not authenticated${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

REPO_NAME="$1"
OUTPUT_FILE="$REPOS_DIR/${REPO_NAME}.md"

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${RED}Error: Template file not found: $TEMPLATE_FILE${NC}"
    exit 1
fi

# Check if WR already exists
if [ -f "$OUTPUT_FILE" ]; then
    echo -e "${YELLOW}Warning: WR already exists for $REPO_NAME${NC}"
    read -p "Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
fi

echo -e "${GREEN}Fetching repository data for $REPO_NAME...${NC}"

# Fetch repo data from GitHub API (using gh CLI if available)
if command -v gh &> /dev/null; then
    echo "Using gh CLI to fetch repository metadata..."
    
    REPO_DATA=$(gh api repos/midnghtsapphire/$REPO_NAME 2>/dev/null || echo "")
    
    if [ -z "$REPO_DATA" ]; then
        echo -e "${YELLOW}Warning: Could not fetch repo data from GitHub API${NC}"
        echo "Creating WR with placeholder data..."
        
        # Use placeholder data
        CREATED_DATE="Unknown"
        UPDATED_DATE="$(date +%Y-%m-%d)"
        PRIMARY_LANGUAGE="Unknown"
        REPO_URL="https://github.com/midnghtsapphire/$REPO_NAME"
        DESCRIPTION="No description available"
        STARS="0"
        OPEN_ISSUES="0"
        IS_PRIVATE="Unknown"
        IS_ARCHIVED="Unknown"
    else
        # Parse JSON data
        CREATED_DATE=$(echo "$REPO_DATA" | jq -r '.created_at[:10]')
        UPDATED_DATE=$(echo "$REPO_DATA" | jq -r '.updated_at[:10]')
        PRIMARY_LANGUAGE=$(echo "$REPO_DATA" | jq -r '.language // "Unknown"')
        REPO_URL=$(echo "$REPO_DATA" | jq -r '.html_url')
        DESCRIPTION=$(echo "$REPO_DATA" | jq -r '.description // "No description available"')
        STARS=$(echo "$REPO_DATA" | jq -r '.stargazers_count')
        OPEN_ISSUES=$(echo "$REPO_DATA" | jq -r '.open_issues_count')
        IS_PRIVATE=$(echo "$REPO_DATA" | jq -r '.private')
        IS_ARCHIVED=$(echo "$REPO_DATA" | jq -r '.archived')
    fi
else
    echo -e "${YELLOW}Warning: gh CLI not found. Using placeholder data.${NC}"
    CREATED_DATE="Unknown"
    UPDATED_DATE="$(date +%Y-%m-%d)"
    PRIMARY_LANGUAGE="Unknown"
    REPO_URL="https://github.com/midnghtsapphire/$REPO_NAME"
    DESCRIPTION="No description available"
    STARS="0"
    OPEN_ISSUES="0"
    IS_PRIVATE="Unknown"
    IS_ARCHIVED="Unknown"
fi

RESEARCH_DATE=$(date +%Y-%m-%d)

echo -e "${GREEN}Generating WR from template...${NC}"

# Create WR from template with substitutions
sed -e "s|{REPO_NAME}|$REPO_NAME|g" \
    -e "s|{REPO_URL}|$REPO_URL|g" \
    -e "s|{CREATED_DATE}|$CREATED_DATE|g" \
    -e "s|{UPDATED_DATE}|$UPDATED_DATE|g" \
    -e "s|{PRIMARY_LANGUAGE}|$PRIMARY_LANGUAGE|g" \
    -e "s|{RESEARCH_DATE}|$RESEARCH_DATE|g" \
    -e "s|{DESCRIPTION}|$DESCRIPTION|g" \
    -e "s|{STARS}|$STARS|g" \
    -e "s|{OPEN_ISSUES}|$OPEN_ISSUES|g" \
    -e "s|{IS_PRIVATE}|$IS_PRIVATE|g" \
    -e "s|{IS_ARCHIVED}|$IS_ARCHIVED|g" \
    "$TEMPLATE_FILE" > "$OUTPUT_FILE"

echo -e "${GREEN}✓ WR created successfully!${NC}"
echo ""
echo "Location: $OUTPUT_FILE"
echo "Repository: $REPO_NAME"
echo "Created: $CREATED_DATE"
echo "URL: $REPO_URL"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review and complete the WR: $OUTPUT_FILE"
echo "2. Conduct deep web research for market analysis"
echo "3. Audit security vulnerabilities"
echo "4. Check deployment status"
echo "5. Update WR_TRACKER.md with status"
echo ""
echo "Edit the WR:"
echo "  vim $OUTPUT_FILE"
echo ""
echo "View the WR:"
echo "  cat $OUTPUT_FILE"
