#!/usr/bin/env bash
# secrets-guardian.sh - Guard critical repository secrets
#
# Verifies that critical secrets are present in the repository and reports
# which are missing. Writes machine-readable output to $GITHUB_OUTPUT when set.
#
# Requires: gh CLI authenticated with repo scope.

set -euo pipefail

# Critical secrets that must always be present
CRITICAL_SECRETS=(
  "GITHUB_TOKEN"
  "POLAR_ACCESS_TOKEN"
  "OPENROUTER_API_KEY"
  "ANTHROPIC_API_KEY"
  "OPENAI_API_KEY"
  "STRIPE_API_KEY"
  "NPM_TOKEN"
  "PYPI_TOKEN"
  "DOCKER_TOKEN"
  "VERCEL_TOKEN"
  "NETLIFY_TOKEN"
)

# Optional additional secrets to audit (non-critical)
ALL_SECRETS=(
  "${CRITICAL_SECRETS[@]}"
  "SENTRY_DSN"
  "DATADOG_API_KEY"
  "SLACK_WEBHOOK"
)

restored=()
missing=()

# Query gh for existing secrets once
if command -v gh >/dev/null 2>&1; then
  existing_secrets="$(gh secret list 2>/dev/null | awk '{print $1}' || true)"
else
  existing_secrets=""
fi

secret_present() {
  local name="$1"
  printf '%s\n' "$existing_secrets" | grep -qx "$name"
}

# First pass: check critical secrets
for SECRET in "${CRITICAL_SECRETS[@]}"; do
  if secret_present "$SECRET"; then
    restored+=("$SECRET")
  else
    missing+=("$SECRET")
  fi
done

# Second pass: check non-critical secrets, skipping any already checked
for SECRET in "${ALL_SECRETS[@]}"; do
  # Skip if already checked in the critical pass
  if printf '%s\n' "${CRITICAL_SECRETS[@]}" | grep -qx "$SECRET"; then
    continue
  fi
  if secret_present "$SECRET"; then
    restored+=("$SECRET")
  else
    missing+=("$SECRET")
  fi
done

# Emit results
restored_csv="$(IFS=,; echo "${restored[*]-}")"
missing_csv="$(IFS=,; echo "${missing[*]-}")"

echo "restored=${restored_csv}"
echo "missing=${missing_csv}"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "restored=${restored_csv}"
    echo "missing=${missing_csv}"
  } >> "$GITHUB_OUTPUT"
fi

# Exit non-zero if any critical secret is missing
if [ "${#missing[@]}" -gt 0 ]; then
  for m in "${missing[@]}"; do
    for c in "${CRITICAL_SECRETS[@]}"; do
      if [ "$m" = "$c" ]; then
        echo "ERROR: critical secret missing: $m" >&2
        exit 1
      fi
    done
  done
fi

exit 0
