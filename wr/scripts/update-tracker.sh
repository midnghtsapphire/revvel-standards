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

# Count based on canonical WR Status field (not mentions anywhere in file)
IN_PROGRESS=0
COMPLETED=0
SHIP_READY=0

for wr_file in "$REPOS_DIR"/*.md; do
    [ -f "$wr_file" ] || continue
    
    # Extract the WR Status line and check its value
    if grep -q "^\*\*WR Status:\*\* 🟡 In Progress" "$wr_file"; then
        ((IN_PROGRESS++)) || true
    elif grep -q "^\*\*WR Status:\*\* ✅ Complete" "$wr_file"; then
        ((COMPLETED++)) || true
    elif grep -q "^\*\*WR Status:\*\* 🚀" "$wr_file"; then
        ((SHIP_READY++)) || true
    fi
done

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
    
    # Use portable sed (create backup, then rename)
    # This works on both GNU and BSD sed
    cp "$TRACKER_FILE" "${TRACKER_FILE}.bak"
    sed "s/\*\*Total Repositories:\*\* .*/\*\*Total Repositories:\*\* 140/" "${TRACKER_FILE}.bak" > "${TRACKER_FILE}.tmp1"
    sed "s/\*\*WRs Created:\*\* .*/\*\*WRs Created:\*\* $TOTAL_WRS/" "${TRACKER_FILE}.tmp1" > "${TRACKER_FILE}.tmp2"
    sed "s/\*\*WRs In Progress:\*\* .*/\*\*WRs In Progress:\*\* $IN_PROGRESS/" "${TRACKER_FILE}.tmp2" > "${TRACKER_FILE}.tmp3"
    sed "s/\*\*WRs Completed:\*\* .*/\*\*WRs Completed:\*\* $COMPLETED/" "${TRACKER_FILE}.tmp3" > "${TRACKER_FILE}.tmp4"
    sed "s/\*\*Ship-to-Market Ready:\*\* .*/\*\*Ship-to-Market Ready:\*\* $SHIP_READY/" "${TRACKER_FILE}.tmp4" > "${TRACKER_FILE}.tmp5"
    sed "s/\*\*Last Updated:\*\* .*/\*\*Last Updated:\*\* $CURRENT_DATE/" "${TRACKER_FILE}.tmp5" > "$TRACKER_FILE"
    rm -f "${TRACKER_FILE}.bak" "${TRACKER_FILE}.tmp"*
    
    echo -e "${GREEN}✓ Tracker file updated${NC}"
else
    echo -e "${YELLOW}Warning: Tracker file not found: $TRACKER_FILE${NC}"
fi

echo ""
echo -e "${GREEN}Update complete!${NC}"
echo ""
echo "View tracker:"
echo "  cat $TRACKER_FILE"
