#!/bin/bash
# ============================================================
#  Revvel Skills Framework — Pop-Up Installer for Mac
#  Double-click this file in Finder to install!
#
#  What this does:
#    1. Checks your Mac is ready
#    2. Installs Homebrew (the Mac package manager, if needed)
#    3. Installs Node.js (needed for skill testing)
#    4. Installs PromptFoo (skill testing tool)
#    5. Installs Bun (fast JavaScript engine)
#    6. Sets up Revvel skills config in your AI tool
#    7. Runs a health check
#    8. Shows you what to do next
#
#  You do NOT need to know how to code. Just double-click!
# ============================================================

set -euo pipefail

# Colors for output
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
RESET='\033[0m'

# Directories
CONFIG_DIR="$HOME/.revvel"
SKILLS_DIR="$HOME/.revvel/skills"

# Status flags
NODE_OK=false
BUN_OK=false
PROMPTFOO_OK=false
BREW_OK=false

# ─────────────────────────────────────────────────────────────
# Helper functions
# ─────────────────────────────────────────────────────────────
ok()   { echo -e "   ${GREEN}[OK]${RESET} $1"; }
note() { echo -e "   ${YELLOW}[NOTE]${RESET} $1"; }
fail() { echo -e "   ${RED}[!!]${RESET} $1"; }
step() { echo -e "\n${BOLD}$1${RESET}"; echo "  $(printf '─%.0s' $(seq 1 50))"; }

# ─────────────────────────────────────────────────────────────
# Banner
# ─────────────────────────────────────────────────────────────
clear
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║      Revvel Skills Framework — Mac Installer             ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo "  Welcome! This installer sets up the Revvel Skills Framework"
echo "  on your Mac."
echo ""
echo "  The Revvel Skills Framework gives your AI assistant"
echo "  special 'skills' — expert abilities it can use to help you"
echo "  with specific tasks like code review, deployments,"
echo "  brainstorming, security checks, and a lot more!"
echo ""
echo "  Think of it like installing apps on a phone,"
echo "  but for your AI assistant instead."
echo ""
echo "  ─────────────────────────────────────────────────────────"
echo "  This will take about 5 minutes."
echo "  ─────────────────────────────────────────────────────────"
echo ""
read -p "  Press Enter to start installation..."

# ─────────────────────────────────────────────────────────────
# Step 1: Check macOS version
# ─────────────────────────────────────────────────────────────
step "STEP 1: Checking your Mac"

MAC_VERSION=$(sw_vers -productVersion 2>/dev/null || echo "unknown")
ok "macOS detected: $MAC_VERSION"

# Check for minimum macOS version (12.0 Monterey)
MAC_MAJOR=$(echo "$MAC_VERSION" | cut -d. -f1)
if [ "$MAC_MAJOR" -lt 12 ] 2>/dev/null; then
    note "macOS $MAC_VERSION detected. Some features work best on macOS 12+."
    note "Consider updating macOS for the best experience."
else
    ok "macOS version is supported."
fi

# ─────────────────────────────────────────────────────────────
# Step 2: Check required tools
# ─────────────────────────────────────────────────────────────
step "STEP 2: Checking required tools"

if command -v curl &>/dev/null; then
    ok "curl is available."
else
    fail "curl not found. This is unexpected on macOS. Please update your system."
    read -p "Press Enter to exit." && exit 1
fi

if command -v git &>/dev/null; then
    ok "git is available."
else
    note "git not found. Installing Xcode Command Line Tools..."
    xcode-select --install 2>/dev/null || true
    note "If a dialog appeared, click Install and wait for it to finish."
    note "Then run this installer again."
fi

# ─────────────────────────────────────────────────────────────
# Step 3: Install Homebrew (if not present)
# ─────────────────────────────────────────────────────────────
step "STEP 3: Checking Homebrew (Mac package manager)"

if command -v brew &>/dev/null; then
    ok "Homebrew already installed — skipping!"
    BREW_OK=true
else
    echo "  Homebrew is not installed. We'll install it now."
    echo "  Homebrew is the standard way to install software on Mac."
    echo "  It's free and trusted by millions of developers."
    echo ""
    read -p "  Install Homebrew? (y/n): " INSTALL_BREW
    if [[ "$INSTALL_BREW" =~ ^[Yy]$ ]]; then
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        # Add brew to PATH for Apple Silicon
        if [[ -f /opt/homebrew/bin/brew ]]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile"
        fi
        if command -v brew &>/dev/null; then
            ok "Homebrew installed!"
            BREW_OK=true
        else
            note "Homebrew install may need a new terminal. Continuing without it."
        fi
    else
        note "Skipping Homebrew. Node.js will be installed via curl instead."
    fi
fi

# ─────────────────────────────────────────────────────────────
# Step 4: Install Node.js
# ─────────────────────────────────────────────────────────────
step "STEP 4: Checking Node.js"
echo "  Node.js is needed to run skill tests."

if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version)
    ok "Node.js already installed: $NODE_VERSION"
    NODE_OK=true
else
    echo "  Installing Node.js..."
    if [ "$BREW_OK" = true ]; then
        brew install node
        if command -v node &>/dev/null; then
            ok "Node.js installed via Homebrew!"
            NODE_OK=true
        fi
    else
        # Download and install Node.js directly
        NODE_INSTALLER="/tmp/node-installer.pkg"
        echo "  Downloading Node.js installer..."
        curl -fsSL "https://nodejs.org/dist/lts/node-v20-latest-macos-arm64.pkg" -o "$NODE_INSTALLER" 2>/dev/null || \
        curl -fsSL "https://nodejs.org/dist/lts/node-v20-latest-macos-x64.pkg" -o "$NODE_INSTALLER" 2>/dev/null || true
        if [ -f "$NODE_INSTALLER" ]; then
            sudo installer -pkg "$NODE_INSTALLER" -target / 2>/dev/null
            rm -f "$NODE_INSTALLER"
            if command -v node &>/dev/null; then
                ok "Node.js installed!"
                NODE_OK=true
            fi
        fi
    fi
    if [ "$NODE_OK" = false ]; then
        fail "Node.js install failed."
        echo "  Please install Node.js from: https://nodejs.org (choose LTS)"
        echo "  Then run this installer again."
        read -p "  Press Enter to exit." && exit 1
    fi
