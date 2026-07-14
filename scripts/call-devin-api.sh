#!/usr/bin/env bash
# call-devin-api.sh - Invoke the Devin API to process an issue or task.
#
# Required env:
#   DEVIN_API_KEY - API key for authenticating with the Devin API
# Optional env:
#   GITHUB_TOKEN, ISSUE_NUMBER, TASK_DESCRIPTION, REPO

set -euo pipefail

if [ -z "${DEVIN_API_KEY:-}" ]; then
  echo "ERROR: DEVIN_API_KEY environment variable is required" >&2
  exit 1
 fi

DEVIN_API_URL="${DEVIN_API_URL:-https://api.devin.ai/v1/sessions}"

PROMPT="${TASK_DESCRIPTION:-Process issue #${ISSUE_NUMBER:-unknown} in ${REPO:-unknown repository}}"

echo "Invoking Devin API for: ${PROMPT}"

HTTP_CODE=$(curl -sS -o /tmp/devin_response.json -w "%{http_code}" \
  -X POST "${DEVIN_API_URL}" \
  -H "Authorization: Bearer ${DEVIN_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg prompt "$PROMPT" '{prompt: $prompt, idempotent: true}')" \
  || echo "000")

echo "HTTP status: ${HTTP_CODE}"
cat /tmp/devin_response.json || true
echo

if [ "${HTTP_CODE}" -ge 200 ] && [ "${HTTP_CODE}" -lt 300 ]; then
  echo "✅ Devin session created successfully"
  exit 0
else
  echo "❌ Devin API call failed with HTTP ${HTTP_CODE}" >&2
  exit 1
fi
