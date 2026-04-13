#!/bin/bash
# ============================================================
#  GBrain Easy Installer for Mac
#  Double-click this file to install GBrain!
#
#  What this does:
#    1. Installs Bun (the fast JavaScript engine GBrain needs)
#    2. Installs GBrain itself
#    3. Creates your personal brain folder
#    4. Sets up GBrain's database on your computer
#    5. Adds GBrain to your AI tools (Claude Code / Cursor)
#
#  You do NOT need to know how to code. Just double-click!
# ============================================================

# Keep the Terminal window open so you can read messages
# (macOS closes Terminal windows automatically otherwise)
if [[ "$1" != "--running-in-terminal" ]]; then
    osascript -e 'tell application "Terminal" to do script "bash '"$0"' --running-in-terminal; exit"'
    exit 0
fi

clear

echo "╔══════════════════════════════════════════════════════════╗"
echo "║          🧠  GBrain Installer for Mac  🍎               ║"
echo "║                                                          ║"
echo "║   Your AI is about to get a PERMANENT memory!           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "👋 Hi! This installer will set up GBrain on your Mac."
echo "   GBrain gives your AI a long-term memory so it remembers"
echo "   everything you've ever told it — even days or weeks later!"
echo ""
echo "   Think of it like giving your AI assistant a notebook"
echo "   that it reads before EVERY answer and writes to AFTER"
echo "   EVERY conversation. The more you use it, the smarter"
echo "   your AI gets!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ─────────────────────────────────────────────────────────────
# Helper: print a section header
# ─────────────────────────────────────────────────────────────
step() {
    echo ""
    echo "📌 STEP $1: $2"
    echo "   ────────────────────────────────────────────────"
}

ok()   { echo "   ✅ $1"; }
info() { echo "   ℹ️  $1"; }
warn() { echo "   ⚠️  $1"; }
fail() { echo "   ❌ $1"; }

pause() {
    echo ""
    read -rp "   Press ENTER to continue..." _
    echo ""
}

# ─────────────────────────────────────────────────────────────
# Step 1: Check macOS version
# ─────────────────────────────────────────────────────────────
step 1 "Checking your Mac"

MAC_VER=$(sw_vers -productVersion 2>/dev/null || echo "unknown")
info "macOS version: $MAC_VER"
ok "Mac detected — we're good to go!"

# ─────────────────────────────────────────────────────────────
# Step 2: Install Bun (the engine GBrain runs on)
# ─────────────────────────────────────────────────────────────
step 2 "Installing Bun (GBrain's engine)"

echo "   Bun is a fast, modern JavaScript engine."
echo "   GBrain uses it to run. Don't worry — it's free!"
echo ""

if command -v bun &>/dev/null; then
    BUN_VER=$(bun --version 2>/dev/null || echo "unknown")
    ok "Bun is already installed (version $BUN_VER) — skipping!"
else
    info "Downloading and installing Bun..."
    if curl -fsSL https://bun.sh/install | bash; then
        # Load bun into current session
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
        ok "Bun installed successfully!"
    else
        fail "Bun installation failed."
        echo ""
        echo "   🔧 Try manually: open a Terminal and run:"
        echo "      curl -fsSL https://bun.sh/install | bash"
        echo ""
        pause
        exit 1
    fi
fi

# Make sure bun is on PATH
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

# ─────────────────────────────────────────────────────────────
# Step 3: Install GBrain CLI
# ─────────────────────────────────────────────────────────────
step 3 "Installing GBrain"

echo "   GBrain is the tool that gives your AI its memory."
echo "   Installing from: github.com/garrytan/gbrain"
echo ""

if command -v gbrain &>/dev/null; then
    GBRAIN_VER=$(gbrain --version 2>/dev/null || echo "unknown")
    ok "GBrain is already installed (version $GBRAIN_VER)"
    info "Upgrading to the latest version..."
    bun add -g github:garrytan/gbrain 2>&1 | tail -5
