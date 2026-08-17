#!/bin/bash
# PWA Readiness Audit Script
# Run from your app repo root: bash templates/mobile/pwa-audit.sh
# Or copy to your app: cp templates/mobile/pwa-audit.sh scripts/pwa-audit.sh

set -euo pipefail

PASS="✅"
WARN="⚠️ "
FAIL="❌"

# Track results
ERRORS=0
WARNINGS=0

echo "======================================"
echo "  PWA Readiness Audit"
echo "======================================"
echo ""

# -------------------------------------------------------------------------
# Check 1: manifest.json exists
# -------------------------------------------------------------------------
MANIFEST_PATH="client/public/manifest.json"
if [ ! -f "$MANIFEST_PATH" ]; then
  # Try alternate locations
  if [ -f "public/manifest.json" ]; then
    MANIFEST_PATH="public/manifest.json"
  elif [ -f "static/manifest.json" ]; then
    MANIFEST_PATH="static/manifest.json"
  else
    echo "$FAIL manifest.json not found"
    echo "     FIX: Create client/public/manifest.json with required fields"
    echo "     See: templates/brand/BRAND_IDENTITY_TEMPLATE.md — Web Manifest Entry"
    ERRORS=$((ERRORS + 1))
    MANIFEST_PATH=""
  fi
fi

if [ -n "$MANIFEST_PATH" ]; then
  echo "$PASS manifest.json found at $MANIFEST_PATH"
fi

# -------------------------------------------------------------------------
# Check 2: manifest.json has required fields
# -------------------------------------------------------------------------
if [ -n "$MANIFEST_PATH" ]; then
  REQUIRED_FIELDS=("name" "short_name" "start_url" "display" "icons")
  for field in "${REQUIRED_FIELDS[@]}"; do
    if ! grep -q "\"$field\"" "$MANIFEST_PATH" 2>/dev/null; then
      echo "$FAIL manifest.json is missing required field: \"$field\""
      echo "     FIX: Add \"$field\" to $MANIFEST_PATH"
      ERRORS=$((ERRORS + 1))
    else
      echo "$PASS manifest.json has \"$field\""
    fi
  done
fi

# -------------------------------------------------------------------------
# Check 3: Service worker referenced
# -------------------------------------------------------------------------
SW_FOUND=false

# Check in common HTML entry points
for html_file in "client/index.html" "index.html" "public/index.html" "client/public/index.html"; do
  if [ -f "$html_file" ] && grep -q "service-worker\|serviceWorker\|sw\.js\|service_worker" "$html_file" 2>/dev/null; then
    echo "$PASS Service worker referenced in $html_file"
    SW_FOUND=true
    break
  fi
done

# Check for service worker file itself
if ! $SW_FOUND; then
  for sw_file in "client/public/sw.js" "public/sw.js" "client/public/service-worker.js" "public/service-worker.js"; do
    if [ -f "$sw_file" ]; then
      echo "$WARN Service worker file found at $sw_file but not confirmed referenced in HTML"
      echo "     FIX: Ensure your HTML/app entry point registers the service worker"
      WARNINGS=$((WARNINGS + 1))
      SW_FOUND=true
      break
    fi
  done
fi

if ! $SW_FOUND; then
  echo "$FAIL No service worker found or referenced"
  echo "     FIX: Add a service worker using Workbox or Vite PWA plugin"
  echo "     Example: npm install vite-plugin-pwa"
  ERRORS=$((ERRORS + 1))
fi

# -------------------------------------------------------------------------
# Check 4: Required icon sizes (192x192, 512x512 minimum)
# -------------------------------------------------------------------------
ICON_192_FOUND=false
ICON_512_FOUND=false

ICON_DIRS=("client/public/icons" "public/icons" "client/public" "public" "static/icons")

for dir in "${ICON_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    if find "$dir" -name "*192*" -o -name "*192x192*" 2>/dev/null | grep -q .; then
      echo "$PASS 192x192 icon found in $dir"
      ICON_192_FOUND=true
    fi
    if find "$dir" -name "*512*" -o -name "*512x512*" 2>/dev/null | grep -q .; then
      echo "$PASS 512x512 icon found in $dir"
      ICON_512_FOUND=true
    fi
  fi
done

if ! $ICON_192_FOUND; then
  echo "$FAIL 192x192 PWA icon not found"
  echo "     FIX: Add icon-192x192.png to client/public/icons/"
  echo "     See: templates/brand/ICON_SIZE_SPEC.md"
  ERRORS=$((ERRORS + 1))
fi

if ! $ICON_512_FOUND; then
  echo "$FAIL 512x512 PWA icon not found"
  echo "     FIX: Add icon-512x512.png to client/public/icons/"
  echo "     See: templates/brand/ICON_SIZE_SPEC.md"
  ERRORS=$((ERRORS + 1))
fi

# -------------------------------------------------------------------------
# Check 5: HTTPS in production URL (check env file or package.json)
# -------------------------------------------------------------------------
PROD_URL_FOUND=false

# Check common env variable patterns
for env_file in ".env" ".env.production" ".env.local"; do
  if [ -f "$env_file" ]; then
    if grep -q "PROD_URL=https://\|PRODUCTION_URL=https://\|NEXT_PUBLIC_URL=https://\|VITE_APP_URL=https://" "$env_file" 2>/dev/null; then
      echo "$PASS Production URL uses HTTPS (found in $env_file)"
      PROD_URL_FOUND=true
      break
    elif grep -q "PROD_URL=http://\|PRODUCTION_URL=http://" "$env_file" 2>/dev/null; then
      echo "$FAIL Production URL uses HTTP (not HTTPS)"
      echo "     FIX: Update your production URL to use https://"
      ERRORS=$((ERRORS + 1))
      PROD_URL_FOUND=true
      break
    fi
  fi
done

if ! $PROD_URL_FOUND; then
  echo "$WARN Could not verify production URL uses HTTPS"
  echo "     FIX: Ensure your production deployment uses HTTPS (required for PWA)"
  WARNINGS=$((WARNINGS + 1))
fi

# -------------------------------------------------------------------------
# Summary
# -------------------------------------------------------------------------
echo ""
echo "======================================"
echo "  Audit Summary"
echo "======================================"
echo "$FAIL Errors:   $ERRORS"
echo "$WARN Warnings: $WARNINGS"
echo ""

if [ "$ERRORS" -gt 0 ]; then
  echo "PWA readiness: ❌ NOT READY ($ERRORS errors must be fixed)"
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo "PWA readiness: ⚠️  MOSTLY READY ($WARNINGS warnings — review recommended)"
  exit 0
else
  echo "PWA readiness: ✅ READY"
  exit 0
fi