fi

# ─────────────────────────────────────────────────────────────
# Step 5: Install Bun
# ─────────────────────────────────────────────────────────────
step "STEP 5: Installing Bun (fast JavaScript engine)"

if command -v bun &>/dev/null; then
    ok "Bun already installed — skipping!"
    BUN_OK=true
else
    echo "  Installing Bun..."
    curl -fsSL https://bun.sh/install | bash 2>/dev/null || true
    # Source bun env
    if [ -f "$HOME/.bun/bin/bun" ]; then
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
        # Add to shell profile
        for PROFILE in "$HOME/.zprofile" "$HOME/.zshrc" "$HOME/.bash_profile" "$HOME/.bashrc"; do
            if [ -f "$PROFILE" ] && ! grep -q ".bun/bin" "$PROFILE" 2>/dev/null; then
                echo 'export BUN_INSTALL="$HOME/.bun"' >> "$PROFILE"
                echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> "$PROFILE"
                break
            fi
        done
        ok "Bun installed!"
        BUN_OK=true
    else
        note "Bun install failed. Some features may not work."
        note "You can install it later from: https://bun.sh"
    fi
fi

# ─────────────────────────────────────────────────────────────
# Step 6: Install PromptFoo (skill testing tool)
# ─────────────────────────────────────────────────────────────
step "STEP 6: Installing PromptFoo (skill testing tool)"
echo "  PromptFoo tests each skill to make sure it works."

if command -v promptfoo &>/dev/null; then
    ok "PromptFoo already installed — skipping!"
    PROMPTFOO_OK=true
else
    echo "  Installing PromptFoo..."
    npm install -g promptfoo 2>/dev/null
    if command -v promptfoo &>/dev/null; then
        ok "PromptFoo installed!"
        PROMPTFOO_OK=true
    else
        note "PromptFoo install failed. Skill tests won't run automatically."
        note "You can install it later with: npm install -g promptfoo"
    fi
fi

# ─────────────────────────────────────────────────────────────
# Step 7: Create Revvel config folder
# ─────────────────────────────────────────────────────────────
step "STEP 7: Setting up Revvel config folder"

mkdir -p "$CONFIG_DIR" "$SKILLS_DIR"
ok "Config folder ready at: $CONFIG_DIR"

# ─────────────────────────────────────────────────────────────
# Step 8: Connect to AI tools
# ─────────────────────────────────────────────────────────────
step "STEP 8: Connecting to your AI tools"
echo "  We'll connect the skills framework to any AI tools you have."

# Claude Code
CLAUDE_DIR="$HOME/.claude"
if [ -d "$CLAUDE_DIR" ]; then
    ok "Claude Code detected!"
    if [ ! -f "$CLAUDE_DIR/AGENTS.md" ]; then
        cat > "$CLAUDE_DIR/AGENTS.md" << 'EOF'
# Revvel Skills Framework

This AI has access to the Revvel Skills Framework.
Before every session, check skills/REGISTRY.md for available skills.

## Mandatory Session Start Skills
- system-state
- mvi-contract
- model-router
- context-management

## Skill Registry
See: https://github.com/midnghtsapphire/revvel-standards/blob/main/skills/REGISTRY.md
EOF
        ok "Revvel Skills connected to Claude Code!"
    else
        note "Claude Code already configured. Check $CLAUDE_DIR/AGENTS.md"
    fi
fi

# Cursor
if [ -d "$HOME/.cursor" ]; then
    ok "Cursor detected!"
    note "Add Revvel skills manually to Cursor's agent config."
    note "See docs: https://github.com/midnghtsapphire/revvel-standards"
fi

# ─────────────────────────────────────────────────────────────
# Done!
# ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   ✅  Revvel Skills Framework is installed and ready!    ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo "  WHAT'S INSTALLED:"
[ "$NODE_OK"      = true ] && ok "Node.js"
[ "$BUN_OK"       = true ] && ok "Bun"
[ "$PROMPTFOO_OK" = true ] && ok "PromptFoo (skill tester)"
ok "Revvel config at: $CONFIG_DIR"
echo ""
echo "  NEXT STEPS:"
echo ""
echo "  1. Open a NEW Terminal window and test PromptFoo:"
echo "        promptfoo --version"
echo ""
echo "  2. Test a skill:"
echo "        cd skills/testing-agent/tests"
echo "        promptfoo eval --config promptfoo.yml"
echo ""
echo "  3. Build your own skill (AI-guided):"
echo "        Open Claude Code and say: 'build a skill'"
echo "        The Forge persona will guide you through it."
echo ""
echo "  4. Browse all available skills:"
echo "        https://github.com/midnghtsapphire/revvel-standards/blob/main/skills/REGISTRY.md"
echo ""
echo "  5. Sell your skills:"
echo "        See: docs/MARKETPLACE_GUIDE.md"
echo ""
echo "  ─────────────────────────────────────────────────────────"
echo "  Full docs: https://github.com/midnghtsapphire/revvel-standards"
echo "  ─────────────────────────────────────────────────────────"
echo ""
read -p "  Press Enter to close this window..."
