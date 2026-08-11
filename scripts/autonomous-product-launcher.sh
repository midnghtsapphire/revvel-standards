#!/usr/bin/env bash
# Autonomous Product Launcher
# PRIME DIRECTIVE: $10k/month → $10M in 3 years
#
# Given a product name (and optional description), this script scaffolds a
# minimal launch plan including a dynamic addressable market estimate powered
# by the shared scripts/llm.js helper. If the AI call fails for any reason
# (missing API key, network failure, non-zero exit), we gracefully fall back
# to a TODO placeholder so the launcher remains functional offline.

set -euo pipefail

PRODUCT_NAME="${1:-}"
PRODUCT_DESC="${2:-}"

if [[ -z "$PRODUCT_NAME" ]]; then
  echo "Usage: $0 <product-name> [product-description]" >&2
  exit 1
 fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LLM_HELPER="$SCRIPT_DIR/llm.js"

OUTPUT_DIR="$REPO_ROOT/products/$(echo "$PRODUCT_NAME" | tr '[:upper:] ' '[:lower:]-' | sed 's/[^a-z0-9-]//g')"
mkdir -p "$OUTPUT_DIR"

estimate_market() {
  local name="$1"
  local desc="$2"

  if [[ ! -f "$LLM_HELPER" ]] || ! command -v node >/dev/null 2>&1; then
    return 1
  fi

  local prompt
  prompt=$(cat <<EOF
Estimate the addressable market for a product called "$name".
Description: ${desc:-N/A}

Return a concise markdown block with:
- Total potential users (number + short rationale)
- Realistic capture rate (percentage)
- Revenue potential (USD/month at capture rate, assume reasonable ARPU)

Keep it under 8 lines. No preamble.
EOF
)

  node "$LLM_HELPER" "$prompt" 2>/dev/null
}

MARKET_SECTION=""
if MARKET_OUTPUT=$(estimate_market "$PRODUCT_NAME" "$PRODUCT_DESC") && [[ -n "${MARKET_OUTPUT// }" ]]; then
  MARKET_SECTION="$MARKET_OUTPUT"
else
  MARKET_SECTION=$'- TODO: Total potential users\n- TODO: Capture rate\n- TODO: Revenue potential'
fi

cat > "$OUTPUT_DIR/LAUNCH_PLAN.md" <<EOF
# Launch Plan: $PRODUCT_NAME

> PRIME DIRECTIVE: \$10k/month → \$10M in 3 years

## Description
${PRODUCT_DESC:-TODO: describe the product}

## Addressable Market
$MARKET_SECTION

## Funding
- Polar.sh: https://polar.sh/
- GitHub Sponsors: TODO

## Distribution Channels
- TODO: identify top 3 channels

## Phase Targets
- Phase 1 (Month 1-6): \$10k/month
- Phase 2 (Month 6-18): \$30k/month
- Phase 3 (Month 18-30): \$100k/month
- Phase 4 (Month 30-36): \$10M total
EOF

echo "Launch plan written to $OUTPUT_DIR/LAUNCH_PLAN.md"
