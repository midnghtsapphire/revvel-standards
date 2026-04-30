#!/bin/bash
# Call Cursor API with retry logic
# Usage: CURSOR_API_KEY=xxx ISSUE_NUMBER=123 ISSUE_TITLE="..." ISSUE_BODY="..." ./call-cursor-api.sh
# Returns: Exit code 0 on success, non-zero on failure

set -e

# Configuration
MAX_RETRIES=3
RETRY_DELAY=10  # seconds
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

# Cursor API endpoint (placeholder - update with actual endpoint when available)
CURSOR_API_URL="${CURSOR_API_URL:-https://api.cursor.sh/v1/tasks}"

echo "🔧 Calling Cursor API..."
echo "Issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}"

# Function to call Cursor API
call_cursor() {
  local attempt=$1
  
  echo "Attempt ${attempt}/${MAX_RETRIES}..."
  
  # Prepare request payload
  PAYLOAD=$(cat <<EOF
{
  "task": {
    "title": "${ISSUE_TITLE}",
    "description": "${ISSUE_BODY}",
    "repository": "${GITHUB_REPOSITORY:-unknown}",
    "issue_number": ${ISSUE_NUMBER}
  },
  "options": {
    "timeout": ${TIMEOUT},
    "auto_commit": true
  }
}
EOF
)
  
  # Make API call
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${CURSOR_API_URL}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${CURSOR_API_KEY}" \
    -H "User-Agent: Revvel-Standards/1.0" \
    --max-time ${TIMEOUT} \
    -d "${PAYLOAD}")
  
  # Extract HTTP status code (last line)
  HTTP_CODE=$(echo "${RESPONSE}" | tail -n1)
  RESPONSE_BODY=$(echo "${RESPONSE}" | sed '$d')
  
  echo "HTTP Status: ${HTTP_CODE}"
  
  # Check response
  case ${HTTP_CODE} in
    200|201|202)
      echo "✅ Cursor API call successful"
      echo "${RESPONSE_BODY}" > /tmp/cursor-response.json
      return 0
      ;;
    429)
      echo "⚠️  Rate limit exceeded (429)"
      return 1
      ;;
    401|403)
      echo "❌ Authentication failed (${HTTP_CODE})"
      echo "Check CURSOR_API_KEY validity"
      return 2
      ;;
    500|502|503|504)
      echo "⚠️  Server error (${HTTP_CODE})"
      if [ ${attempt} -lt ${MAX_RETRIES} ]; then
        echo "Retrying in ${RETRY_DELAY} seconds..."
        return 3
      else
        return 1
      fi
      ;;
    000)
      echo "❌ Connection failed (timeout or network error)"
      return 1
      ;;
    *)
      echo "❌ Unexpected response (${HTTP_CODE})"
      echo "${RESPONSE_BODY}"
      return 1
      ;;
  esac
}

# Retry loop
for i in $(seq 1 ${MAX_RETRIES}); do
  if call_cursor ${i}; then
    exit 0
  fi
  
  EXIT_CODE=$?
  
  # Don't retry on auth errors
  if [ ${EXIT_CODE} -eq 2 ]; then
    exit ${EXIT_CODE}
  fi
  
  # Wait before retry (except on last attempt)
  if [ ${i} -lt ${MAX_RETRIES} ]; then
    sleep ${RETRY_DELAY}
  fi
done

echo "❌ Cursor API failed after ${MAX_RETRIES} attempts"
exit 1
