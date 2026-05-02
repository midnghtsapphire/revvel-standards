#!/bin/bash
# BITO AI API Helper — Handles API retrieval and everything discussed
# This script assists with retrieving, storing, and wiring BITO_API_KEY
# Usage: ./bito-api-helper.sh [retrieve|store|wire|test]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

VAULT_PATH="revvel/shared/code-review/bito"
VAULT_FIELD="api_key"

# ─── Helper Functions ─────────────────────────────────────────────────────────

print_header() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  BITO AI API Helper${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
}

print_usage() {
  cat << EOF
Usage: ./bito-api-helper.sh [command]

Commands:
  retrieve    - Retrieve BITO_API_KEY from HashiCorp Vault
  store       - Store a new BITO_API_KEY in HashiCorp Vault
  wire        - Wire BITO_API_KEY to GitHub Actions secrets
  test        - Test BITO AI integration
  setup       - Interactive setup guide for first-time configuration
  status      - Check current BITO AI configuration status

Examples:
  # Retrieve key from Vault and export to environment
  ./bito-api-helper.sh retrieve

  # Store a new key in Vault
  ./bito-api-helper.sh store

  # Wire the key to GitHub Actions
  ./bito-api-helper.sh wire

  # Test the integration
  ./bito-api-helper.sh test

  # Interactive setup
  ./bito-api-helper.sh setup

Environment variables:
  VAULT_ADDR          - Vault server address
  VAULT_TOKEN         - Vault authentication token
  BITO_API_KEY        - BITO AI API key (for store/test commands)
  GITHUB_REPOSITORY   - Target repo for wiring (owner/repo format)

EOF
}

check_vault() {
  if ! command -v vault &> /dev/null; then
    echo -e "${RED}❌ HashiCorp Vault CLI is not installed${NC}"
    echo ""
    echo "Install Vault:"
    echo "  macOS:   brew install vault"
    echo "  Linux:   https://www.vaultproject.io/downloads"
    echo ""
    return 1
  fi
  
  if [ -z "${VAULT_ADDR}" ]; then
    echo -e "${YELLOW}⚠️  VAULT_ADDR is not set${NC}"
    echo "Set it to your Vault server address:"
    echo "  export VAULT_ADDR=https://vault.example.com"
    echo ""
    return 1
  fi
  
  # Check if authenticated
  if ! vault token lookup &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated with Vault${NC}"
    echo "Authenticate with:"
    echo "  vault login"
    echo ""
    return 1
  fi
  
  return 0
}

check_gh_cli() {
  if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo ""
    echo "Install gh:"
    echo "  macOS:   brew install gh"
    echo "  Linux:   https://cli.github.com/manual/installation"
    echo ""
    return 1
  fi
  
  # Check if authenticated
  if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated with GitHub${NC}"
    echo "Authenticate with:"
    echo "  gh auth login"
    echo ""
    return 1
  fi
  
  return 0
}

# ─── Command: retrieve ─────────────────────────────────────────────────────────

cmd_retrieve() {
  print_header
  echo "📥 Retrieving BITO_API_KEY from Vault..."
  echo ""
  
  if ! check_vault; then
    exit 1
  fi
  
  echo "Vault path: ${VAULT_PATH}"
  echo "Field: ${VAULT_FIELD}"
  echo ""
  
  # Retrieve the key
  API_KEY=$(vault kv get -field="${VAULT_FIELD}" "${VAULT_PATH}" 2>&1)
  
  if [ $? -eq 0 ] && [ -n "${API_KEY}" ]; then
    echo -e "${GREEN}✅ Successfully retrieved BITO_API_KEY from Vault${NC}"
    echo ""
    echo "To use it in your current shell:"
    echo -e "${YELLOW}  export BITO_API_KEY='<your-key-from-vault>'${NC}"
    echo ""
    echo "The actual key value is available in the variable and has not been displayed for security."
    echo ""
    echo "Or add to your shell profile:"
    echo '  # Add this line to your ~/.bashrc or ~/.zshrc:'
    echo '  export BITO_API_KEY=$(vault kv get -field='"${VAULT_FIELD}"' '"${VAULT_PATH}"')'
    echo ""
  else
    echo -e "${RED}❌ Failed to retrieve BITO_API_KEY from Vault${NC}"
    echo ""
    echo "Error: ${API_KEY}"
    echo ""
    echo "Make sure the secret exists at: ${VAULT_PATH}"
    echo "If not, use './bito-api-helper.sh store' to create it."
    exit 1
  fi
}

