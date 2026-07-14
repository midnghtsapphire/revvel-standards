#!/usr/bin/env bash
# secrets-guardian.sh - Ensure critical GitHub secrets are present
#
# Checks that critical repository secrets are configured. If any are missing,
# reports them via GITHUB_OUTPUT for downstream restoration workflows.
#
# Usage: bash scripts/secrets-guardian.sh

set -euo pipefail

# Critical secrets required for the $10M mission automation pipeline
CRITICAL_SECRETS=(
  "GITHUB_TOKEN"
  "OPENROUTER_API_KEY"
  "POLAR_ACCESS_TOKEN"
  "POLAR_WEBHOOK_SECRET"
  "ANTHROPIC_API_KEY"
  "OPENAI_API_KEY"
  "STRIPE_API_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "NPM_TOKEN"
  "VERCEL_TOKEN"
  "CLOUDFLARE_API_TOKEN"
)

# Additional secrets to sweep after critical set
ALL_SECRETS=(
  "${CRITICAL_SECRETS[@]}"
  "SENTRY_AUTH_TOKEN"
  "CODECOV_TOKEN"
  "DISCORD_WEBHOOK_URL"
  "SLACK_WEBHOOK_URL"
)

restored=()
missing=()

# Check critical secrets first
for SECRET in "${CRITICAL_SECRETS[@]}"; do
  if gh secret list 2>/dev/null | grep -q "^${SECRET}\b"; then
    restored+=("$SECRET")
  else
    missing+=("$SECRET")
  fi
done

# Sweep remaining secrets, skipping any already checked in the critical loop
for SECRET in "${ALL_SECRETS[@]}"; do
  # Skip if already checked as a critical secret
  if printf '%s\n' "${CRITICAL_SECRETS[@]}" | grep -qx "$SECRET"; then
    continue
  fi
  if gh secret list 2>/dev/null | grep -q "^${SECRET}\b"; then
    restored+=("$SECRET")
  else
    missing+=("$SECRET")
  fi
done

# Emit results to GITHUB_OUTPUT if available
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "restored=${restored[*]:-}"
    echo "missing=${missing[*]:-}"
  } >> "$GITHUB_OUTPUT"
fi

echo "Restored (present): ${#restored[@]}"
echo "Missing:            ${#missing[@]}"

if [ "${#missing[@]}" -gt 0 ]; then
  echo "Missing secrets: ${missing[*]}" >&2
  exit 0
fi
