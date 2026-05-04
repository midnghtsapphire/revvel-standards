#!/bin/bash
# Revvel MCP Setup Script
# Sets up MCP server configuration for a new or existing project.
#
# Usage: bash setup-mcp.sh <profile>
# Profiles: minimal | web | mobile | full
#
# Run this from the ROOT of your project repo. revvel-standards must be
# at ../revvel-standards or set REVVEL_STANDARDS_PATH.
#
# What it does:
#   1. Copies the correct .mcp.json template for your profile
#   2. Copies .env.mcp.example to your project root
#   3. Updates .gitignore to protect .env
#   4. Checks prerequisites (node, uv, npx)
#   5. Prints next steps
#
# Examples:
#   bash ../revvel-standards/scripts/setup-mcp.sh web
#   bash ../revvel-standards/scripts/setup-mcp.sh full
#   REVVEL_STANDARDS_PATH=~/code/revvel-standards bash setup-mcp.sh minimal

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────
PROFILE="${1:-web}"
REVVEL_STANDARDS_PATH="${REVVEL_STANDARDS_PATH:-$(dirname "$0")/..}"
TEMPLATES_DIR="$REVVEL_STANDARDS_PATH/templates/mcp"
DEST_DIR="$(pwd)"

VALID_PROFILES="minimal web mobile full"

# ─────────────────────────────────────────────────────────────────────────────
# Validate
# ─────────────────────────────────────────────────────────────────────────────
if ! echo "$VALID_PROFILES" | grep -qw "$PROFILE"; then
  echo "❌ Invalid profile: '$PROFILE'"
  echo "   Valid profiles: $VALID_PROFILES"
  echo "   Usage: bash setup-mcp.sh <profile>"
  exit 1
fi

if [ ! -d "$TEMPLATES_DIR" ]; then
  echo "❌ Cannot find revvel-standards templates at: $TEMPLATES_DIR"
  echo "   Set REVVEL_STANDARDS_PATH to the path of your revvel-standards clone."
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# Header
# ─────────────────────────────────────────────────────────────────────────────
echo "=============================================="
echo "  Revvel MCP Setup — Profile: $PROFILE"
echo "=============================================="
echo "  Project:    $DEST_DIR"
echo "  Templates:  $TEMPLATES_DIR"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Copy .mcp.json
# ─────────────────────────────────────────────────────────────────────────────
echo "📋 Step 1: Copying .mcp.json ($PROFILE profile)..."

MCP_TEMPLATE="$TEMPLATES_DIR/mcp.$PROFILE.json"
MCP_DEST="$DEST_DIR/.mcp.json"

if [ -f "$MCP_DEST" ]; then
  echo "  ⚠️  .mcp.json already exists. Backing up to .mcp.json.bak"
  cp "$MCP_DEST" "$MCP_DEST.bak"
fi

cp "$MCP_TEMPLATE" "$MCP_DEST"

# Inject PROJECT_ROOT into the config
PROJECT_ROOT_ESCAPED=$(echo "$DEST_DIR" | sed 's/[\/&]/\\&/g')
sed -i.bak -e "s|\${PROJECT_ROOT}|$DEST_DIR|g" "$MCP_DEST" 2>/dev/null || true
rm -f "$MCP_DEST.bak"

echo "  ✅ .mcp.json created from mcp.$PROFILE.json"

# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Append mandatory custom Revvel servers
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "🔧 Step 2: Custom Revvel server entries..."
echo "  ℹ️  The two mandatory custom servers (rvvel-affiliate-links, code-review)"
echo "     are already in mcp.full.json. For other profiles, add them manually"
echo "     from templates/mcp/mcp.revvel-custom.json."
echo "     See: MCP_STANDARD.md Section 12 for instructions."

# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Copy .env.mcp.example
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "🔑 Step 3: Copying .env.mcp.example..."

ENV_EXAMPLE_SRC="$TEMPLATES_DIR/.env.mcp.example"
ENV_EXAMPLE_DEST="$DEST_DIR/.env.mcp.example"

if [ -f "$ENV_EXAMPLE_DEST" ]; then
  echo "  ⚠️  .env.mcp.example already exists — skipping."
else
  cp "$ENV_EXAMPLE_SRC" "$ENV_EXAMPLE_DEST"
  echo "  ✅ .env.mcp.example created"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 4: Update .gitignore
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "🔒 Step 4: Checking .gitignore..."

