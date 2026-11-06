#!/bin/bash
# Start an OpenHands Cloud conversation for a GitHub issue.
#
# This file used to be a verbatim copy of the Devin caller. Every identifier in
# it was Devin's: it required DEVIN_API_KEY, posted to api.devin.ai, wrote
# /tmp/devin-response.json, and printed "Check DEVIN_API_KEY validity" on a 401.
# The word "openhands" did not appear in it once.
#
# `agent-fallback.yml` passes it OPENHANDS_API_KEY, which the script never read,
# so the lane exited 1 at the key check on every single run -- while the health
# check upstream reported "✅ OpenHands API key configured", because that check
# only tests whether the secret is non-empty. A stale or revoked key therefore
# reads as available and then fails for a reason that names the wrong product.
#
# Usage:
#   OPENHANDS_API_KEY=... ISSUE_NUMBER=123 ISSUE_TITLE="..." ISSUE_BODY="..." \
#     ./call-openhands-api.sh
#
# Returns 0 on success, non-zero on failure.
#
# Endpoint: the OpenHands Cloud conversations API, per
# <https://docs.all-hands.dev>. Override OPENHANDS_API_URL if the path moves; a
# 404 from the default means it has, and the body is printed so you can see it.
# The key comes from <https://app.all-hands.dev/settings>.

set -e

MAX_RETRIES=3
RETRY_DELAY=10  # initial delay in seconds (doubles each retry)
TIMEOUT=60      # seconds

if [ -z "${OPENHANDS_API_KEY}" ]; then
  echo "ERROR: OPENHANDS_API_KEY environment variable is required"
  echo "       Create one at https://app.all-hands.dev/settings and store it as"
  echo "       the OPENHANDS_API_KEY Actions secret."
  exit 1
fi

if [ -z "${ISSUE_NUMBER}" ] || [ -z "${ISSUE_TITLE}" ]; then
  echo "ERROR: ISSUE_NUMBER and ISSUE_TITLE environment variables are required"
  exit 1
fi

OPENHANDS_API_URL="${OPENHANDS_API_URL:-https://app.all-hands.dev/api/conversations}"

echo "🤖 Calling OpenHands Cloud..."
echo "Issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}"
echo "Endpoint: ${OPENHANDS_API_URL}"

call_openhands() {
  local attempt=$1

  echo "Attempt ${attempt}/${MAX_RETRIES}..."

  # OpenHands takes the task as a single opening message plus the repository it
  # should be working in, rather than Devin's {task:{...}} envelope.
  PAYLOAD=$(jq -n \
    --arg title "$ISSUE_TITLE" \
    --arg desc "${ISSUE_BODY:-}" \
    --arg repo "${GITHUB_REPOSITORY:-unknown}" \
    --argjson issue_num "$ISSUE_NUMBER" \
    '{
       initial_user_msg: ("Resolve issue #" + ($issue_num | tostring) + ": "
                          + $title + "\n\n" + $desc),
       repository: $repo
     }')

  if [ -z "${PAYLOAD}" ]; then
    echo "❌ Failed to construct JSON payload"
    return 1
  fi

  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${OPENHANDS_API_URL}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${OPENHANDS_API_KEY}" \
    -H "User-Agent: Revvel-Standards/1.0" \
    --max-time ${TIMEOUT} \
    -d "${PAYLOAD}")

  HTTP_CODE=$(echo "${RESPONSE}" | tail -n1)
  RESPONSE_BODY=$(echo "${RESPONSE}" | sed '$d')

  echo "HTTP Status: ${HTTP_CODE}"

  case ${HTTP_CODE} in
    200|201|202)
      echo "✅ OpenHands conversation started"
      echo "${RESPONSE_BODY}" > /tmp/openhands-response.json
      return 0
      ;;
    429)
      echo "⚠️  Rate limit exceeded (429) — skipping retries for faster fallback"
      return 4
      ;;
    401|403)
      echo "❌ Authentication failed (${HTTP_CODE})"
      # Print it. OpenHands Cloud fronts the models with a LiteLLM proxy, and a
      # deleted or rotated key comes back as
      #   "Authentication Error, Invalid proxy server token passed ...
      #    Unable to find token in cache or LiteLLM_VerificationTokenTable"
      # which names the key's last four characters. Swallowing that body and
      # printing "check the key" instead is how an afternoon gets spent.
      echo "${RESPONSE_BODY}"
      echo "A LiteLLM_VerificationTokenTable error means the key no longer"
      echo "exists on the proxy: issue a new one at"
      echo "https://app.all-hands.dev/settings and update the OPENHANDS_API_KEY"
      echo "secret. The key is not recoverable."
      return 2
      ;;
    404)
      echo "❌ Not found (404) — the endpoint has moved"
      echo "${RESPONSE_BODY}"
      echo "Set OPENHANDS_API_URL to the current conversations endpoint."
      return 1
      ;;
    500|502|503|504)
      echo "⚠️  Server error (${HTTP_CODE})"
      echo "${RESPONSE_BODY}"
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

for i in $(seq 1 ${MAX_RETRIES}); do
  EXIT_CODE=0
  call_openhands ${i} || EXIT_CODE=$?

  if [ ${EXIT_CODE} -eq 0 ]; then
    exit 0
  fi

  # Don't retry on auth errors or rate limits (429)
  if [ ${EXIT_CODE} -eq 2 ] || [ ${EXIT_CODE} -eq 4 ]; then
    exit 1
  fi

  if [ ${i} -lt ${MAX_RETRIES} ]; then
    DELAY=$((RETRY_DELAY * (2 ** (i - 1))))
    echo "Waiting ${DELAY}s before retry..."
    sleep ${DELAY}
  fi
done

echo "❌ OpenHands failed after ${MAX_RETRIES} attempts"
exit 1
