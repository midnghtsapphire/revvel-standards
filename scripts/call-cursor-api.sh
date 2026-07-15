#!/bin/bash
# Call Cursor API with retry logic
# Usage: CURSOR_API_KEY=xxx ISSUE_NUMBER=123 ISSUE_TITLE="..." ISSUE_BODY="..." ./call-cursor-api.sh
# Returns: Exit code 0 on success, non-zero on failure
#
# RESTORED 2026-07-14 (WR-A16): deleted by 514f92c8 ("retire Cursor tier") but
# agent-fallback.yml STILL wires the Cursor tier and calls this script — owner
# directive: Cursor connections are in active use and must stay. Per
# COMMENT-DONT-DELETE this should have been REVVEL-DISABLED, not deleted.
# Recovered from 514f92c8^ via git show. Verify CURSOR_API_KEY secret +
# endpoint before relying on the tier (see WR-A16).

set -e

# Configuration
MAX_RETRIES=3
RETRY_DELAY=10  # initial delay in seconds (doubles each retry)
TIMEOUT=60      # seconds

# Validate required environment variables
if [ -z "${CURSOR_API_KEY}" ]; then
  echo "ERROR: CURSOR_API_KEY environment variable is required"
  exit 1
fi

if [ -z "${ISSUE_NUMBER}" ] || [ -z "${ISSUE_TITLE}" ]; then
  echo "ERROR: ISSUE_NUMBER and ISSUE_TITLE environment variables are required"
  exit 1
fi

# Build the request payload
PAYLOAD=$(jq -n \
  --arg issue_number "${ISSUE_NUMBER}" \
  --arg title "${ISSUE_TITLE}" \
  --arg body "${ISSUE_BODY:-}" \
  '{
    "issue": {
      "number": ($issue_number | tonumber),
      "title": $title,
      "body": $body
    },
    "action": "implement"
  }')

# Retry loop with exponential backoff
ATTEMPT=1
DELAY=${RETRY_DELAY}

while [ ${ATTEMPT} -le ${MAX_RETRIES} ]; do
  echo "Attempt ${ATTEMPT}/${MAX_RETRIES}: Calling Cursor API..."

  HTTP_CODE=$(curl -s -o /tmp/cursor-response.json -w "%{http_code}" \
    --max-time ${TIMEOUT} \
    -X POST \
    -H "Authorization: Bearer ${CURSOR_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "${PAYLOAD}" \
    "https://api.cursor.com/v1/agents" || echo "000")

  if [ "${HTTP_CODE}" = "200" ] || [ "${HTTP_CODE}" = "201" ] || [ "${HTTP_CODE}" = "202" ]; then
    echo "SUCCESS: Cursor API accepted the task (HTTP ${HTTP_CODE})"
    cat /tmp/cursor-response.json 2>/dev/null || true
    exit 0
  fi

  echo "WARN: Cursor API returned HTTP ${HTTP_CODE}"
  cat /tmp/cursor-response.json 2>/dev/null || true

  # Do not retry on auth errors — they will not self-heal
  if [ "${HTTP_CODE}" = "401" ] || [ "${HTTP_CODE}" = "403" ]; then
    echo "ERROR: Authentication failed (HTTP ${HTTP_CODE}). Check CURSOR_API_KEY."
    exit 1
  fi

  if [ ${ATTEMPT} -lt ${MAX_RETRIES} ]; then
    echo "Retrying in ${DELAY}s..."
    sleep ${DELAY}
    DELAY=$((DELAY * 2))
  fi
  ATTEMPT=$((ATTEMPT + 1))
done

echo "ERROR: Cursor API failed after ${MAX_RETRIES} attempts"
exit 1
