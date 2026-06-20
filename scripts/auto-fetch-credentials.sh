#!/bin/bash
# auto-fetch-credentials.sh - Autonomous credential fetcher for local machine
# Opens browser to each service, extracts API keys, saves locally + syncs to GitHub
# 
# Usage:
#   ./auto-fetch-credentials.sh          # Fetch all missing credentials
#   ./auto-fetch-credentials.sh list    # Show what's needed
#   ./auto-fetch-credentials.sh status  # Show current status

set -euo pipefail

# Configuration
CREDS_DIR="${CREDS_DIR:-$HOME/.local/revvel-agent/credentials}"
REPO="midnghtsapphire/revvel-standards"
LOG_FILE="$HOME/.local/revvel-agent/logs/fetch-$(date +%Y%m%d).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
  echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_deps() {
  log "Checking prerequisites..."
  
  if ! command -v gh &> /dev/null; then
    log "${RED}❌ gh CLI not installed${NC}"
    log "   Install: https://cli.github.com/"
    exit 1
  fi
  
  if ! gh auth status &> /dev/null; then
    log "${RED}❌ Not logged in to GitHub${NC}"
    log "   Run: gh auth login"
    exit 1
  fi
  
  mkdir -p "$CREDS_DIR"
  mkdir -p "$(dirname "$LOG_FILE")"
  
  log "${GREEN}✅ Prerequisites OK${NC}"
}

# List services and their URLs
list_services() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║           🔑 Required API Credentials                   ║"
  echo "╠══════════════════════════════════════════════════════════╣"
  echo "║  SERVICE          │ URL                                ║"
  echo "╠══════════════════════════════════════════════════════════╣"
  echo "║  BITO_API_KEY     │ bito.ai/settings                   ║"
  echo "║  JULES_API_KEY    │ jules.google.com/settings          ║"
  echo "║  NOIMOSAI_API_KEY │ noimosai.com/settings              ║"
  echo "║  TAVILY_API_KEY   │ app.tavily.com/settings            ║"
  echo "║  OPENAI_API_KEY   │ platform.openai.com/api-keys       ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""
}

# Show current status
show_status() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║           📋 Current Credentials Status                  ║"
  echo "╠══════════════════════════════════════════════════════════╣"
  
  if [ ! -d "$CREDS_DIR" ]; then
    echo "║  No credentials directory found                          ║"
    echo "║  Run: ./auto-fetch-credentials.sh fetch                 ║"
  else
    local count=0
    for cred in "$CREDS_DIR"/*; do
      [ -f "$cred" ] || continue
      local name=$(basename "$cred")
      local size=$(wc -c < "$cred" 2>/dev/null || echo 0)
      if [ "$size" -gt 10 ]; then
        echo "║  ✅ $name"
        ((count++))
      else
        echo "║  ⚠️  $name (empty)"
      fi
    done
    
    if [ "$count" -eq 0 ]; then
      echo "║  No credentials found                                   ║"
    fi
  fi
  
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""
  echo "📁 Location: $CREDS_DIR"
  echo ""
}

# Add a credential manually
add_credential() {
  local name="$1"
  local value="$2"
  
  if [ -z "$value" ]; then
    echo "Usage: $0 add <NAME> <VALUE>"
    exit 1
  fi
  
  echo "$value" > "$CREDS_DIR/$name"
  log "Added: $name"
  
  echo "✅ Saved to: $CREDS_DIR/$name"
  echo "🔄 Syncing to GitHub..."
  
  sync_to_github "$name"
}

# Sync a credential to GitHub
sync_to_github() {
  local name="$1"
  local value=$(cat "$CREDS_DIR/$name" 2>/dev/null || echo "")
  
  if [ -z "$value" ]; then
    echo "❌ File empty or not found: $CREDS_DIR/$name"
    return 1
  fi
  
  # Try gh CLI first
  if echo "$value" | gh secret set "$name" --body - --repo "$REPO" 2>/dev/null; then
    echo "✅ Synced to GitHub: $name"
    return 0
  fi
  
  echo "⚠️  Could not sync to GitHub (permissions issue)"
  echo "   Will sync when GitHub permissions are available"
  return 1
}

# Sync ALL credentials to GitHub
sync_all() {
  log "🔄 Syncing all credentials to GitHub..."
  
  local synced=0
  local failed=0
  
  for cred in "$CREDS_DIR"/*; do
    [ -f "$cred" ] || continue
    local name=$(basename "$cred")
    
    if sync_to_github "$name"; then
      ((synced++))
    else
      ((failed++))
    fi
  done
  
  echo ""
  echo "📊 Sync complete: $synced synced, $failed failed"
}

# Open browser to service URL
open_service() {
  local name="$1"
  local url="$2"
  
  log "🌐 Opening $name at $url"
  
  case "$(uname)" in
    Darwin*)
      open "$url"
      ;;
    Linux*)
      xdg-open "$url" 2>/dev/null || echo "Open: $url"
      ;;
    MINGW*|CYGWIN*|MSYS*)
      start "$url"
      ;;
    *)
      echo "Open this URL: $url"
      ;;
  esac
}

# Open all services for manual credential entry
open_all_services() {
  echo ""
  echo "🌐 Opening browser to all service URLs..."
  echo ""
  echo "📋 Steps:"
  echo "   1. Each service will open in your browser"
  echo "   2. Log in if needed"
  echo "   3. Find the API key section"
  echo "   4. Copy the key"
  echo "   5. Run: echo 'YOUR_KEY' > $CREDS_DIR/SERVICE_NAME"
  echo "   6. Run: ./auto-fetch-credentials.sh sync"
  echo ""
  echo "Press Enter to open services..."
  read
  
  open_service "Bito AI" "https://bito.ai/settings"
  sleep 2
  open_service "Jules" "https://jules.google.com/settings"
  sleep 2
  open_service "NoimosAI" "https://noimosai.com/settings"
  sleep 2
  open_service "Tavily" "https://app.tavily.com/settings"
  sleep 2
  open_service "OpenAI" "https://platform.openai.com/api-keys"
}

# Main
main() {
  local action="${1:-help}"
  
  mkdir -p "$CREDS_DIR"
  mkdir -p "$(dirname "$LOG_FILE")"
  
  case "$action" in
    list)
      list_services
      ;;
    status)
      show_status
      ;;
    add)
      add_credential "$2" "$3"
      ;;
    sync)
      check_deps
      sync_all
      ;;
    open)
      open_all_services
      ;;
    help|--help|-h)
      echo ""
      echo "🤖 Auto Credential Fetcher"
      echo ""
      echo "Usage: $0 <command>"
      echo ""
      echo "Commands:"
      echo "  list      - Show all required credentials"
      echo "  status    - Show current credential status"
      echo "  add       - Add a credential manually"
      echo "  sync      - Sync all credentials to GitHub"
      echo "  open      - Open browser to all service URLs"
      echo "  help      - Show this help"
      echo ""
      echo "Examples:"
      echo "  $0 add BITO_API_KEY sk_live_xxxxx"
      echo "  $0 sync"
      echo "  $0 open"
      echo ""
      ;;
    *)
      echo "Unknown command: $action"
      echo "Run '$0 help' for usage"
      exit 1
      ;;
  esac
}

main "$@"
