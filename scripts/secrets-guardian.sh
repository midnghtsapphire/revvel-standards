#!/usr/bin/env bash
# secrets-guardian.sh - Verify and restore critical GitHub secrets
#
# This script ensures all critical secrets are present in the GitHub repository.
# It checks for missing secrets and reports them via GITHUB_OUTPUT for downstream
# workflow steps to act upon (e.g., alerting, auto-restoration from vault).
#
# Usage: bash scripts/secrets-guardian.sh
#
# Environment:
#   GITHUB_OUTPUT - path to GitHub Actions output file (optional)
#   GH_TOKEN or GITHUB_TOKEN - required for `gh` CLI authentication

set -euo pipefail

# Critical secrets that MUST be present for the $10k → $10M pipeline to operate.
# Order matters for reporting but not for correctness.
CRITICAL_SECRETS=(
  "GITHUB_TOKEN"
  "POLAR_ACCESS_TOKEN"
  "POLAR_WEBHOOK_SECRET"
  "OPENROUTER_API_KEY"
  "ANTHROPIC_API_KEY"
  "OPENAI_API_KEY"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "SENTRY_DSN"
  "VERCEL_TOKEN"
  "NPM_TOKEN"
)

# Extended list of all secrets to inventory (superset of CRITICAL_SECRETS).
ALL_SECRETS=(
  "${CRITICAL_SECRETS[@]}"
  "DISCORD_WEBHOOK_URL"
  "SLACK_WEBHOOK_URL"
  "CLOUDFLARE_API_TOKEN"
)

restored=()
missing=()

# Helper: check if a secret exists in the repo.
secret_exists() {
  local name="$1"
  gh secret list 2>/dev/null | awk '{print $1}' | grep -qx "$name"
}

# First pass: verify critical secrets.
for SECRET in "${CRITICAL_SECRETS[@]}"; do
  if secret_exists "$SECRET"; then
    restored+=("$SECRET")
  else
    missing+=("$SECRET")
  fi
done

# Second pass: inventory remaining (non-critical) secrets.
for SECRET in "${ALL_SECRETS[@]}"; do
  # Skip if already checked in the critical pass.
  # BUG FIX: previously used `echo "$CRITICAL_SECRETS" | grep -q` which only
  # expanded the FIRST element of the array. Now we expand all elements and
  # match whole lines with -x so partial-name collisions cannot occur.
  if printf '%s\n' "${CRITICAL_SECRETS[@]}" | grep -qx "$SECRET"; then
    continue
  fi

  if secret_exists "$SECRET"; then
    restored+=("$SECRET")
  else
    missing+=("$SECRET")
  fi
done

# Emit results to GITHUB_OUTPUT if available, else stdout.
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
  echo "⚠️  ${#missing[@]} secret(s) missing from repository" >&2
  exit 0  # non-fatal; downstream steps handle alerting
fi

echo "✅ All ${#ALL_SECRETS[@]} secrets present"
