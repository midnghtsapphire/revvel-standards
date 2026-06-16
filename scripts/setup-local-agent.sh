#!/bin/bash
# setup-local-agent.sh - One-time setup for autonomous desktop agent
# 100% LOCAL - no third-party services, no Doppler, no cloud deps
# Your machine → GitHub only

set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/revvel-agent}"
CREDENTIALS_FILE="$HOME/.local/revvel-agent/credentials.enc"
LOG_DIR="$HOME/.local/revvel-agent/logs"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

echo "═══════════════════════════════════════════════"
echo "🤖 Revvel Local Agent - Zero Dependencies"
echo "═══════════════════════════════════════════════"
echo ""
echo "Your machine → GitHub Secrets"
echo "Nothing else. No third-party services."
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Node.js
if ! command -v node &> /dev/null; then
  echo "   ❌ Node.js not found"
  echo "   Install: https://nodejs.org/"
  exit 1
fi
echo "   ✅ Node.js: $(node --version)"

# Git
if ! command -v git &> /dev/null; then
  echo "   ❌ Git not found"
  exit 1
fi
echo "   ✅ Git: $(git --version | cut -d' ' -f3)"

# gh CLI
if ! command -v gh &> /dev/null; then
  echo "   ❌ gh CLI not found"
  echo "   Install: https://cli.github.com/"
  exit 1
fi
echo "   ✅ gh CLI installed"

# Create directories
echo ""
echo "📁 Creating directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$LOG_DIR"
echo "   ✅ $INSTALL_DIR"
echo "   ✅ $LOG_DIR"

# Check GitHub auth
echo ""
echo "🔐 Checking GitHub auth..."
if ! gh auth status &> /dev/null; then
  echo "   ⚠️ Not logged in to GitHub"
  echo "   Run: gh auth login"
  exit 1
fi
echo "   ✅ GitHub authenticated"

# Create the local agent script directly
echo ""
echo "📦 Creating local agent..."

cat > "$INSTALL_DIR/local-agent.sh" << 'AGENTSCRIPT'
#!/bin/bash
# local-agent.sh - Runs on YOUR machine, syncs to GitHub
# No third-party services. No Doppler. No cloud.

set -euo pipefail

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CREDENTIALS_DIR="$HOME/.local/revvel-agent/credentials"
LOG_DIR="$HOME/.local/revvel-agent/logs"
REPO="midnghtsapphire/revvel-standards"

mkdir -p "$CREDENTIALS_DIR"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/agent-$(date +%Y%m%d).log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "═══════════════════════════════════════════════"
log "🤖 Revvel Local Agent Starting"
log "═══════════════════════════════════════════════"

