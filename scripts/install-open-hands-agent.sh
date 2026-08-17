#!/bin/bash
# install-open-hands-agent.sh - One-command install for OpenHands Desktop Agent
# Run this on your desktop and it sets up everything

set -e

echo "═══════════════════════════════════════════════════════════"
echo "🤖 OpenHands Desktop Agent - Quick Install"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Detect OS
OS="$(uname)"
INSTALL_DIR="$HOME/.local/openhands-agent"
LOG_DIR="$INSTALL_DIR/logs"
CREDS_DIR="$HOME/.local/revvel-agent/credentials"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check prerequisites
echo "📋 Checking prerequisites..."

check_cmd() {
  if ! command -v "$1" &> /dev/null; then
    echo "   ${RED}✗ $1 not found${NC}"
    return 1
  fi
  echo "   ${GREEN}✓ $1${NC}"
  return 0
}

# For Windows (Git Bash / WSL)
if [[ "$OS" == *"MINGW"* ]] || [[ "$OS" == *"CYGWIN"* ]] || [[ "$OS" == "Linux" && -d "/c/Windows" ]]; then
  echo "   Detected: Windows (Git Bash/WSL)"
  OS="Windows"
elif [[ "$OS" == "Darwin" ]]; then
  echo "   Detected: macOS"
elif [[ "$OS" == "Linux" ]]; then
  echo "   Detected: Linux"
fi

# Create directories
echo ""
echo "📁 Creating directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$CREDS_DIR"
echo "   ✓ $INSTALL_DIR"
echo "   ✓ $LOG_DIR"

# Create the agent script
echo ""
echo "⚙️  Creating agent script..."

cat > "$INSTALL_DIR/agent.sh" << 'AGENTSCRIPT'
#!/bin/bash
# OpenHands Desktop Agent - 24/7 autonomous credential manager

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$AGENT_DIR/logs"
CREDS_DIR="$HOME/.local/revvel-agent/credentials"
REPO="midnghtsapphire/revvel-standards"

mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/agent-$(date +%Y%m%d).log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "═══════════════════════════════════════════════"
log "🤖 OpenHands Desktop Agent Starting"
log "═══════════════════════════════════════════════"

# Check for openhands
if ! command -v openhands &> /dev/null; then
  log "ERROR: openhands not installed"
  log "Run: pip install openhands"
  exit 1
fi

# Main loop
while true; do
  log "Starting OpenHands session..."
  
  # Run openhands with browser
  openhands --browser --provider local 2>&1 | tee -a "$LOG_FILE"
  
  EXIT_CODE=$?
  log "OpenHands exited with code: $EXIT_CODE"
  
  if [ $EXIT_CODE -eq 0 ]; then
    log "Normal exit. Waiting 60 seconds before restart..."
  else
    log "Unexpected exit. Waiting 30 seconds before restart..."
  fi
  
  sleep 30
done
AGENTSCRIPT

chmod +x "$INSTALL_DIR/agent.sh"
echo "   ✓ Created: $INSTALL_DIR/agent.sh"

# Create the sync script
cat > "$INSTALL_DIR/sync-creds.sh" << 'SYNCSCRIPT'
#!/bin/bash
# Auto-sync credentials to GitHub

REPO="midnghtsapphire/revvel-standards"
CREDS_DIR="$HOME/.local/revvel-agent/credentials"

log() {
  echo "[$(date '+%H:%M:%S')] $*"
}

log "🔄 Syncing credentials to GitHub..."

for cred in "$CREDS_DIR"/*; do
  [ -f "$cred" ] || continue
  name=$(basename "$cred")
  value=$(cat "$cred")
  
  if [ -z "$value" ]; then
    log "⚠️  $name is empty"
    continue
  fi
  
  if echo "$value" | gh secret set "$name" --body - --repo "$REPO" 2>/dev/null; then
    log "✅ $name synced"
  else
    log "⚠️  $name sync failed"
  fi
done

log "✅ Sync complete"
SYNCSCRIPT

chmod +x "$INSTALL_DIR/sync-creds.sh"
echo "   ✓ Created: $INSTALL_DIR/sync-creds.sh"

# Create memory file
cat > "$INSTALL_DIR/MEMORY.md" << 'MEMORY'
# OpenHands Desktop Agent Memory

## Mission
Manage credentials and automation for midnghtsapphire/revvel-standards

## Credentials Location
~/.local/revvel-agent/credentials/

## GitHub Repo
midnghtsapphire/revvel-standards

## Required Credentials
- OPENROUTER_API_KEY
- CLAUDE_API_KEY
- LINEAR_API_KEY  
- BITO_API_KEY
- JULES_API_KEY
- NOIMOSAI_API_KEY
- TAVILY_API_KEY

## Daily Tasks
1. Check credentials folder
2. Sync to GitHub
3. Run self-heal-repo
4. Check for new WRs

## Services to Monitor
- bito.ai/settings
- jules.google.com/settings
- noimosai.com/settings
- app.tavily.com/settings
MEMORY

echo "   ✓ Created: $INSTALL_DIR/MEMORY.md"

# Setup cron for auto-sync
echo ""
echo "⏰ Setting up auto-sync (every 4 hours)..."
CRON_LINE="0 */4 * * * $INSTALL_DIR/sync-creds.sh >> $LOG_DIR/cron.log 2>&1"

# Remove old entry and add new
(crontab -l 2>/dev/null | grep -v "openhands-agent" | grep -v "sync-creds"; echo "$CRON_LINE") | crontab -
echo "   ✓ Cron job added"

# Create startup script for each OS
if [[ "$OS" == "Windows" ]]; then
  cat > "$INSTALL_DIR/start.bat" << 'BAT'
@echo off
title OpenHands Agent
cd /d %USERPROFILE%\.local\openhands-agent
:loop
echo [%date% %time%] Starting OpenHands... >> logs\agent.log
call :run >> logs\agent.log 2>&1
echo [%date% %time%] Restarting in 30s... >> logs\agent.log
timeout /t 30 /nobreak
goto loop

:run
openhands --browser --provider local
BAT
  echo "   ✓ Created: $INSTALL_DIR/start.bat"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Installation Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📍 Agent location: $INSTALL_DIR"
echo ""
echo "To start:"
if [[ "$OS" == "Windows" ]]; then
  echo "   $INSTALL_DIR/start.bat"
else
  echo "   $INSTALL_DIR/agent.sh"
fi
echo ""
echo "To sync credentials:"
echo "   $INSTALL_DIR/sync-creds.sh"
echo ""
echo "Logs:"
echo "   $LOG_DIR/agent-$(date +%Y%m%d).log"
echo ""

# Offer to start
echo "Start the agent now? (y/n)"
read -r answer
if [[ "$answer" =~ ^[Yy]$ ]]; then
  echo "Starting..."
  if [[ "$OS" == "Windows" ]]; then
    "$INSTALL_DIR/start.bat" &
  else
    "$INSTALL_DIR/agent.sh" &
  fi
  echo "Agent started! Check logs for status."
fi
