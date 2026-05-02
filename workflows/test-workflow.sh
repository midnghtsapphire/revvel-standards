#!/bin/bash
# Test the PDF Product Automation workflow
# Usage: ./test-workflow.sh <webhook-url>

WEBHOOK_URL="${1}"

if [ -z "$WEBHOOK_URL" ]; then
    echo "Error: Please provide webhook URL"
    echo "Usage: ./test-workflow.sh <webhook-url>"
    exit 1
fi

echo "🧪 Testing PDF Product Automation workflow..."
echo "Webhook URL: $WEBHOOK_URL"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d @"$SCRIPT_DIR/test-payload.json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Success! HTTP $HTTP_CODE"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo "❌ Failed! HTTP $HTTP_CODE"
    echo ""
    echo "Response:"
    echo "$BODY"
    exit 1
fi
