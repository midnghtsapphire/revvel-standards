#!/usr/bin/env bash
# Autonomous Product Launcher
# Mission: $10k/month → $10M in 3 years
# Generates market research, revenue estimates, and launch scaffolding for a new product.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PRODUCT_NAME="${1:-}"
if [[ -z "$PRODUCT_NAME" ]]; then
  echo "Usage: $0 <product-name>" >&2
  exit 1
fi

SLUG="$(echo "$PRODUCT_NAME" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//; s/-$//')"
OUT_DIR="$REPO_ROOT/products/$SLUG"
mkdir -p "$OUT_DIR"

LLM_HELPER="$SCRIPT_DIR/llm.js"

# --- Estimate addressable market dynamically via LLM helper ---
MARKET_SECTION=""
if [[ -f "$LLM_HELPER" ]] && command -v node >/dev/null 2>&1; then
  PROMPT="Estimate the addressable market for a product called '$PRODUCT_NAME'. Return concise bullet points with: total potential users, realistic capture rate (%), and annual revenue potential (USD). Be specific and numeric."
  if MARKET_SECTION="$(node "$LLM_HELPER" "$PROMPT" 2>/dev/null)"; then
    if [[ -z "${MARKET_SECTION// }" ]]; then
      MARKET_SECTION=""
    fi
  else
    MARKET_SECTION=""
  fi
fi

if [[ -z "$MARKET_SECTION" ]]; then
  MARKET_SECTION=$'- TODO: total potential users\n- TODO: capture rate\n- TODO: revenue potential'
fi

cat > "$OUT_DIR/README.md" <<EOF
# $PRODUCT_NAME

## Mission Alignment
Contribute to the \$10k/month → \$10M in 3 years trajectory.

## Addressable Market
$MARKET_SECTION

## Launch Checklist
- [ ] Landing page
- [ ] Polar.sh product
- [ ] Pricing tiers
- [ ] Distribution plan
EOF

echo "Scaffolded $OUT_DIR"