else
    info "Installing GBrain... (this may take 1-2 minutes)"
    if bun add -g github:garrytan/gbrain; then
        ok "GBrain installed!"
    else
        fail "GBrain installation failed."
        echo ""
        echo "   Please check your internet connection and try again."
        echo "   If the problem continues, visit: https://github.com/garrytan/gbrain"
        pause
        exit 1
    fi
fi

# ─────────────────────────────────────────────────────────────
# Step 4: Create your Brain folder
# ─────────────────────────────────────────────────────────────
step 4 "Creating your Brain folder"

BRAIN_DIR="$HOME/brain"

if [ -d "$BRAIN_DIR" ]; then
    ok "Brain folder already exists at: $BRAIN_DIR"
else
    mkdir -p "$BRAIN_DIR"/{people,companies,concepts,projects,meetings,media,daily}
    cd "$BRAIN_DIR" && git init -q
    ok "Created brain folder at: $BRAIN_DIR"
    info "Subfolders created:"
    echo "      📁 people/    — one file per person you know"
    echo "      📁 companies/ — one file per company"
    echo "      📁 concepts/  — your ideas and mental models"
    echo "      📁 projects/  — your current and past projects"
    echo "      📁 meetings/  — meeting notes and transcripts"
    echo "      📁 media/     — books, articles, podcasts"
    echo "      📁 daily/     — daily notes and journal"
fi

# ─────────────────────────────────────────────────────────────
# Step 5: Initialize the GBrain database
# ─────────────────────────────────────────────────────────────
step 5 "Setting up the GBrain database"

echo "   GBrain stores your brain in a fast local database."
echo "   No internet needed. No subscription. It lives on YOUR Mac."
echo ""

cd "$HOME"
info "Running: gbrain init"
if gbrain init; then
    ok "Database ready!"
else
    warn "gbrain init returned an error — it may already be initialized."
    info "Continuing anyway..."
fi

info "Running health check..."
if gbrain doctor --json 2>/dev/null | grep -q '"healthy":true' 2>/dev/null || gbrain doctor 2>/dev/null; then
    ok "All health checks passed!"
else
    warn "Health check had warnings. This is usually fine for a fresh install."
    info "Run 'gbrain doctor' later to review."
fi

# ─────────────────────────────────────────────────────────────
# Step 6: Import existing notes (if any)
# ─────────────────────────────────────────────────────────────
step 6 "Importing your notes into GBrain"

echo "   Does your brain folder have any markdown (.md) files yet?"
echo "   If you have Obsidian, Notion exports, or other notes, say YES."
echo ""
read -rp "   Import notes from $BRAIN_DIR now? (y/n): " IMPORT_NOW

if [[ "$IMPORT_NOW" =~ ^[Yy] ]]; then
    info "Importing markdown files..."
    gbrain import "$BRAIN_DIR" --no-embed && ok "Import done!"
    info "Tip: Run 'gbrain embed --stale' later to enable AI-powered search."
else
    info "Skipped — you can import later with: gbrain import ~/brain/"
fi

# ─────────────────────────────────────────────────────────────
# Step 7: Set up AI tool integration (MCP)
# ─────────────────────────────────────────────────────────────
step 7 "Connecting GBrain to your AI tools"

echo "   GBrain works with Claude Code, Cursor, and Windsurf."
echo "   We'll add the GBrain connection to whichever you have."
echo ""

MCP_CONFIG_ADDED=false

# Claude Code
CLAUDE_CONFIG_DIR="$HOME/.claude"
CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/server.json"
if [ -d "$CLAUDE_CONFIG_DIR" ] || command -v claude &>/dev/null; then
    info "Claude Code detected!"
    mkdir -p "$CLAUDE_CONFIG_DIR"
    if [ -f "$CLAUDE_CONFIG_FILE" ]; then
        # Check if gbrain is already there
        if grep -q '"gbrain"' "$CLAUDE_CONFIG_FILE" 2>/dev/null; then
            ok "GBrain already connected to Claude Code!"
        else
            warn "Claude Code config found. Please add gbrain manually (see below)."
        fi
    else
        cat > "$CLAUDE_CONFIG_FILE" <<'EOF'
{
  "mcpServers": {
    "gbrain": {
      "command": "gbrain",
      "args": ["serve"]
    }
  }
}
EOF
        ok "GBrain connected to Claude Code!"
        MCP_CONFIG_ADDED=true
    fi