GITIGNORE="$DEST_DIR/.gitignore"
touch "$GITIGNORE"

add_to_gitignore() {
  local entry="$1"
  if ! grep -qF "$entry" "$GITIGNORE" 2>/dev/null; then
    echo "$entry" >> "$GITIGNORE"
    echo "  ✅ Added '$entry' to .gitignore"
  else
    echo "  ✓  '$entry' already in .gitignore"
  fi
}

add_to_gitignore ".env"
add_to_gitignore ".env.local"
add_to_gitignore ".env.*.local"

# ─────────────────────────────────────────────────────────────────────────────
# Step 5: Check prerequisites
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "🔍 Step 5: Checking prerequisites..."

check_cmd() {
  local cmd="$1"
  local install_hint="$2"
  if command -v "$cmd" &>/dev/null; then
    echo "  ✅ $cmd found ($(command -v "$cmd"))"
  else
    echo "  ❌ $cmd NOT found — $install_hint"
  fi
}

check_cmd "node"  "Install Node.js 20+ from https://nodejs.org"
check_cmd "npx"   "Comes with Node.js — reinstall Node.js"
check_cmd "uv"    "Install: curl -LsSf https://astral.sh/uv/install.sh | sh"

# Optional: check for go (only needed for Go-binary servers)
if command -v go &>/dev/null; then
  echo "  ✅ go found (optional — only needed for Telegram/WhatsApp/Filesystem-Go servers)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 6: Verify rvvel-affiliate-links-mcp is accessible
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "📦 Step 6: Verifying rvvel-affiliate-links-mcp..."
if npx rvvel-affiliate-links-mcp --version &>/dev/null 2>&1; then
  echo "  ✅ rvvel-affiliate-links-mcp is accessible via npx"
else
  echo "  ℹ️  rvvel-affiliate-links-mcp will be installed on first use via npx -y"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "=============================================="
echo "  ✅ MCP Setup Complete!"
echo "=============================================="
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Fill in .env with real credentials:"
echo "   cp .env.mcp.example .env"
echo "   # Edit .env — fill in DATABASE_URL, BRAVE_API_KEY, etc."
echo ""
echo "2. Set up code-review-mcp-server (mandatory):"
echo "   git clone https://github.com/midnghtsapphire/code-review-mcp-server ~/mct/code-review"
echo "   cd ~/mct/code-review && npm install && npm run build"
echo "   # Add CODE_REVIEW_MCP_PATH=\$HOME/mct/code-review to .env"
echo ""
echo "3. Add MCT modules you need from mcp.revvel-custom.json:"
echo "   cat $TEMPLATES_DIR/mcp.revvel-custom.json"
echo "   # Copy the entries for modules your project uses into .mcp.json"
echo "   # Clone + build each module: git clone https://github.com/midnghtsapphire/MCP-<NAME>"
echo ""
echo "4. (Optional) Enable the WR/PR Control Plane MCP server:"
echo "   # Provides issue intake packets, credential readiness, and the 2026"
echo "   # blueprint contract for Composio + Firecrawl + Obot + FastMCP."
echo "   cd $REVVEL_STANDARDS_PATH/mcp-servers/wr-control-plane && uv pip install -e ."
echo "   # Then set GITHUB_TOKEN, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, JULES_API_KEY,"
echo "   # COMPOSIO_API_KEY, OBOT_BASE_URL, OBOT_IDP_CONFIG (FIRECRAWL_API_KEY optional)"
echo "   # in your .env, and remove the 'disabled': true flag from .mcp.json."
echo ""
echo "5. Verify .mcp.json in your AI tool:"
echo "   Claude Code:  'Check which MCP tools are available'"
echo "   Cursor:       Settings > MCP > Reload"
echo "   Windsurf:     Settings > MCP Servers > Refresh"
echo ""
echo "6. Test the affiliate links server:"
echo "   # In Claude Code or Cursor, ask: 'Use the rvvel-affiliate-links MCP to show me all stored links'"
echo ""
echo "📖 Full documentation:"
echo "   $REVVEL_STANDARDS_PATH/MCP_STANDARD.md"
echo "   $REVVEL_STANDARDS_PATH/docs/MCP_REVVEL_CATALOG.md"
echo ""
echo "Good luck! 🚀"
