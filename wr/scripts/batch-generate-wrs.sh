#!/bin/bash

# batch-generate-wrs.sh - Generate WRs for multiple repositories
# Usage: ./batch-generate-wrs.sh [all|p0|p1|<repo-list-file>]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WR_DIR="$(dirname "$SCRIPT_DIR")"
GENERATE_SCRIPT="$SCRIPT_DIR/generate-wr.sh"

# Make generate script executable
chmod +x "$GENERATE_SCRIPT"

MODE="${1:-p0}"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Batch WR Generation                  ║${NC}"
echo -e "${BLUE}║   Mode: $MODE                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Define P0 repositories (highest priority)
P0_REPOS=(
    "neurooz"
    "affiliate-marketing-system"
    "WEBSITE-FACTORY-API"
    "WEBSITE-FACTORY-GENERATOR"
    "premolt"
)

# Define P1 repositories (high priority)
P1_REPOS=(
    "Meetaudreyevans"
    "code-review-mcp-server"
    "Lifehub"
    "MCP-AUTH"
    "MCP-AFFILIATE"
    "MCP-PAYMENT"
    "MCP-SUBSCRIPTION"
    "MCP-USER-DASHBOARD"
    "MCP-ADMIN-DASHBOARD"
)

# Function to generate WR for a repository
generate_wr_for_repo() {
    local repo_name="$1"
    echo -e "${GREEN}Generating WR for: $repo_name${NC}"
    
    # Run generation script - preserve stderr for error messages
    if echo "y" | "$GENERATE_SCRIPT" "$repo_name"; then
        echo -e "${GREEN}✓ WR generated for $repo_name${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ Failed to generate WR for $repo_name${NC}"
        echo ""
        return 1
    fi
}

case "$MODE" in
    "p0")
        echo "Generating WRs for P0 (highest priority) repositories..."
        echo "Repositories: ${#P0_REPOS[@]}"
        echo ""
        
        FAILED_COUNT=0
        for repo in "${P0_REPOS[@]}"; do
            generate_wr_for_repo "$repo" || ((++FAILED_COUNT))
        done
        
        if [ $FAILED_COUNT -gt 0 ]; then
            echo -e "${RED}Failed to generate $FAILED_COUNT WR(s)${NC}"
            exit 1
        fi
        ;;
        
    "p1")
        echo "Generating WRs for P1 (high priority) repositories..."
        echo "Repositories: ${#P1_REPOS[@]}"
        echo ""
        
        FAILED_COUNT=0
        for repo in "${P1_REPOS[@]}"; do
            generate_wr_for_repo "$repo" || ((++FAILED_COUNT))
        done
        
        if [ $FAILED_COUNT -gt 0 ]; then
            echo -e "${RED}Failed to generate $FAILED_COUNT WR(s)${NC}"
            exit 1
        fi
        ;;
        
    "all")
        echo -e "${YELLOW}WARNING: This will generate WRs for ALL repositories (may take a while)${NC}"
        echo "This mode is not yet implemented. Please use 'p0' or 'p1' mode."
        echo ""
        echo "To generate WRs for all repos:"
        echo "1. Get list of all repos: gh repo list midnghtsapphire --limit 1000 --json name -q '.[].name'"
        echo "2. Pipe to this script"
        exit 1
        ;;
        
    *)
        # Custom list from file
        if [ -f "$MODE" ]; then
            echo "Generating WRs from file: $MODE"
            echo ""
            
            while IFS= read -r repo; do
                # Skip empty lines and comments
                [[ -z "$repo" || "$repo" =~ ^# ]] && continue
                generate_wr_for_repo "$repo"
            done < "$MODE"
        else
            echo -e "${RED}Error: Unknown mode or file not found: $MODE${NC}"
            echo ""
            echo "Usage: $0 [all|p0|p1|<repo-list-file>]"
            echo ""
            echo "Modes:"
            echo "  p0   - Generate WRs for P0 (highest priority) repositories"
            echo "  p1   - Generate WRs for P1 (high priority) repositories"
            echo "  all  - Generate WRs for all repositories (not yet implemented)"
            echo "  <file> - Generate WRs from custom repository list file"
            exit 1
        fi
        ;;
esac

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Batch Generation Complete!           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo "1. Review generated WRs in: $WR_DIR/repos/"
echo "2. Complete research sections"
echo "3. Update WR_TRACKER.md"
echo "4. Create issues for implementation tasks"