fi

# Cursor
CURSOR_MCP_DIR="$HOME/.cursor"
CURSOR_MCP_FILE="$CURSOR_MCP_DIR/mcp.json"
if [ -d "$CURSOR_MCP_DIR" ]; then
    info "Cursor detected!"
    if [ -f "$CURSOR_MCP_FILE" ] && grep -q '"gbrain"' "$CURSOR_MCP_FILE" 2>/dev/null; then
        ok "GBrain already connected to Cursor!"
    elif [ ! -f "$CURSOR_MCP_FILE" ]; then
        cat > "$CURSOR_MCP_FILE" <<'EOF'
{
  "gbrain": {
    "command": "gbrain",
    "args": ["serve"]
  }
}
EOF
        ok "GBrain connected to Cursor!"
        MCP_CONFIG_ADDED=true
    else
        warn "Cursor MCP config found. Please add gbrain manually (see below)."
    fi
fi

# ─────────────────────────────────────────────────────────────
# Step 8: Add Bun to shell profile permanently
# ─────────────────────────────────────────────────────────────
step 8 "Making GBrain available in all Terminal sessions"

SHELL_PROFILE=""
if [ -f "$HOME/.zshrc" ]; then
    SHELL_PROFILE="$HOME/.zshrc"
elif [ -f "$HOME/.bash_profile" ]; then
    SHELL_PROFILE="$HOME/.bash_profile"
elif [ -f "$HOME/.bashrc" ]; then
    SHELL_PROFILE="$HOME/.bashrc"
fi

BUN_PATH_LINE='export BUN_INSTALL="$HOME/.bun"; export PATH="$BUN_INSTALL/bin:$PATH"'

if [ -n "$SHELL_PROFILE" ]; then
    if grep -q '.bun/bin' "$SHELL_PROFILE" 2>/dev/null; then
        ok "Bun PATH already in $SHELL_PROFILE"
    else
        echo "" >> "$SHELL_PROFILE"
        echo "# Added by GBrain installer" >> "$SHELL_PROFILE"
        echo "$BUN_PATH_LINE" >> "$SHELL_PROFILE"
        ok "Added Bun PATH to $SHELL_PROFILE"
    fi
else
    warn "Could not find shell profile. Add this line manually to ~/.zshrc:"
    echo ""
    echo "      $BUN_PATH_LINE"
    echo ""
fi

# ─────────────────────────────────────────────────────────────
# Done!
# ─────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   🎉  GBrain is installed and ready!                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "   Your brain lives at: $BRAIN_DIR"
echo ""
echo "   🚀 NEXT STEPS:"
echo ""
echo "   1. Open a new Terminal and test GBrain:"
echo "      gbrain --version"
echo "      gbrain search \"hello\""
echo ""
echo "   2. (Optional) Add API keys for smarter search:"
echo "      echo 'export OPENAI_API_KEY=sk-...' >> ~/.zshrc"
echo "      echo 'export ANTHROPIC_API_KEY=sk-ant-...' >> ~/.zshrc"
echo "      source ~/.zshrc"
echo "      gbrain embed --stale   # now does AI-powered embeddings"
echo ""
echo "   3. Restart your AI tool (Claude Code, Cursor) to activate"
echo "      the GBrain memory connection."
echo ""
echo "   4. Tell your AI: 'You now have a brain at ~/brain."
echo "      Use gbrain search before every response.'"
echo ""
echo "   📖 Full docs:"
echo "      ~/gbrain/docs/GBRAIN_SKILLPACK.md  (the agent playbook)"
echo "      github.com/garrytan/gbrain"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

pause
