#!/bin/bash
# [Skill Name] — Pop-Up Installer for Mac
# Double-click this file in Finder to install!
#
# What this does:
#   1. Checks your Mac is ready
#   2. Installs any tools this skill needs
#   3. Connects the skill to your AI tool
#   4. Tests that everything works
#
# You do NOT need to know how to code. Just double-click!

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
RESET='\033[0m'

SKILL_NAME="[skill-name]"
SKILL_DISPLAY="[Skill Name]"

ok()   { echo -e "   ${GREEN}[OK]${RESET} $1"; }
note() { echo -e "   ${YELLOW}[NOTE]${RESET} $1"; }
fail() { echo -e "   ${RED}[!!]${RESET} $1"; }

clear
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   ${SKILL_DISPLAY} Installer for Mac${RESET}${BOLD}                            ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo "  [Plain-language description of what this skill does.]"
echo "  [2-3 sentences maximum. Write for an 8-year-old.]"
echo ""
read -p "  Press Enter to start installation..."

# Step 1: Check prerequisites
echo ""
echo -e "${BOLD}STEP 1: Checking required tools${RESET}"
echo "  ─────────────────────────────────────────────────────"

if command -v curl &>/dev/null; then
    ok "curl is available."
else
    fail "curl not found. Please update your macOS."
    read -p "Press Enter to exit." && exit 1
fi

# Add more prerequisite checks here as needed...

# Step 2: Install skill-specific dependencies
echo ""
echo -e "${BOLD}STEP 2: Installing skill dependencies${RESET}"
echo "  ─────────────────────────────────────────────────────"

# Add dependency installation steps here...

ok "Dependencies ready."

# Step 3: Connect skill to AI tool
echo ""
echo -e "${BOLD}STEP 3: Connecting ${SKILL_DISPLAY} to your AI tool${RESET}"
echo "  ─────────────────────────────────────────────────────"

CLAUDE_DIR="$HOME/.claude"
if [ -d "$CLAUDE_DIR" ]; then
    ok "Claude Code detected! ${SKILL_DISPLAY} connected."
fi

# Done!
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   ✅  ${SKILL_DISPLAY} is installed and ready!              ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo "  NEXT STEPS:"
echo "  1. [First step for using the skill]"
echo "  2. [Second step]"
echo "  3. [Third step]"
echo ""
read -p "  Press Enter to close this window..."
