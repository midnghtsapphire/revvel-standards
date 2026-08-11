#!/usr/bin/env bash
# Autonomous Product Launcher
# Part of the $10M/3yr Prime Directive pipeline
#
# Given a product name (arg 1), this script produces a preliminary
# market-sizing report. Historically the addressable market size was
# a hardcoded TODO placeholder. This version tries to estimate it
# dynamically via the shared scripts/llm.js helper, and falls back to
# the original TODO output on any failure.

set -euo pipefail

PRODUCT_NAME="${1:-Unnamed Product}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LLM_HELPER="${SCRIPT_DIR}/llm.js"

fallback_market_size() {
  cat <<EOF
## Addressable Market
- Total potential users: TODO
- Capture rate: TODO
- Revenue potential: TODO
EOF
}

estimate_market_size() {
  local product="$1"

  if [[ ! -f "${LLM_HELPER}" ]] || ! command -v node >/dev/null 2>&1; then
    fallback_market_size
    return 0
  fi

  local prompt
  prompt="Estimate the addressable market for the product '${product}'. "
  prompt+="Respond with exactly three short bullet lines in this format:\n"
  prompt+="- Total potential users: <number or range>\n"
  prompt+="- Capture rate: <percentage>\n"
  prompt+="- Revenue potential: <USD amount or range>\n"
  prompt+="Keep it concise. No preamble, no trailing commentary."

  local output
  if ! output=$(node "${LLM_HELPER}" "${prompt}" 2>/dev/null); then
    fallback_market_size
    return 0
  fi

  if [[ -z "${output// }" ]]; then
    fallback_market_size
    return 0
  fi

  echo "## Addressable Market"
  echo "${output}"
}

main() {
  echo "# Autonomous Product Launch Plan: ${PRODUCT_NAME}"
  echo
  estimate_market_size "${PRODUCT_NAME}"
  echo
  echo "## Next Steps"
  echo "- Validate demand via Polar.sh funding signals"
  echo "- Ship MVP within 7 days"
  echo "- Iterate weekly toward the \$10k/month → \$10M/3yr trajectory"
}

main "$@"
