#!/bin/bash
# Setup Agent Fallback System
# Configures Devin → Cursor → OpenRouter fallback chain
# Usage: ./setup-agent-fallback.sh [--repo OWNER/REPO]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Setting up Agent Fallback System${NC}"
echo ""

# Parse arguments
TARGET_REPO="${1:-}"
if [ -z "${TARGET_REPO}" ]; then
  # Try to detect current repo
  if git rev-parse --git-dir > /dev/null 2>&1; then
    TARGET_REPO=$(git config --get remote.origin.url | sed 's/.*[:/]\([^/]*\/[^/.]*\).*/\1/')
    echo -e "${YELLOW}Detected repository: ${TARGET_REPO}${NC}"
  else
    echo -e "${RED}ERROR: Not in a git repository and no --repo specified${NC}"
    echo "Usage: $0 OWNER/REPO"
    exit 1
  fi
fi

echo ""
echo "Target repository: ${TARGET_REPO}"
echo ""

# Step 1: Check if .cursorrules exists
echo -e "${BLUE}Step 1: Checking Cursor configuration...${NC}"
if [ -f "${REPO_ROOT}/.cursorrules" ] || [ -L "${REPO_ROOT}/.cursorrules" ]; then
  echo -e "${GREEN}✅ .cursorrules already exists${NC}"
else
  echo -e "${YELLOW}Creating .cursorrules symlink...${NC}"
  cd "${REPO_ROOT}"
  ln -sf AGENTS.md .cursorrules
  echo -e "${GREEN}✅ Created .cursorrules → AGENTS.md${NC}"
fi

# Step 2: Check .env.example
echo ""
echo -e "${BLUE}Step 2: Checking environment variable configuration...${NC}"
if grep -q "CURSOR_API_KEY" "${REPO_ROOT}/.env.example" 2>/dev/null; then
  echo -e "${GREEN}✅ CURSOR_API_KEY already in .env.example${NC}"
else
  echo -e "${YELLOW}⚠️  CURSOR_API_KEY not found in .env.example${NC}"
  echo "Please add it manually or re-copy from revvel-standards"
fi

if grep -q "DEVIN_API_KEY" "${REPO_ROOT}/.env.example" 2>/dev/null; then
  echo -e "${GREEN}✅ DEVIN_API_KEY already in .env.example${NC}"
else
  echo -e "${YELLOW}⚠️  DEVIN_API_KEY not found in .env.example${NC}"
  echo "Please add it manually or re-copy from revvel-standards"
fi

# Step 3: Check for workflow file
echo ""
echo -e "${BLUE}Step 3: Checking workflow files...${NC}"
WORKFLOW_FILE="${REPO_ROOT}/.github/workflows/agent-fallback.yml"
if [ -f "${WORKFLOW_FILE}" ]; then
  echo -e "${GREEN}✅ agent-fallback.yml workflow exists${NC}"
else
  echo -e "${YELLOW}Creating workflow file...${NC}"
  mkdir -p "${REPO_ROOT}/.github/workflows"
  # In production, this would copy from revvel-standards
  echo -e "${YELLOW}⚠️  Please copy agent-fallback.yml from revvel-standards${NC}"
fi

# Step 4: Check for scripts
echo ""
echo -e "${BLUE}Step 4: Checking helper scripts...${NC}"
for script in call-devin-api.sh call-cursor-api.sh; do
  if [ -f "${REPO_ROOT}/scripts/${script}" ]; then
    echo -e "${GREEN}✅ scripts/${script} exists${NC}"
    chmod +x "${REPO_ROOT}/scripts/${script}"
  else
    echo -e "${YELLOW}⚠️  scripts/${script} not found${NC}"
    echo "Please copy from revvel-standards/scripts/"
  fi
done

# Step 5: Check GitHub secrets
echo ""
echo -e "${BLUE}Step 5: Checking GitHub secrets...${NC}"
echo "Verifying secrets for ${TARGET_REPO}..."

check_secret() {
  local secret_name=$1
  if gh secret list --repo "${TARGET_REPO}" 2>/dev/null | grep -q "^${secret_name}"; then
    echo -e "${GREEN}✅ ${secret_name} configured${NC}"
    return 0
  else
    echo -e "${YELLOW}⚠️  ${secret_name} NOT configured${NC}"
    return 1
  fi
}

DEVIN_OK=false
CURSOR_OK=false
OPENROUTER_OK=false

check_secret "DEVIN_API_KEY" && DEVIN_OK=true
check_secret "CURSOR_API_KEY" && CURSOR_OK=true
check_secret "OPENROUTER_API_KEY" && OPENROUTER_OK=true

# Step 6: Provide instructions for missing secrets
echo ""
if [ "${DEVIN_OK}" = false ] || [ "${CURSOR_OK}" = false ] || [ "${OPENROUTER_OK}" = false ]; then
  echo -e "${YELLOW}⚠️  Some secrets are missing. To configure:${NC}"
  echo ""
  
  if [ "${DEVIN_OK}" = false ]; then
    echo "  # Devin API Key"
    echo "  gh secret set DEVIN_API_KEY --repo ${TARGET_REPO}"
    echo "  # Or retrieve from Vault:"
    echo "  vault kv get -field=api_key revvel/shared/llm/devin | gh secret set DEVIN_API_KEY --repo ${TARGET_REPO}"
    echo ""
  fi
  
  if [ "${CURSOR_OK}" = false ]; then
    echo "  # Cursor API Key"
    echo "  gh secret set CURSOR_API_KEY --repo ${TARGET_REPO}"
    echo "  # Or retrieve from Vault:"
    echo "  vault kv get -field=api_key revvel/shared/llm/cursor | gh secret set CURSOR_API_KEY --repo ${TARGET_REPO}"
    echo ""
  fi
  
  if [ "${OPENROUTER_OK}" = false ]; then
    echo "  # OpenRouter API Key"
    echo "  gh secret set OPENROUTER_API_KEY --repo ${TARGET_REPO}"
    echo "  # Or retrieve from Vault:"
    echo "  vault kv get -field=api_key revvel/shared/llm/openrouter | gh secret set OPENROUTER_API_KEY --repo ${TARGET_REPO}"
    echo ""
  fi
  
  echo -e "${YELLOW}Or use the credential-gatekeeper workflow (recommended):${NC}"
  echo "  gh workflow run credential-gatekeeper.yml --repo ${TARGET_REPO}"
else
  echo -e "${GREEN}✅ All required secrets are configured${NC}"
fi

# Step 7: Test workflow (optional)
echo ""
echo -e "${BLUE}Step 7: Testing setup (optional)...${NC}"
echo "To test the fallback system, create a test issue:"
echo ""
echo "  gh issue create --repo ${TARGET_REPO} \\"
echo "    --title \"[TEST] Agent fallback test\" \\"
echo "    --body \"Test issue for agent fallback system. Please close after testing.\""
echo ""
echo "Then trigger the workflow:"
echo "  gh workflow run agent-fallback.yml --repo ${TARGET_REPO} -f issue_number=<ISSUE_NUMBER>"
echo ""

# Summary
echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Agent Fallback Setup Complete!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. Configure any missing GitHub secrets (see above)"
echo "  2. Test the fallback system with a test issue"
echo "  3. Monitor fallback events with: gh issue list --label auto-fallback"
echo "  4. Read the full documentation: docs/AGENT_FALLBACK_PROCESS.md"
echo ""
echo "Fallback chain: Devin → Cursor → OpenRouter → Manual"
echo ""
