#!/bin/bash
# Call Devin AI with retry logic and rate limit detection
# Usage: DEVIN_API_KEY=xxx ISSUE_NUMBER=123 ISSUE_TITLE="..." ISSUE_BODY="..." ./call-devin-api.sh
# Returns: Exit code 0 on success, non-zero on failure

set -e

# Configuration
MAX_RETRIES=3
RETRY_DELAY=10  # initial delay in seconds (doubles each retry)
TIMEOUT=60      # seconds

# Validate required environment variables
if [ -z "${DEVIN_API_KEY}" ]; then
  echo "ERROR: DEVIN_API_KEY environment variable is required"
  exit 1
fi

if [ -z "${ISSUE_NUMBER}" ] || [ -z "${ISSUE_TITLE}" ]; then
  echo "ERROR: ISSUE_NUMBER and ISSUE_TITLE environment variables are required"
  exit 1
fi

# Devin API endpoint (placeholder - update with actual endpoint when available)
DEVIN_API_URL="${DEVIN_API_URL:-https://api.devin.ai/v1/tasks}"

echo "🤖 Calling Devin AI..."
echo "Issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}"

# Function to call Devin API
call_devin() {
  local attempt=$1

  echo "Attempt ${attempt}/${MAX_RETRIES}..."

  # Prepare request payload using jq to safely escape special characters
  PAYLOAD=$(jq -n \
    --arg title "$ISSUE_TITLE" \
    --arg desc "${ISSUE_BODY:-}" \
    --arg repo "${GITHUB_REPOSITORY:-unknown}" \
    --argjson issue_num "$ISSUE_NUMBER" \
    --argjson timeout "$TIMEOUT" \
    '{task: {title: $title, description: $desc, repository: $repo, issue_number: $issue_num}, options: {timeout: $timeout, auto_commit: true, create_pr: true}}')

  if [ -z "${PAYLOAD}" ]; then
    echo "❌ Failed to construct JSON payload"
    return 1
  fi

  # Make API call
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${DEVIN_API_URL}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${DEVIN_API_KEY}" \
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
      echo "✅ Devin API call successful"
      echo "${RESPONSE_BODY}" > /tmp/devin-response.json
      return 0
      ;;
    429)
      echo "⚠️  Rate limit exceeded (429) — skipping retries for faster fallback"
      return 4
      ;;
    401|403)
      echo "❌ Authentication failed (${HTTP_CODE})"
      echo "Check DEVIN_API_KEY validity"
      return 2
      ;;
    500|502|503|504)
      echo "⚠️  Server error (${HTTP_CODE})"
      if [ ${attempt} -lt ${MAX_RETRIES} ]; then
        echo "Will retry with exponential backoff..."
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
  EXIT_CODE=0
  call_devin ${i} || EXIT_CODE=$?

  if [ ${EXIT_CODE} -eq 0 ]; then
    exit 0
  fi

  # Don't retry on auth errors or rate limits (429)
  if [ ${EXIT_CODE} -eq 2 ] || [ ${EXIT_CODE} -eq 4 ]; then
    exit 1
  fi

  # Wait before retry with exponential backoff (except on last attempt)
  if [ ${i} -lt ${MAX_RETRIES} ]; then
    DELAY=$((RETRY_DELAY * (2 ** (i - 1))))
    echo "Waiting ${DELAY}s before retry..."
    sleep ${DELAY}
  fi
done

echo "❌ Devin AI failed after ${MAX_RETRIES} attempts"
exit 1
