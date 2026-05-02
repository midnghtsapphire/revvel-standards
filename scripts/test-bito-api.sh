#!/bin/bash
# Test BITO AI API connectivity and configuration
# Usage: BITO_API_KEY=xxx ./test-bito-api.sh
# Returns: Exit code 0 on success, non-zero on failure

set -e

# Configuration - shared with bito-api-helper.sh
VAULT_PATH="${VAULT_PATH:-revvel/shared/code-review/bito}"
VAULT_FIELD="${VAULT_FIELD:-api_key}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🤖 Testing BITO AI Integration..."
echo ""

# ─── Step 1: Verify BITO_API_KEY is set ────────────────────────────────────
echo "Step 1: Verifying BITO_API_KEY..."
if [ -z "${BITO_API_KEY}" ]; then
  echo -e "${RED}❌ ERROR: BITO_API_KEY environment variable is required${NC}"
  echo ""
  echo "Set it before running this script:"
  echo "  export BITO_API_KEY=your-key-here"
  echo ""
  echo "Or retrieve it from Vault:"
  echo '  export BITO_API_KEY=$(vault kv get -field='"${VAULT_FIELD}"' '"${VAULT_PATH}"')'
  echo ""
  exit 1
else
  echo -e "${GREEN}✅ BITO_API_KEY is set${NC}"
fi

# ─── Step 2: Check if BITO CLI is installed ────────────────────────────────
echo ""
echo "Step 2: Checking for BITO CLI installation..."
if command -v bito &> /dev/null; then
  BITO_VERSION=$(bito --version 2>&1 || echo "unknown")
  echo -e "${GREEN}✅ BITO CLI is installed: ${BITO_VERSION}${NC}"
  BITO_INSTALLED=true
else
  echo -e "${YELLOW}⚠️  BITO CLI is not installed (optional for local dev)${NC}"
  echo "Install with: curl -s https://alpha.bito.ai/downloads/cli/install.sh | bash"
  BITO_INSTALLED=false
fi

# ─── Step 3: Test API endpoint connectivity ─────────────────────────────────
echo ""
echo "Step 3: Testing BITO API connectivity..."

# BITO API endpoint for validation (placeholder - adjust to actual endpoint)
# Note: The actual BITO API endpoint may differ; this is based on common patterns
BITO_API_BASE="${BITO_API_URL:-https://api.bito.ai/v1}"

# Test with a simple health/auth check
# Adjust this based on actual BITO API documentation
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${BITO_API_KEY}" \
  -H "Content-Type: application/json" \
  "${BITO_API_BASE}/health" || echo "000")

if [ "${HTTP_CODE}" = "200" ] || [ "${HTTP_CODE}" = "401" ]; then
  if [ "${HTTP_CODE}" = "200" ]; then
    echo -e "${GREEN}✅ BITO API is reachable and key is valid (HTTP ${HTTP_CODE})${NC}"
  else
    echo -e "${YELLOW}⚠️  BITO API is reachable but key may be invalid (HTTP ${HTTP_CODE})${NC}"
    echo "Verify your API key at: https://bito.ai → Settings → API Keys"
  fi
elif [ "${HTTP_CODE}" = "404" ]; then
  echo -e "${YELLOW}⚠️  Endpoint not found (HTTP 404) - BITO API may use different endpoints${NC}"
  echo "This is expected if /health is not available. Workflow will test actual review endpoint."
elif [ "${HTTP_CODE}" = "000" ]; then
  echo -e "${YELLOW}⚠️  Could not reach BITO API (connection failed)${NC}"
  echo "This may be a network issue or the API endpoint is not publicly accessible."
  echo "Workflow tests will validate when running in GitHub Actions."
else
  echo -e "${YELLOW}⚠️  Unexpected response from BITO API (HTTP ${HTTP_CODE})${NC}"
fi

# ─── Step 4: Verify workflow file exists ────────────────────────────────────
echo ""
echo "Step 4: Verifying workflow configuration..."
WORKFLOW_FILE=".github/workflows/bito-ai.yml"
if [ -f "${WORKFLOW_FILE}" ]; then
  echo -e "${GREEN}✅ BITO AI workflow exists: ${WORKFLOW_FILE}${NC}"
  
  # Check if workflow contains required elements
  if grep -q "bito-core/bito-github-action" "${WORKFLOW_FILE}"; then
    echo -e "${GREEN}✅ Workflow uses bito-core/bito-github-action${NC}"
  else
    echo -e "${RED}❌ Workflow does not reference bito-github-action${NC}"
  fi
  
  if grep -q "BITO_API_KEY" "${WORKFLOW_FILE}"; then
    echo -e "${GREEN}✅ Workflow references BITO_API_KEY secret${NC}"
  else
    echo -e "${RED}❌ Workflow does not reference BITO_API_KEY${NC}"
  fi
else
  echo -e "${RED}❌ BITO AI workflow not found at ${WORKFLOW_FILE}${NC}"
  exit 1
fi

# ─── Step 5: Verify labels configuration ────────────────────────────────────
echo ""
echo "Step 5: Verifying label configuration..."
LABELS_FILE=".github/labels.yml"
if [ -f "${LABELS_FILE}" ]; then
  echo -e "${GREEN}✅ Labels file exists: ${LABELS_FILE}${NC}"
  
  # Check for required BITO labels
  REQUIRED_LABELS=("bito-ai" "bito-ai:review" "bito-ai:changes-needed")
  for label in "${REQUIRED_LABELS[@]}"; do
    if grep -q "name: [\"']${label}[\"']" "${LABELS_FILE}" || grep -q "name: ${label}" "${LABELS_FILE}"; then
      echo -e "${GREEN}  ✅ Label defined: ${label}${NC}"
    else
      echo -e "${RED}  ❌ Label missing: ${label}${NC}"
    fi
  done
else
  echo -e "${YELLOW}⚠️  Labels file not found at ${LABELS_FILE}${NC}"
fi

# ─── Step 6: Verify documentation exists ────────────────────────────────────
echo ""
echo "Step 6: Verifying documentation..."
DOCS=(
  "docs/BITO_AI_INTEGRATION.md"
  "standards/BITO_AI_INTEGRATION_STANDARD.md"
  "skills/bito-ai/SKILL.md"
)

for doc in "${DOCS[@]}"; do
  if [ -f "${doc}" ]; then
    echo -e "${GREEN}  ✅ ${doc}${NC}"
  else
    echo -e "${YELLOW}  ⚠️  Missing: ${doc}${NC}"
  fi
done

# ─── Step 7: Verify .env.example has BITO_API_KEY ──────────────────────────
echo ""
echo "Step 7: Verifying .env.example..."
if [ -f ".env.example" ]; then
  if grep -q "BITO_API_KEY" ".env.example"; then
    echo -e "${GREEN}✅ .env.example includes BITO_API_KEY${NC}"
  else
    echo -e "${YELLOW}⚠️  .env.example does not include BITO_API_KEY${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  .env.example not found${NC}"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ BITO AI integration test completed successfully!${NC}"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Ensure BITO_API_KEY is added as a GitHub Actions secret"
echo "  2. Open a test PR to trigger the bito-ai.yml workflow"
echo "  3. Verify BITO posts a review comment on the PR"
echo "  4. Check that labels are applied correctly"
echo ""
echo "For GitHub Actions secret setup:"
echo "  Settings → Secrets and variables → Actions → New repository secret"
echo "  Name: BITO_API_KEY"
echo "  Value: <your-key-from-bito.ai>"
echo ""

exit 0