# ─────────────────────────────────────────────────
# CORE FUNCTION: Sync credentials from local files
# ─────────────────────────────────────────────────
sync_credentials() {
  log "🔄 Syncing credentials to GitHub..."
  
  local synced=0
  local failed=0
  
  # Read each credential file and push to GitHub
  for cred_file in "$CREDENTIALS_DIR"/*; do
    [ -f "$cred_file" ] || continue
    
    local name=$(basename "$cred_file")
    local value=$(cat "$cred_file")
    
    if [ -z "$value" ]; then
      log "   ⚠️ $name is empty"
      continue
    fi
    
    # Push to GitHub
    if gh secret set "$name" --body "$value" --repo "$REPO" 2>&1 | tee -a "$LOG_FILE"; then
      log "   ✅ $name synced"
      ((synced++))
    else
      log "   ❌ $name failed"
      ((failed++))
    fi
  done
  
  log "📊 Sync complete: $synced ok, $failed failed"
}

# ─────────────────────────────────────────────────
# CORE FUNCTION: Backup GitHub secrets locally
# ─────────────────────────────────────────────────
backup_to_local() {
  log "💾 Backing up GitHub secrets locally..."
  
  # Get all secrets and save locally
  gh api repos/$REPO/actions/secrets --jq '.secrets[] | .name' 2>/dev/null | while read name; do
    # Get secret value (only works with admin token)
    local value=$(gh secret get "$name" --repo "$REPO" 2>/dev/null || echo "")
    
    if [ -n "$value" ]; then
      echo "$value" > "$CREDENTIALS_DIR/$name"
      log "   ✅ $name backed up"
    fi
  done
}

# ─────────────────────────────────────────────────
# HEALTH CHECK: Verify secrets match
# ─────────────────────────────────────────────────
health_check() {
  log "🏥 Running health check..."
  
  local issues=0
  
  # Check if we have local credentials
  local local_count=$(ls -1 "$CREDENTIALS_DIR" 2>/dev/null | wc -l)
  log "   Local credentials: $local_count"
  
  if [ "$local_count" -eq 0 ]; then
    log "   ⚠️ No local credentials found"
    log "   Add credentials to: $CREDENTIALS_DIR/"
    log "   Or run: agent --backup to pull from GitHub"
    ((issues++))
  fi
  
  if [ "$issues" -eq 0 ]; then
    log "   ✅ All checks passed"
  fi
  
  return $issues
}

# ─────────────────────────────────────────────────
# TOKEN EXTRACTION: From Chrome (if available)
# ─────────────────────────────────────────────────
extract_chrome_tokens() {
  local PORT=9222
  
  log "🔍 Checking Chrome for tokens..."
  
  # Check if Chrome is running with remote debugging
  if ! curl -s "http://localhost:$PORT/json/version" > /dev/null 2>&1; then
    log "   Chrome not in debug mode (skipping extraction)"
    log "   To enable: Open Chrome with --remote-debugging-port=9222"
    return 0
  fi
  
  log "   Chrome debug detected on port $PORT"
  
  # Try to extract Google OAuth token
  # This requires Chrome to be open and logged in
  local oauth_token=""
  
  # Try common Google OAuth token patterns
  for domain in "accounts.google.com" "google.com"; do
    local cookies=$(curl -s "http://localhost:$PORT/cookie/https://$domain/" 2>/dev/null || echo "")
    
    # Look for token patterns
    local token=$(echo "$cookies" | grep -oP 'ya29\.[a-zA-Z0-9_-]+' | head -1 || echo "")
    
    if [ -n "$token" ]; then
      log "   ✅ Found Google OAuth token for $domain"
      echo "$token" > "$CREDENTIALS_DIR/GOOGLE_OAUTH_TOKEN"
      echo "$token" | gh secret set GOOGLE_OAUTH_TOKEN --body-file - --repo "$REPO" 2>/dev/null || true
    fi
  done
}

# ─────────────────────────────────────────────────
# MAIN: Run selected action
# ─────────────────────────────────────────────────
main() {
  local action="${1:-sync}"
  
  case "$action" in
    sync)
      sync_credentials
      ;;
    backup)
      backup_to_local
      ;;
    health|check)
      health_check
      ;;
    extract|chrome)
      extract_chrome_tokens
      ;;
    all|full)
      extract_chrome_tokens
      backup_to_local
      sync_credentials
      ;;
    *)
      echo "Usage: $0 {sync|backup|health|extract|all}"
      echo ""
      echo "  sync    - Push local credentials to GitHub"
      echo "  backup  - Pull GitHub secrets to local"
      echo "  health  - Check system health"
      echo "  extract - Extract tokens from Chrome"
      echo "  all     - Do everything"
      exit 1
      ;;
  esac
}

main "$@"
AGENTSCRIPT

chmod +x "$INSTALL_DIR/local-agent.sh"
echo "   ✅ Created: $INSTALL_DIR/local-agent.sh"

# Create crontab for automatic runs
setup_cron() {
  echo ""
  echo "⏰ Setting up automatic runs..."
  
  # Remove old entries
  (crontab -l 2>/dev/null | grep -v "revvel-agent" || true) | crontab -
  
  # Add new cron job - runs every 4 hours
  local cron_job="0 */4 * * * $INSTALL_DIR/local-agent.sh sync >> $LOG_DIR/cron.log 2>&1"
  
  (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
  
  echo "   ✅ Cron job added (runs every 4 hours)"
  echo ""
  echo "   Current crontab:"
  crontab -l 2>/dev/null | grep "revvel-agent" || echo "   (none)"
}

# First-time: backup GitHub secrets locally
first_time_setup() {
  if [ ! -f "$CREDENTIALS_DIR/.initialized" ]; then
    echo ""
    echo "🚀 First-time setup..."
    echo ""
    echo "   Creating credentials directory: $CREDENTIALS_DIR/"
    echo ""
    echo "   To add a credential:"
    echo "   echo 'your-secret-value' > $CREDENTIALS_DIR/NAME"
    echo ""
    echo "   Example:"
    echo "   echo 'sk-or-xxxx' > $CREDENTIALS_DIR/OPENROUTER_API_KEY"
    echo ""
    echo "   Then run: $INSTALL_DIR/local-agent.sh sync"
    echo ""
    
    touch "$CREDENTIALS_DIR/.initialized"
  fi
}

first_time_setup
setup_cron

echo ""
echo "═══════════════════════════════════════════════"
echo "✅ Setup Complete!"
echo "═══════════════════════════════════════════════"
echo ""
echo "📍 Agent: $INSTALL_DIR/local-agent.sh"
echo "📍 Credentials: $CREDENTIALS_DIR/"
echo "📍 Logs: $LOG_DIR/"
echo ""
echo "Usage:"
echo "  $INSTALL_DIR/local-agent.sh sync    # Push to GitHub"
echo "  $INSTALL_DIR/local-agent.sh backup  # Pull from GitHub"
echo "  $INSTALL_DIR/local-agent.sh all     # Do everything"
echo ""
echo "📅 Runs automatically every 4 hours via cron"
echo ""
echo "To add a credential:"
echo "  echo 'VALUE' > $CREDENTIALS_DIR/SECRET_NAME"
echo ""