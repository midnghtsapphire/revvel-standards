#!/usr/bin/env bash
# secrets-guardian.sh - Ensure critical GitHub Actions secrets exist
#
# PRIME DIRECTIVE: $10k/month → $10M in 3 years
# Critical secrets keep the automated product pipeline (Polar.sh, OSINT tools)
# operational. Missing secrets = broken revenue automation.
#
# Usage: ./scripts/secrets-guardian.sh
#
# Environment:
#   GITHUB_OUTPUT - if set, writes `restored=` and `missing=` lines.
#   GH_REPO       - optional repo override for `gh secret` commands.

set -euo pipefail

# Critical secrets required by the revenue automation pipeline.
CRITICAL_SECRETS=(
  "GITHUB_TOKEN"
  "POLAR_ACCESS_TOKEN"
  "POLAR_WEBHOOK_SECRET"
  "OPENROUTER_API_KEY"
  "OPENAI_API_KEY"
  "ANTHROPIC_API_KEY"
  "STRIPE_API_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "SENTRY_DSN"
  "DATABASE_URL"
  "REDIS_URL"
)

# Additional (non-critical) secrets to inspect after the critical pass.
ALL_SECRETS=(
  "${CRITICAL_SECRETS[@]}"
  "SLACK_WEBHOOK_URL"
  "DISCORD_WEBHOOK_URL"
  "SENDGRID_API_KEY"
)

restored=()
missing=()

secret_exists() {
  local name="$1"
  gh secret list 2>/dev/null | awk '{print $1}' | grep -qx "$name"
}

check_secret() {
  local name="$1"
  if secret_exists "$name"; then
    return 0
  fi
  missing+=("$name")
  return 1
}

# First pass: critical secrets.
for SECRET in "${CRITICAL_SECRETS[@]}"; do
  check_secret "$SECRET" || true
done

# Second pass: remaining secrets, skipping ones already handled above.
for SECRET in "${ALL_SECRETS[@]}"; do
  # Skip secrets already processed in the critical loop. The previous
  # implementation used `echo "$CRITICAL_SECRETS"` which only expands to the
  # first element of the array, so all but the first critical secret fell
  # through and were re-checked (doubling gh API calls and producing duplicate
  # entries in the missing=/restored= output).
  if printf '%s\n' "${CRITICAL_SECRETS[@]}" | grep -qx "$SECRET"; then
    continue
  fi
  check_secret "$SECRET" || true
done

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "restored=${restored[*]:-}"
    echo "missing=${missing[*]:-}"
  } >> "$GITHUB_OUTPUT"
fi

if (( ${#missing[@]} > 0 )); then
  echo "⚠️  Missing secrets: ${missing[*]}" >&2
fi

exit 0
