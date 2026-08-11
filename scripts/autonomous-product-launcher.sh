#!/usr/bin/env bash
# Autonomous Product Launcher
# PRIME DIRECTIVE: $10k/month → $10M in 3 years
#
# Given a product name, estimates addressable market size dynamically via
# scripts/llm.js and outputs a launch brief. Falls back to a TODO-style
# placeholder if the AI call fails or Node is unavailable.

set -euo pipefail

PRODUCT_NAME="${1:-}"
if [[ -z "$PRODUCT_NAME" ]]; then
  echo "Usage: $0 <product-name>" >&2
  exit 1
 fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LLM_HELPER="$SCRIPT_DIR/llm.js"

fallback_market() {
  cat <<EOF
## Addressable Market for: $PRODUCT_NAME

- TODO: total_potential_users = <estimate>
- TODO: capture_rate = <estimate>
- TODO: revenue_potential = <estimate>
EOF
}

estimate_market() {
  if ! command -v node >/dev/null 2>&1; then
    fallback_market
    return
  fi
  if [[ ! -f "$LLM_HELPER" ]]; then
    fallback_market
    return
  fi

  local prompt
  prompt="Estimate the addressable market for the product '$PRODUCT_NAME'. Provide: (1) total_potential_users (number), (2) capture_rate (percentage), (3) revenue_potential (USD/year). Be concise, use markdown bullets."

  local result
  if result=$(node "$LLM_HELPER" "$prompt" 2>/dev/null) && [[ -n "$result" ]]; then
    echo "## Addressable Market for: $PRODUCT_NAME"
    echo
    echo "$result"
  else
    fallback_market
  fi
}

echo "# Launch Brief: $PRODUCT_NAME"
echo
estimate_market
echo
echo "# Revenue Target Alignment"
echo "- Phase 1: \$10k/month"
echo "- Phase 2: \$30k/month"
echo "- Phase 3: \$100k/month"
echo "- Phase 4: \$10M total by month 36"
