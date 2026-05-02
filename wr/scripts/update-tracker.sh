#!/bin/bash

# update-tracker.sh - Update WR_TRACKER.md with current status
# Usage: ./update-tracker.sh

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
REPOS_DIR="$WR_DIR/repos"
TRACKER_FILE="$WR_DIR/WR_TRACKER.md"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   WR Tracker Update                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Count WRs
echo "Scanning WR directory..."
TOTAL_WRS=$(find "$REPOS_DIR" -name "*.md" -type f 2>/dev/null | wc -l)
IN_PROGRESS=$(grep -l "🟡 In Progress" "$REPOS_DIR"/*.md 2>/dev/null | wc -l)
COMPLETED=$(grep -l "✅ Complete" "$REPOS_DIR"/*.md 2>/dev/null | wc -l)
SHIP_READY=$(grep -l "🚀" "$REPOS_DIR"/*.md 2>/dev/null | wc -l)

echo ""
echo -e "${GREEN}WR Statistics:${NC}"
echo "  Total WRs Created: $TOTAL_WRS"
echo "  In Progress: $IN_PROGRESS"
echo "  Completed: $COMPLETED"
echo "  Ship-Ready: $SHIP_READY"
echo ""

# Update tracker file header
if [ -f "$TRACKER_FILE" ]; then
    echo "Updating tracker file..."
    
    # Update statistics in the tracker
    CURRENT_DATE=$(date +%Y-%m-%d)
    
    # Create temp file with updated stats
    sed -i "s/\*\*Total Repositories:\*\* .*/\*\*Total Repositories:\*\* 140/" "$TRACKER_FILE"
    sed -i "s/\*\*WRs Created:\*\* .*/\*\*WRs Created:\*\* $TOTAL_WRS/" "$TRACKER_FILE"
    sed -i "s/\*\*WRs In Progress:\*\* .*/\*\*WRs In Progress:\*\* $IN_PROGRESS/" "$TRACKER_FILE"
    sed -i "s/\*\*WRs Completed:\*\* .*/\*\*WRs Completed:\*\* $COMPLETED/" "$TRACKER_FILE"
    sed -i "s/\*\*Ship-to-Market Ready:\*\* .*/\*\*Ship-to-Market Ready:\*\* $SHIP_READY/" "$TRACKER_FILE"
    sed -i "s/\*\*Last Updated:\*\* .*/\*\*Last Updated:\*\* $CURRENT_DATE/" "$TRACKER_FILE"
    
    echo -e "${GREEN}✓ Tracker file updated${NC}"
else
    echo -e "${YELLOW}Warning: Tracker file not found: $TRACKER_FILE${NC}"
fi

echo ""
echo -e "${GREEN}Update complete!${NC}"
echo ""
echo "View tracker:"
echo "  cat $TRACKER_FILE"
