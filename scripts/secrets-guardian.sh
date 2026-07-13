#!/usr/bin/env bash
# secrets-guardian.sh - Verify and restore critical GitHub secrets
#
# Ensures the 11 critical secrets required for the $10k/month → $10M pipeline
# are present in the repository. Writes results to $GITHUB_OUTPUT when run
# inside GitHub Actions.

set -euo pipefail

# Critical secrets required for PRIME DIRECTIVE automation
CRITICAL_SECRETS=(
  "GITHUB_TOKEN"
  "POLAR_ACCESS_TOKEN"
  "POLAR_ORG_ID"
  "OPENROUTER_API_KEY"
  "ANTHROPIC_API_KEY"
  "OPENAI_API_KEY"
  "STRIPE_API_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "SENTRY_DSN"
  "VERCEL_TOKEN"
  "NPM_TOKEN"
)

# Optional / secondary secrets
ALL_SECRETS=(
  "${CRITICAL_SECRETS[@]}"
  "DISCORD_WEBHOOK"
  "SLACK_WEBHOOK"
  "TWITTER_BEARER_TOKEN"
  "GITHUB_APP_ID"
  "GITHUB_APP_PRIVATE_KEY"
)

restored=()
missing=()

check_secret() {
  local name="$1"
  if gh secret list 2>/dev/null | grep -q "^${name}\b"; then
    return 0
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

# Second pass: remaining (non-critical) secrets, skip those already handled
for SECRET in "${ALL_SECRETS[@]}"; do
  # Skip if already checked in the critical loop.
  # Bug fix: previously used `echo "$CRITICAL_SECRETS"` which only expands
  # to the first element of the array. Use printf over "${CRITICAL_SECRETS[@]}"
  # with grep -qx for an exact-line match across all elements.
  if printf '%s\n' "${CRITICAL_SECRETS[@]}" | grep -qx "$SECRET"; then
    continue
  fi

  if check_secret "$SECRET"; then
    restored+=("$SECRET")
  else
    missing+=("$SECRET")
  fi
done

# Emit results to GITHUB_OUTPUT (if available) and stdout
restored_csv=$(IFS=,; echo "${restored[*]:-}")
missing_csv=$(IFS=,; echo "${missing[*]:-}")

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "restored=${restored_csv}"
    echo "missing=${missing_csv}"
  } >> "$GITHUB_OUTPUT"
fi

echo "restored=${restored_csv}"
echo "missing=${missing_csv}"

if (( ${#missing[@]} > 0 )); then
  echo "⚠️  Missing ${#missing[@]} secret(s): ${missing_csv}" >&2
fi
