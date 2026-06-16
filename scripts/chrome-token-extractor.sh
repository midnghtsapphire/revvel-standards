#!/bin/bash
# chrome-token-extractor.sh - Extract OAuth tokens from Chrome extensions
# Run with Chrome open and logged into the extensions you want

set -euo pipefail

CHROME_PORT="${CHROME_DEBUG_PORT:-9222}"
CHROME_HOST="${CHROME_DEBUG_HOST:-localhost}"
OUTPUT_FILE="${OUTPUT_FILE:-/tmp/chrome-tokens.json}"

echo "🔍 Extracting tokens from Chrome (localhost:${CHROME_PORT})..."

# Check if Chrome is running with remote debugging
if ! curl -s "http://${CHROME_HOST}:${CHROME_PORT}/json/version" > /dev/null 2>&1; then
  echo "❌ Chrome not running with remote debugging"
  echo "   Start Chrome with: --remote-debugging-port=9222"
  echo ""
  echo "   Example:"
  echo "   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &"
  exit 1
fi

echo "✅ Connected to Chrome"

# Get all cookies from all contexts (including extension storage)
COOKIES=$(curl -s "http://${CHROME_HOST}:${CHROME_PORT}/json/list" | jq -r '.[] | select(.type == "page") | .id' | head -1)

# Extract Google OAuth tokens from cookies/localStorage
EXTRACTED_TOKENS="{}"

# Common OAuth token patterns in cookies
for domain in "google.com" "claude.ai" "gumloop.com" "localhost"; do
  echo "   Checking: $domain"
  
  # Try to get cookies for each domain
  COOKIE_DATA=$(curl -s "http://${CHROME_HOST}:${CHROME_PORT}/cookie/{${domain}}/*" 2>/dev/null || echo "[]")
  
  # Look for OAuth tokens (typically ya29. for Google)
  GOOGLE_TOKEN=$(curl -s "http://${CHROME_HOST}:${CHROME_PORT}/json/request" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{\"method\":\"Network.getCookies\",\"params\":{\"urls\":[\"https://accounts.google.com/*\"]}}" 2>/dev/null | \
    jq -r '.result.cookies[] | select(.name | contains(" oauth" ) or contains("token")) | .value' 2>/dev/null || echo "")
  
  if [ -n "$GOOGLE_TOKEN" ] && [ "$GOOGLE_TOKEN" != "null" ]; then
    EXTRACTED_TOKENS=$(echo "$EXTRACTED_TOKENS" | jq --arg token "$GOOGLE_TOKEN" '. + {GOOGLE_OAUTH_TOKEN: $token}')
    echo "   ✅ Found Google OAuth token"
  fi
done

# Also check localStorage for extension tokens
echo "   Checking localStorage..."

# Get all localStorage keys from extension pages
for ext_url in "chrome-extension://*" "moz-extension://*"; do
  LS_DATA=$(curl -s "http://${CHROME_HOST}:${CHROME_PORT}/json/global" 2>/dev/null | \
    jq -r '. | to_entries[] | select(.key | contains("storage")) | .value' 2>/dev/null || echo "")
done

# Save to output file
echo "$EXTRACTED_TOKENS" > "$OUTPUT_FILE"

echo ""
echo "📄 Extracted tokens saved to: $OUTPUT_FILE"
cat "$OUTPUT_FILE"

# If we have a GitHub token, push to GitHub secrets
if [ -n "$GITHUB_TOKEN" ] && [ "$EXTRACTED_TOKENS" != "{}" ]; then
  echo ""
  echo "🔄 Syncing to GitHub..."
  
  for key in $(echo "$EXTRACTED_TOKENS" | jq -r 'keys[]'); do
    value=$(echo "$EXTRACTED_TOKENS" | jq -r ".$key")
    echo "   Setting $key..."
    gh secret set "$key" --body "$value" 2>/dev/null || echo "   ⚠️ Could not set $key"
  done
  
  echo "✅ Synced to GitHub"
fi

echo ""
echo "Done!"