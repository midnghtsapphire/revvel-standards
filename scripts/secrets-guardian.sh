#!/usr/bin/env bash
# secrets-guardian.sh - Verify and restore critical GitHub Actions secrets
#
# This script ensures critical secrets are present in the repository. It emits
# `restored=` and `missing=` lines to $GITHUB_OUTPUT (when set) listing secret
# names that were restored (placeholder set) or are still missing.
#
# Usage: bash scripts/secrets-guardian.sh

set -euo pipefail

# Critical secrets required for the automation pipeline
CRITICAL_SECRETS=(
  "OPENROUTER_API_KEY"
  "POLAR_ACCESS_TOKEN"
  "POLAR_ORG_ID"
  "STRIPE_API_KEY"
  "GITHUB_TOKEN"
  "OPENAI_API_KEY"
  "ANTHROPIC_API_KEY"
  "DISCORD_WEBHOOK"
  "SLACK_WEBHOOK"
  "SENTRY_DSN"
  "NPM_TOKEN"
)

# Optional additional secrets to sweep
ALL_SECRETS=(
  "${CRITICAL_SECRETS[@]}"
  "CODECOV_TOKEN"
  "VERCEL_TOKEN"
  "NETLIFY_AUTH_TOKEN"
)

restored=()
missing=()

check_secret() {
  local name="$1"
  if command -v gh >/dev/null 2>&1; then
    if gh secret list 2>/dev/null | awk '{print $1}' | grep -qx "$name"; then
      return 0
    fi
  fi
  return 1
}

for SECRET in "${CRITICAL_SECRETS[@]}"; do
  if ! check_secret "$SECRET"; then
    missing+=("$SECRET")
  fi
done

for SECRET in "${ALL_SECRETS[@]}"; do
  # Skip if already checked as critical.
  # BUG FIX: previous code used `echo "$CRITICAL_SECRETS"` which expands to
  # only the first element of the array. Use printf with [@] to check all.
  if printf '%s\n' "${CRITICAL_SECRETS[@]}" | grep -qx "$SECRET"; then
    continue
  fi
  if ! check_secret "$SECRET"; then
    missing+=("$SECRET")
  fi
done

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "restored=${restored[*]:-}"
    echo "missing=${missing[*]:-}"
  } >> "$GITHUB_OUTPUT"
fi

echo "Restored: ${restored[*]:-<none>}"
echo "Missing:  ${missing[*]:-<none>}"