# ─── Command: store ─────────────────────────────────────────────────────────

cmd_store() {
  print_header
  echo "💾 Storing BITO_API_KEY in Vault..."
  echo ""
  
  if ! check_vault; then
    exit 1
  fi
  
  # Get the API key
  if [ -z "${BITO_API_KEY}" ]; then
    echo "Enter your BITO API key (from https://bito.ai → Settings → API Keys):"
    read -s BITO_API_KEY
    echo ""
  fi
  
  if [ -z "${BITO_API_KEY}" ]; then
    echo -e "${RED}❌ No API key provided${NC}"
    exit 1
  fi
  
  echo "Vault path: ${VAULT_PATH}"
  echo "Field: ${VAULT_FIELD}"
  echo ""
  
  # Store the key
  vault kv put "${VAULT_PATH}" "${VAULT_FIELD}=${BITO_API_KEY}"
  
  if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Successfully stored BITO_API_KEY in Vault${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Wire it to GitHub Actions: ./bito-api-helper.sh wire"
    echo "  2. Test the integration: ./bito-api-helper.sh test"
  else
    echo ""
    echo -e "${RED}❌ Failed to store BITO_API_KEY in Vault${NC}"
    exit 1
  fi
}

# ─── Command: wire ─────────────────────────────────────────────────────────

cmd_wire() {
  print_header
  echo "🔌 Wiring BITO_API_KEY to GitHub Actions..."
  echo ""
  
  if ! check_gh_cli; then
    exit 1
  fi
  
  # Determine target repository
  if [ -z "${GITHUB_REPOSITORY}" ]; then
    # Try to detect from git remote using gh CLI if available
    if command -v gh &> /dev/null && gh repo view --json nameWithOwner -q .nameWithOwner &> /dev/null; then
      GITHUB_REPOSITORY=$(gh repo view --json nameWithOwner -q .nameWithOwner)
      echo "Detected repository: ${GITHUB_REPOSITORY}"
    elif git remote get-url origin &> /dev/null; then
      # Fallback to parsing git remote URL
      REMOTE_URL=$(git remote get-url origin)
      # Extract owner/repo from URL (handles https and ssh formats)
      GITHUB_REPOSITORY=$(echo "${REMOTE_URL}" | sed -E 's/.*[:/]([^/]+\/[^/]+)(\.git)?$/\1/')
      echo "Detected repository: ${GITHUB_REPOSITORY}"
    else
      echo "Enter target repository (format: owner/repo):"
      read GITHUB_REPOSITORY
    fi
  fi
  
  if [ -z "${GITHUB_REPOSITORY}" ]; then
    echo -e "${RED}❌ No repository specified${NC}"
    exit 1
  fi
  
  # Get the API key
  if [ -z "${BITO_API_KEY}" ]; then
    echo ""
    echo "Attempting to retrieve BITO_API_KEY from Vault..."
    if check_vault; then
      BITO_API_KEY=$(vault kv get -field="${VAULT_FIELD}" "${VAULT_PATH}" 2>/dev/null)
    fi
  fi
  
  if [ -z "${BITO_API_KEY}" ]; then
    echo ""
    echo "Enter BITO_API_KEY value:"
    read -s BITO_API_KEY
    echo ""
  fi
  
  if [ -z "${BITO_API_KEY}" ]; then
    echo -e "${RED}❌ No API key available${NC}"
    exit 1
  fi
  
  echo ""
  echo "Setting BITO_API_KEY secret in ${GITHUB_REPOSITORY}..."
  
  # Set the secret using gh CLI
  echo "${BITO_API_KEY}" | gh secret set BITO_API_KEY --repo "${GITHUB_REPOSITORY}"
  
  if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Successfully wired BITO_API_KEY to GitHub Actions${NC}"
    echo ""
    echo "The secret is now available in workflows as:"
    echo "  \${{ secrets.BITO_API_KEY }}"
    echo ""
    echo "Next step: Open a test PR to trigger the bito-ai.yml workflow"
  else
    echo ""
    echo -e "${RED}❌ Failed to set GitHub Actions secret${NC}"
    echo ""
    echo "Make sure you have admin access to the repository."
    exit 1
  fi
}

# ─── Command: test ─────────────────────────────────────────────────────────

cmd_test() {
  print_header
  echo "🧪 Testing BITO AI integration..."
  echo ""
  
  # Run the test script if it exists
  TEST_SCRIPT="$(dirname "$0")/test-bito-api.sh"
  
  if [ -f "${TEST_SCRIPT}" ]; then
    # Try to get API key from Vault if not set
    if [ -z "${BITO_API_KEY}" ] && check_vault; then
      export BITO_API_KEY=$(vault kv get -field="${VAULT_FIELD}" "${VAULT_PATH}" 2>/dev/null)
    fi
    
    bash "${TEST_SCRIPT}"
  else
    echo -e "${YELLOW}⚠️  Test script not found at ${TEST_SCRIPT}${NC}"
    echo "Running basic checks..."
    echo ""
    
    # Basic checks
    if [ -f ".github/workflows/bito-ai.yml" ]; then
      echo -e "${GREEN}✅ Workflow file exists${NC}"
    else
      echo -e "${RED}❌ Workflow file missing${NC}"
    fi
    
    if [ -f "standards/BITO_AI_INTEGRATION_STANDARD.md" ]; then
      echo -e "${GREEN}✅ Standard document exists${NC}"
    else
      echo -e "${YELLOW}⚠️  Standard document missing${NC}"
    fi
    
    if [ -f "docs/BITO_AI_INTEGRATION.md" ]; then
      echo -e "${GREEN}✅ Integration doc exists${NC}"
    else
      echo -e "${YELLOW}⚠️  Integration doc missing${NC}"
    fi
  fi
}

# ─── Command: setup ─────────────────────────────────────────────────────────

cmd_setup() {
  print_header
  echo "🚀 BITO AI Setup Guide"
  echo ""
  echo "This wizard will guide you through setting up BITO AI integration."
  echo ""
  
  # Step 1: Check prerequisites
  echo "Step 1: Checking prerequisites..."
  echo ""
  
  VAULT_OK=false
  GH_OK=false
  
  if check_vault; then
    echo -e "${GREEN}✅ Vault CLI is configured${NC}"
    VAULT_OK=true
  else
    echo -e "${YELLOW}⚠️  Vault CLI is not configured (optional)${NC}"
  fi
  
  echo ""
  
  if check_gh_cli; then
    echo -e "${GREEN}✅ GitHub CLI is configured${NC}"
    GH_OK=true
  else
    echo -e "${YELLOW}⚠️  GitHub CLI is not configured${NC}"
  fi
  
  echo ""
  echo "─────────────────────────────────────────────────────────────"
  echo ""
  
  # Step 2: Get API key
  echo "Step 2: BITO API Key"
  echo ""
  echo "Do you have a BITO API key? (y/n)"
  read -r HAS_KEY
  
  if [[ "${HAS_KEY}" =~ ^[Yy]$ ]]; then
    if [ "${VAULT_OK}" = true ]; then
      echo ""
      echo "Do you want to store it in Vault? (y/n)"
      read -r STORE_IN_VAULT
      
      if [[ "${STORE_IN_VAULT}" =~ ^[Yy]$ ]]; then
        cmd_store
      fi
    fi
    
    if [ "${GH_OK}" = true ]; then
      echo ""
      echo "Do you want to wire it to GitHub Actions? (y/n)"
      read -r WIRE_TO_GH
      
      if [[ "${WIRE_TO_GH}" =~ ^[Yy]$ ]]; then
        cmd_wire
      fi
    fi
  else
    echo ""
    echo "Get your BITO API key from:"
    echo "  https://bito.ai → Sign up/Log in → Settings → API Keys"
    echo ""
    echo "Then run this setup again."
    exit 0
  fi
  
  echo ""
  echo "─────────────────────────────────────────────────────────────"
  echo ""
  
  # Step 3: Test
  echo "Step 3: Testing integration"
  echo ""
  echo "Do you want to run integration tests? (y/n)"
  read -r RUN_TESTS
  
  if [[ "${RUN_TESTS}" =~ ^[Yy]$ ]]; then
    cmd_test
  fi
  
  echo ""
  echo -e "${GREEN}✅ Setup complete!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Open a test PR to trigger bito-ai.yml workflow"
  echo "  2. Verify BITO posts a review comment"
  echo "  3. Check that labels are applied correctly"
  echo ""
}

# ─── Command: status ─────────────────────────────────────────────────────────

cmd_status() {
  print_header
  echo "📊 BITO AI Configuration Status"
  echo ""
  
  # Check files
  echo "Configuration Files:"
  FILES=(
    ".github/workflows/bito-ai.yml"
    "standards/BITO_AI_INTEGRATION_STANDARD.md"
    "docs/BITO_AI_INTEGRATION.md"
    "skills/bito-ai/SKILL.md"
    ".github/labels.yml"
  )
  
  for file in "${FILES[@]}"; do
    if [ -f "${file}" ]; then
      echo -e "  ${GREEN}✅ ${file}${NC}"
    else
      echo -e "  ${RED}❌ ${file}${NC}"
    fi
  done
  
  echo ""
  echo "Environment:"
  
  # Check BITO_API_KEY
  if [ -n "${BITO_API_KEY}" ]; then
    echo -e "  ${GREEN}✅ BITO_API_KEY is set in environment${NC}"
  else
    echo -e "  ${YELLOW}⚠️  BITO_API_KEY is not set in environment${NC}"
  fi
  
  # Check Vault
  if check_vault 2>/dev/null; then
    if vault kv get "${VAULT_PATH}" &> /dev/null; then
      echo -e "  ${GREEN}✅ BITO_API_KEY exists in Vault${NC}"
    else
      echo -e "  ${YELLOW}⚠️  BITO_API_KEY not found in Vault${NC}"
    fi
  else
    echo -e "  ${YELLOW}⚠️  Vault not configured${NC}"
  fi
  
  # Check GitHub CLI
  if check_gh_cli 2>/dev/null; then
    echo -e "  ${GREEN}✅ GitHub CLI is configured${NC}"
  else
    echo -e "  ${YELLOW}⚠️  GitHub CLI not configured${NC}"
  fi
  
  echo ""
  echo "To update configuration, run:"
  echo "  ./bito-api-helper.sh setup"
  echo ""
}

# ─── Main ─────────────────────────────────────────────────────────────────────

main() {
  case "${1:-}" in
    retrieve)
      cmd_retrieve
      ;;
    store)
      cmd_store
      ;;
    wire)
      cmd_wire
      ;;
    test)
      cmd_test
      ;;
    setup)
      cmd_setup
      ;;
    status)
      cmd_status
      ;;
    help|--help|-h)
      print_header
      print_usage
      ;;
    *)
      print_header
      echo -e "${YELLOW}Invalid command: ${1:-}${NC}"
      echo ""
      print_usage
      exit 1
      ;;
  esac
}

main "$@"
