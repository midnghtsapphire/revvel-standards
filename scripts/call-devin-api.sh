#!/usr/bin/env bash
#
# call-devin-api.sh
#
# Invokes the Devin API to run an autonomous task.
# Requires the DEVIN_API_KEY environment variable to be set.
#
set -euo pipefail

if [ -z "${DEVIN_API_KEY:-}" ]; then
  echo "ERROR: DEVIN_API_KEY environment variable is required" >&2
  exit 1
 fi

TASK_DESCRIPTION="${TASK_DESCRIPTION:-No task description provided}"
DEVIN_API_URL="${DEVIN_API_URL:-https://api.devin.ai/v1/sessions}"

echo "Invoking Devin API..."
echo "Task: ${TASK_DESCRIPTION}"

RESPONSE=$(curl -sS -X POST "${DEVIN_API_URL}" \
  -H "Authorization: Bearer ${DEVIN_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg prompt "${TASK_DESCRIPTION}" '{prompt: $prompt, idempotent: true}')" \
  || true)

if [ -z "${RESPONSE}" ]; then
  echo "ERROR: Empty response from Devin API" >&2
  exit 1
fi

echo "Devin API response:"
echo "${RESPONSE}"
