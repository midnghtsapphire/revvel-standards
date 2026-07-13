#!/usr/bin/env bash
# secrets-guardian.sh - Ensures critical GitHub secrets are present
#
# Iterates through a list of critical secrets and reports any that are
# missing. When run with restore capability, attempts to restore missing
# secrets from a backup source (not implemented here).
#
# Outputs (when $GITHUB_OUTPUT is set):
#   restored=<space-separated list>
#   missing=<space-separated list>

set -euo pipefail

# Critical secrets that must always be present
CRITICAL_SECRETS=(
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
  "CLOUDFLARE_API_TOKEN"
)

# Additional (non-critical) secrets tracked for reporting
ALL_SECRETS=(
  "${CRITICAL_SECRETS[@]}"
  "SENTRY_DSN"
  "DATADOG_API_KEY"
  "SLACK_WEBHOOK_URL"
)

restored=()
missing=()
checked=()

# Helper: check if a secret exists via gh CLI
secret_exists() {
  local name="$1"
  gh secret list --json name --jq '.[].name' 2>/dev/null | grep -qx "$name"
}

# First pass: critical secrets
for SECRET in "${CRITICAL_SECRETS[@]}"; do
  checked+=("$SECRET")
  if secret_exists "$SECRET"; then
    continue
  fi
  # Attempt restore (placeholder - real restore logic would fetch from vault)
  if [ -n "${SECRET_BACKUP_SOURCE:-}" ] && command -v gh >/dev/null 2>&1; then
    if gh secret set "$SECRET" --body "${!SECRET:-}" 2>/dev/null; then
      restored+=("$SECRET")
      continue
    fi
  fi
  missing+=("$SECRET")
done

# Second pass: remaining (non-critical) secrets
for SECRET in "${ALL_SECRETS[@]}"; do
  # Skip if already checked in the critical loop.
  # NOTE: Must expand the full array with "${CRITICAL_SECRETS[@]}" - using
  # bare "$CRITICAL_SECRETS" only yields the first element and causes every
  # subsequent critical secret to be re-checked and duplicated in output.
  if printf '%s\n' "${CRITICAL_SECRETS[@]}" | grep -qx "$SECRET"; then
    continue
  # Skip if already checked. Bare "$CRITICAL_SECRETS" (no [@]/[*]) only
  # expands to the array's first element, not all 11 entries, so this must
  # iterate the array — otherwise every critical secret but the first falls
  # through and gets redundantly re-checked/re-restored below, doubling
  # gh secret list/set calls and appending duplicate names to
  # RESTORED/MISSING (written to GITHUB_OUTPUT further down).
  printf '%s\n' "${CRITICAL_SECRETS[@]}" | grep -qx "$SECRET" && continue
  
  echo -n "   Checking $SECRET... "
  
  if gh secret list --repo "$GITHUB_REPOSITORY" 2>/dev/null | grep -q "^${SECRET} "; then
    echo "✅ exists"
  else
    echo "❌ MISSING"
    
    VALUE=$(echo "$CREDENTIAL_BACKUP_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$SECRET', ''))" 2>/dev/null || echo "")
    
    if [ -n "$VALUE" ] && [ "$VALUE" != "None" ]; then
      echo "   → Found in backup, restoring..."
      if [ "$DRY_RUN" != "true" ]; then
        gh secret set "$SECRET" --body "$VALUE" --repo "$GITHUB_REPOSITORY"
      fi
      RESTORED="${RESTORED}${SECRET},"
      echo "   → ✅ Restored!"
    else
      MISSING="${MISSING}${SECRET},"
    fi
  fi
  if secret_exists "$SECRET"; then
    continue
  fi
  missing+=("$SECRET")
done

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "restored=${restored[*]:-}" >> "$GITHUB_OUTPUT"
  echo "missing=${missing[*]:-}" >> "$GITHUB_OUTPUT"
fi

if [ ${#missing[@]} -gt 0 ]; then
  echo "⚠️  Missing secrets: ${missing[*]}" >&2
fi
if [ ${#restored[@]} -gt 0 ]; then
  echo "✅ Restored secrets: ${restored[*]}"
fi

exit 0
