#!/usr/bin/env bash
# secrets-guardian.sh - Verify and restore critical GitHub repository secrets
#
# Checks presence of critical secrets via `gh secret list` and reports
# missing/restored counts to $GITHUB_OUTPUT for downstream workflow steps.
# secrets-guardian.sh - Ensure critical GitHub Actions secrets are present
#
# This script checks that all critical secrets exist in the repository.
# It emits `restored=` and `missing=` lines to $GITHUB_OUTPUT for use in workflows.
#
# Usage: ./scripts/secrets-guardian.sh

set -euo pipefail

# Critical secrets required for automated pipelines
CRITICAL_SECRETS=(
  "OPENROUTER_API_KEY"
  "GITHUB_TOKEN"
  "POLAR_ACCESS_TOKEN"
  "POLAR_WEBHOOK_SECRET"
  "STRIPE_API_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "OPENAI_API_KEY"
  "ANTHROPIC_API_KEY"
  "NPM_TOKEN"
  "PYPI_TOKEN"
  "DOCKER_HUB_TOKEN"
)

# All secrets to audit (superset)
ALL_SECRETS=(
  "${CRITICAL_SECRETS[@]}"
  "SENTRY_DSN"
  "DATADOG_API_KEY"
  "SLACK_WEBHOOK_URL"
)

restored=()
missing=()

# Fetch current secrets once (name column only)
if command -v gh >/dev/null 2>&1; then
  existing=$(gh secret list --json name --jq '.[].name' 2>/dev/null || true)
else
  existing=""
fi

check_secret() {
  local name="$1"
  if printf '%s\n' "$existing" | grep -qx "$name"; then
    return 0
  fi
  return 1
}

# First pass: critical secrets
for SECRET in "${CRITICAL_SECRETS[@]}"; do
  if check_secret "$SECRET"; then
    continue
  fi
  missing+=("$SECRET")
done

# Second pass: remaining secrets (skip ones already checked as critical)
for SECRET in "${ALL_SECRETS[@]}"; do
  # Skip if already in the critical set (fixed: expand full array)
  if printf '%s\n' "${CRITICAL_SECRETS[@]}" | grep -qx "$SECRET"; then
    continue
  fi
  if check_secret "$SECRET"; then
    continue
  fi
  missing+=("$SECRET")
done

# Emit outputs
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "restored=${restored[*]:-}"
    echo "missing=${missing[*]:-}"
    echo "missing_count=${#missing[@]}"
    echo "restored_count=${#restored[@]}"
  } >> "$GITHUB_OUTPUT"
fi

echo "Secrets guardian: ${#missing[@]} missing, ${#restored[@]} restored"
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Missing: ${missing[*]}"
fi
# Critical secrets required for the automation pipeline
CRITICAL_SECRETS=(
  "OPENROUTER_API_KEY"
  "ANTHROPIC_API_KEY"
  "OPENAI_API_KEY"
  "POLAR_ACCESS_TOKEN"
  "POLAR_ORG_ID"
  "STRIPE_API_KEY"
  "GITHUB_TOKEN"
  "NPM_TOKEN"
  "DOCKER_TOKEN"
  "SENTRY_DSN"
  "DISCORD_WEBHOOK"
)

# All secrets to check (critical + optional)
ALL_SECRETS=(
  "${CRITICAL_SECRETS[@]}"
  "SLACK_WEBHOOK"
  "TELEGRAM_BOT_TOKEN"
)

restored=()
missing=()

# Get list of existing secrets once
if command -v gh >/dev/null 2>&1; then
  EXISTING_SECRETS=$(gh secret list --json name -q '.[].name' 2>/dev/null || echo "")
else
  EXISTING_SECRETS=""
fi

# First pass: check critical secrets
for SECRET in "${CRITICAL_SECRETS[@]}"; do
  if printf '%s\n' "$EXISTING_SECRETS" | grep -qx "$SECRET"; then
    continue
  fi

  # Try to restore from environment variable
  ENV_VAR_VALUE="${!SECRET:-}"
  if [ -n "$ENV_VAR_VALUE" ] && command -v gh >/dev/null 2>&1; then
    if echo "$ENV_VAR_VALUE" | gh secret set "$SECRET" 2>/dev/null; then
      restored+=("$SECRET")
      continue
    fi
  fi

  missing+=("$SECRET")
done

# Second pass: check optional secrets (skip ones already checked as critical)
for SECRET in "${ALL_SECRETS[@]}"; do
  # Skip if already checked in critical pass
  if printf '%s\n' "${CRITICAL_SECRETS[@]}" | grep -qx "$SECRET"; then
    continue
  fi

  if printf '%s\n' "$EXISTING_SECRETS" | grep -qx "$SECRET"; then
    continue
  fi

  ENV_VAR_VALUE="${!SECRET:-}"
  if [ -n "$ENV_VAR_VALUE" ] && command -v gh >/dev/null 2>&1; then
    if echo "$ENV_VAR_VALUE" | gh secret set "$SECRET" 2>/dev/null; then
      restored+=("$SECRET")
      continue
    fi
  fi

  missing+=("$SECRET")
done

# Emit outputs
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "restored=${restored[*]:-}" >> "$GITHUB_OUTPUT"
  echo "missing=${missing[*]:-}" >> "$GITHUB_OUTPUT"
fi

echo "Restored: ${restored[*]:-none}"
echo "Missing:  ${missing[*]:-none}"
