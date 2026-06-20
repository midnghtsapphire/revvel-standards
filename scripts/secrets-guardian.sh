#!/usr/bin/env bash
# secrets-guardian.sh - Auto-restore deleted secrets from backup
# Called hourly by secrets-guardian.yml

set -euo pipefail

DRY_RUN="${1:-true}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
HARNESS="${REPO_ROOT}/scripts/credential-backup-harness.js"

echo "🔒 Secrets Guardian starting..."
echo "   Mode: $([ "$DRY_RUN" = "true" ] && echo "DRY RUN" || echo "LIVE")"

# Critical secrets that MUST exist
CRITICAL_SECRETS=(
  "OPENROUTER_API_KEY"
  "GITHUB_TOKEN"
  "GOOGLE_OAUTH_TOKEN"
  "CLAUDE_CODE_TOKEN"
  "GUMLOOP_TOKEN"
  "LINEAR_API_KEY"
  "NOTION_API_KEY"
  "JULES_API_KEY"
  "BITO_API_KEY"
  "RESEND_API_KEY"
  "STRIPE_SECRET_KEY"
)

# All secrets from backup
ALL_SECRETS=(
  "OPENROUTER_API_KEY"
  "OPENAI_API_KEY"
  "ANTHROPIC_API_KEY"
  "POLAR_ACCESS_TOKEN"
  "GITHUB_TOKEN"
  "ADMIN_GITHUB_TOKEN"
  "GOOGLE_OAUTH_TOKEN"
  "CLAUDE_CODE_TOKEN"
  "GUMLOOP_TOKEN"
  "LINEAR_API_KEY"
  "NOTION_API_KEY"
  "JULES_API_KEY"
  "BITO_API_KEY"
  "RESEND_API_KEY"
  "STRIPE_SECRET_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "VERCEL_TOKEN"
  "RAILWAY_TOKEN"
  "DIGITALOCEAN_API_TOKEN"
  "RESEND_API_KEY"
  "AMPLITUDE_API_KEY"
  "TWITTER_API_KEY"
  "TWITTER_API_KEY_SECRET"
  "TWITTER_ACCESS_TOKEN"
  "TWITTER_ACCESS_TOKEN_SECRET"
  "LINKEDIN_ACCESS_TOKEN"
  "REDDIT_CLIENT_ID"
  "REDDIT_CLIENT_SECRET"
  "PRODUCT_HUNT_API_TOKEN"
  "NPM_TOKEN"
  "GOOGLE_SEARCH_CONSOLE_KEY"
  "GOOGLE_BUSINESS_PROFILE_KEY"
  "NAMEBASE_API_KEY"
  "NAMECHEAP_API_KEY"
  "PORKBUN_API_KEY"
  "PORKBUN_SECRET_API_KEY"
)

RESTORED=""
MISSING=""
STILL_MISSING=""

# Check if backup JSON exists
if [ -z "${CREDENTIAL_BACKUP_JSON:-}" ]; then
  echo "⚠️  CREDENTIAL_BACKUP_JSON not set - cannot restore secrets"
  echo "missing=CREDENTIAL_BACKUP_JSON not configured" >> $GITHUB_OUTPUT
  echo "restored=" >> $GITHUB_OUTPUT
  exit 1
fi

# Check each critical secret
for SECRET in "${CRITICAL_SECRETS[@]}"; do
  echo -n "   Checking $SECRET... "
  
  # Try to get from GitHub
  if gh secret list --repo "$GITHUB_REPOSITORY" 2>/dev/null | grep -q "^${SECRET} "; then
    echo "✅ exists"
  else
    echo "❌ MISSING"
    
    # Try to restore from backup
    VALUE=$(echo "$CREDENTIAL_BACKUP_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$SECRET', ''))" 2>/dev/null || echo "")
    
    if [ -n "$VALUE" ] && [ "$VALUE" != "None" ]; then
      echo "   → Found in backup, restoring..."
      if [ "$DRY_RUN" != "true" ]; then
        gh secret set "$SECRET" --body "$VALUE" --repo "$GITHUB_REPOSITORY"
      fi
      RESTORED="${RESTORED}${SECRET},"
      echo "   → ✅ Restored!"
    else
      echo "   → ⚠️ Not in backup either"
      MISSING="${MISSING}${SECRET},"
    fi
  fi
done

# Check all other secrets too
for SECRET in "${ALL_SECRETS[@]}"; do
  # Skip if already checked
  echo "$CRITICAL_SECRETS" | grep -q "$SECRET" && continue
  
  echo -n "   Checking $SECRET... "
  
  if gh secret list --repo "$GITHUB_REPOSITORY" 2>/dev/null | grep -q "^${SECRET} "; then
    echo "✅ exists"
  else
    echo "❌ MISSING"
    
    VALUE=$(echo "$CREDENTIAL_BACKUP_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$SECRET', ''))" 2>/dev/null || echo "")
    
    if [ -n "$VALUE" ] && [ "$VALUE" != "None" ]; then
      echo "   → Found in backup, restoring..."
      if [ "$DRY_RUN" != "true" ]; then
        gh secret set "$SECRET" --body "$VALUE" --repo "$GITHUB_REPOSITORY"
      fi
      RESTORED="${RESTORED}${SECRET},"
      echo "   → ✅ Restored!"
    else
      MISSING="${MISSING}${SECRET},"
    fi
  fi
done

# Output results
echo ""
echo "═══════════════════════════════════════"
echo "🔒 Secrets Guardian Results"
echo "═══════════════════════════════════════"

if [ -n "$RESTORED" ]; then
  echo "🔄 Restored: ${RESTORED%,}"
else
  echo "✅ No secrets needed restoration"
fi

if [ -n "$MISSING" ]; then
  echo "⚠️  Missing from backup: ${MISSING%,}"
fi

echo "═══════════════════════════════════════"

# Output for GitHub Actions
echo "restored=${RESTORED%,}" >> $GITHUB_OUTPUT
echo "missing=${MISSING%,}" >> $GITHUB_OUTPUT

if [ -n "$MISSING" ]; then
  exit 1
fi

exit 0