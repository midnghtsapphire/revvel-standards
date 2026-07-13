#!/usr/bin/env bash
# secrets-guardian.sh - Ensures critical GitHub secrets are present
#
# Checks and reports on the presence of critical secrets required by the
# automation pipeline. Writes `restored=` and `missing=` lines to
# $GITHUB_OUTPUT when running in GitHub Actions.

set -euo pipefail

# Critical secrets that must always be present for the pipeline to function.
CRITICAL_SECRETS=(
  "OPENROUTER_API_KEY"
  "POLAR_ACCESS_TOKEN"
  "POLAR_ORG_ID"
  "STRIPE_API_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "GITHUB_TOKEN"
  "NPM_TOKEN"
  "PYPI_TOKEN"
  "DOCKER_HUB_TOKEN"
  "SENTRY_DSN"
  "DISCORD_WEBHOOK"
)

# Additional non-critical secrets to check.
ALL_SECRETS=(
  "${CRITICAL_SECRETS[@]}"
  "SLACK_WEBHOOK"
  "TELEGRAM_BOT_TOKEN"
  "OPENAI_API_KEY"
  "ANTHROPIC_API_KEY"
)

restored=()
missing=()

check_secret() {
  local name="$1"
  if command -v gh >/dev/null 2>&1; then
    if gh secret list 2>/dev/null | grep -q "^${name}\b"; then
      return 0
    fi
  fi
  return 1
}

# First pass: critical secrets
for SECRET in "${CRITICAL_SECRETS[@]}"; do
  if check_secret "$SECRET"; then
    restored+=("$SECRET")
  else
    missing+=("$SECRET")
  fi
done

# Second pass: remaining secrets (skip any already checked as critical).
for SECRET in "${ALL_SECRETS[@]}"; do
  # Proper bash array membership check - expand ALL elements, exact match.
  if printf '%s\n' "${CRITICAL_SECRETS[@]}" | grep -qx "$SECRET"; then
    continue
  fi
  if check_secret "$SECRET"; then
    restored+=("$SECRET")
  else
    missing+=("$SECRET")
  fi
done

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "restored=${restored[*]:-}"
    echo "missing=${missing[*]:-}"
  } >> "$GITHUB_OUTPUT"
fi

echo "Restored: ${restored[*]:-<none>}"
echo "Missing:  ${missing[*]:-<none>}"
