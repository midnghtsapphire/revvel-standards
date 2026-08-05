#!/bin/bash
# ============================================================
# REVVEL STANDARD MANUAL DEPLOY SCRIPT
# ============================================================
# One-click deploy from your local machine to the droplet.
# Use this when you need to deploy without pushing to GitHub,
# or when GitHub Actions is not yet set up.
#
# HOW TO USE:
#   1. Copy this file to your repo root as deploy.sh
#   2. Replace the variables in the CONFIG section below
#   3. chmod +x deploy.sh
#   4. ./deploy.sh
#
# REQUIRES: SSH key at ~/.ssh/<APP_NAME>_universal
# ============================================================

set -e

# ============================================================
# CONFIG — Replace these values for each app
# ============================================================
APP_NAME="YOUR_APP_NAME"                        # ← REPLACE: e.g., growlingeyes
DROPLET_IP="YOUR_DROPLET_IP"                    # ← REPLACE: e.g., 164.90.148.7
DROPLET_USER="root"
SSH_KEY="$HOME/.ssh/${APP_NAME}_universal"      # ← Key naming convention: <app>_universal
APP_DIR="/var/www/${APP_NAME}"                  # ← REPLACE if different
LIVE_URL="https://YOUR_DOMAIN.com"              # ← REPLACE: e.g., https://growlingeyes.com
# ============================================================

echo "========================================="
echo "  ${APP_NAME} — Deploy to Production"
echo "  Target: ${DROPLET_USER}@${DROPLET_IP}"
echo "========================================="

# Step 1: Build
echo ""
echo "[1/4] Building project..."
pnpm build

# Step 2: Package
echo ""
echo "[2/4] Packaging build..."
tar -czf /tmp/${APP_NAME}-update.tar.gz dist/ package.json pnpm-lock.yaml
echo "  Package size: $(du -sh /tmp/${APP_NAME}-update.tar.gz | cut -f1)"

# Step 3: Upload
echo ""
echo "[3/4] Uploading to droplet..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no /tmp/${APP_NAME}-update.tar.gz "${DROPLET_USER}@${DROPLET_IP}:/tmp/"

# Step 4: Extract and restart
echo ""
echo "[4/4] Extracting and restarting PM2..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${DROPLET_USER}@${DROPLET_IP}" "
  set -e
  cd ${APP_DIR}
  tar -xzf /tmp/${APP_NAME}-update.tar.gz -C .
  pnpm install --prod --frozen-lockfile
  pm2 restart ${APP_NAME} --update-env
  rm /tmp/${APP_NAME}-update.tar.gz
  echo 'PM2 status:'
  pm2 status
"

# Cleanup local temp
rm /tmp/${APP_NAME}-update.tar.gz

echo ""
echo "========================================="
echo "  Deploy complete!"
echo "  Live at: ${LIVE_URL}"
echo "========================================="

# Health check
echo ""
echo "Health check..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -A "Mozilla/5.0" "${LIVE_URL}")
if [ "$HTTP_STATUS" = "200" ]; then
  echo "  Site is UP — HTTP ${HTTP_STATUS}"
else
  echo "  WARNING: Site returned HTTP ${HTTP_STATUS} — check PM2 logs on droplet"
  echo "  SSH in: ssh -i ${SSH_KEY} ${DROPLET_USER}@${DROPLET_IP}"
  echo "  Check logs: pm2 logs ${APP_NAME}"
fi
