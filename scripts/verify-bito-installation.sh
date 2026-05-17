#!/bin/bash
# Verify Bito AI GitHub App Installation
#
# This script verifies that the Bito AI GitHub App (installation ID: 128849516)
# is properly installed and configured for the midnghtsapphire/revvel-standards repository.
#
# Usage: ./scripts/verify-bito-installation.sh
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed
#   2 - Missing dependencies

# Don't use set -e because we want to continue on check failures
# and report all issues at the end
set -o pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Expected installation ID
EXPECTED_INSTALLATION_ID="128849516"
REPO_OWNER="midnghtsapphire"
REPO_NAME="revvel-standards"

# Track overall status
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNED=0

# ─── Helper Functions ─────────────────────────────────────────────────────────

print_header() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  Bito AI GitHub App Installation Verification${NC}"
  echo -e "${BLUE}  Installation ID: ${EXPECTED_INSTALLATION_ID}${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
}

print_section() {
  echo ""
  echo -e "${BLUE}▶ $1${NC}"
  echo ""
}

check_pass() {
  echo -e "  ${GREEN}✅ $1${NC}"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
}

check_fail() {
  echo -e "  ${RED}❌ $1${NC}"
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
}

check_warn() {
  echo -e "  ${YELLOW}⚠️  $1${NC}"
  CHECKS_WARNED=$((CHECKS_WARNED + 1))
}

check_info() {
  echo -e "  ${BLUE}ℹ️  $1${NC}"
}

# ─── Dependency Checks ────────────────────────────────────────────────────────

check_dependencies() {
  print_section "Checking Dependencies"
  
  local deps_ok=true
  
  if command -v git &> /dev/null; then
    check_pass "git is installed"
  else
    check_fail "git is not installed"
    deps_ok=false
  fi
  
  if command -v gh &> /dev/null; then
    check_pass "GitHub CLI (gh) is installed"
  else
    check_warn "GitHub CLI (gh) is not installed — some checks will be skipped"
    check_info "Install: https://cli.github.com/"
  fi
  
  if ! $deps_ok; then
    echo ""
    echo -e "${RED}Missing required dependencies. Exiting.${NC}"
    exit 2
  fi
}

# ─── Repository Files Check ───────────────────────────────────────────────────

check_repository_files() {
  print_section "Checking Repository Configuration Files"
  
  local required_files=(
    ".github/workflows/bito-ai.yml"
    ".github/workflows/test-bito-integration.yml"
    "scripts/bito-api-helper.sh"
    "scripts/test-bito-api.sh"
    "docs/BITO_AI_INTEGRATION.md"
    "standards/BITO_AI_INTEGRATION_STANDARD.md"
    "skills/bito-ai/SKILL.md"
    ".github/labels.yml"
    ".env.example"
  )
  
  for file in "${required_files[@]}"; do
    if [ -f "${file}" ]; then
      check_pass "${file}"
    else
      check_fail "${file} — file not found"
    fi
  done
}

# ─── Workflow Validation ──────────────────────────────────────────────────────

check_workflow_configuration() {
  print_section "Validating Workflow Configuration"
  
  local workflow_file=".github/workflows/bito-ai.yml"
  
  if [ ! -f "${workflow_file}" ]; then
    check_fail "Workflow file not found"
    return
  fi
  
  if grep -q "gitbito/codereviewagent" "${workflow_file}"; then
    check_pass "Uses gitbito/codereviewagent (current Bito CodeReviewAgent action; bito-core/bito-github-action legacy-compatible)"
  elif grep -q "bito-core/bito-github-action" "${workflow_file}"; then
    check_pass "Uses bito-core/bito-github-action"
  else
    check_fail "Does not use a recognized Bito GitHub Action (gitbito/codereviewagent or bito-core/bito-github-action)"
  fi
  
  if grep -q "BITO_ACCESS_KEY" "${workflow_file}"; then
    check_pass "References BITO_ACCESS_KEY secret (Bito CodeReviewAgent; BITO_API_KEY is the legacy docs alias)"
  elif grep -q "BITO_API_KEY" "${workflow_file}"; then
    check_pass "References BITO_API_KEY secret"
  else
    check_fail "Does not reference a Bito API/access key secret"
  fi

  if grep -q "GIT_ACCESS_TOKEN" "${workflow_file}" || \
     grep -q "GITHUB_TOKEN" "${workflow_file}"; then
    check_pass "References Git access token for PR review"
  else
    check_fail "Does not reference a Git access token"
  fi
  
  if grep -q "permissions:" "${workflow_file}"; then
    check_pass "Defines permissions"
  else
    check_fail "Missing permissions section"
  fi
  
  if grep -q "pull-requests: write" "${workflow_file}"; then
    check_pass "Has pull-requests: write permission"
  else
    check_fail "Missing pull-requests: write permission"
  fi
  
  if grep -q "issues: write" "${workflow_file}"; then
    check_pass "Has issues: write permission"
  else
    check_fail "Missing issues: write permission"
  fi
}

# ─── Labels Check ─────────────────────────────────────────────────────────────

check_labels() {
  print_section "Checking Required Labels"
  
  local labels_file=".github/labels.yml"
  local required_labels=("bito-ai" "bito-ai:review" "bito-ai:changes-needed")
  
  if [ ! -f "${labels_file}" ]; then
    check_fail "Labels file not found: ${labels_file}"
    return
  fi
  
  for label in "${required_labels[@]}"; do
    if grep -q "name: [\"']${label}[\"']" "${labels_file}" || \
       grep -q "name: ${label}" "${labels_file}"; then
      check_pass "Label defined: ${label}"
    else
      check_fail "Label missing: ${label}"
    fi
  done
}

# ─── Environment Variables Check ──────────────────────────────────────────────

check_env_example() {
  print_section "Checking Environment Variables Documentation"
  
  if [ ! -f ".env.example" ]; then
    check_fail ".env.example not found"
    return
  fi
  
  if grep -q "BITO_API_KEY" .env.example; then
    check_pass "BITO_API_KEY documented in .env.example"
  else
    check_fail "BITO_API_KEY not documented in .env.example"
  fi
}

# ─── GitHub Secret Check (requires gh CLI with admin access) ──────────────────

check_github_secret() {
  print_section "Checking GitHub Secrets Configuration"
  
  if ! command -v gh &> /dev/null; then
    check_warn "GitHub CLI not available — skipping secret check"
    return
  fi
  
  # Check if authenticated
  if ! gh auth status &> /dev/null; then
    check_warn "Not authenticated with GitHub CLI — skipping secret check"
    check_info "Run: gh auth login"
    return
  fi
  
  # Try to list secrets (requires admin/maintain access)
  if gh secret list --repo "${REPO_OWNER}/${REPO_NAME}" &> /dev/null; then
    if gh secret list --repo "${REPO_OWNER}/${REPO_NAME}" | grep -Eq "BITO_API_KEY|BITO_ACCESS_KEY"; then
      check_pass "BITO_API_KEY/BITO_ACCESS_KEY secret is configured"
    else
      check_warn "BITO_API_KEY/BITO_ACCESS_KEY secret is NOT visible to this token"
      check_info "Add or verify it at: https://github.com/${REPO_OWNER}/${REPO_NAME}/settings/secrets/actions"
    fi
  else
    check_warn "Cannot access repository secrets (may need admin permissions)"
    check_info "Verify secret exists at: https://github.com/${REPO_OWNER}/${REPO_NAME}/settings/secrets/actions"
  fi
}

# ─── GitHub App Installation Check ────────────────────────────────────────────

check_github_app_installation() {
  print_section "Checking GitHub App Installation"
  
  check_info "Installation ID: ${EXPECTED_INSTALLATION_ID}"
  check_info "Installation URL: https://github.com/settings/installations/${EXPECTED_INSTALLATION_ID}"
  
  if ! command -v gh &> /dev/null; then
    check_warn "GitHub CLI not available — cannot verify app installation automatically"
    check_info "Manual verification: Visit https://github.com/settings/installations"
    return
  fi
  
  # Check if authenticated
  if ! gh auth status &> /dev/null; then
    check_warn "Not authenticated with GitHub CLI — cannot verify app installation"
    check_info "Run: gh auth login"
    return
  fi
  
  # Try to check app installations (this may require specific permissions)
  if gh api "/repos/${REPO_OWNER}/${REPO_NAME}/installation" &> /dev/null; then
    local installation_id
    installation_id=$(gh api "/repos/${REPO_OWNER}/${REPO_NAME}/installation" -q .id 2>/dev/null || echo "")
    
    if [ -n "${installation_id}" ]; then
      check_pass "GitHub App is installed on this repository"
      check_info "Installation ID: ${installation_id}"
      
      if [ "${installation_id}" = "${EXPECTED_INSTALLATION_ID}" ]; then
        check_pass "Installation ID matches expected value"
      else
        check_warn "Installation ID (${installation_id}) does not match expected (${EXPECTED_INSTALLATION_ID})"
        check_info "This may be expected if the app was reinstalled or if multiple apps are used"
      fi
    else
      check_warn "Could not determine installation ID"
    fi
  else
    check_warn "Cannot verify GitHub App installation via API"
    check_info "Manual verification required at: https://github.com/settings/installations"
  fi
}

# ─── Documentation Check ──────────────────────────────────────────────────────

check_documentation() {
  print_section "Checking Documentation Completeness"
  
  local doc_file="docs/BITO_AI_INTEGRATION.md"
  
  if [ ! -f "${doc_file}" ]; then
    check_fail "Integration documentation not found: ${doc_file}"
    return
  fi
  
  local required_sections=(
    "Problem statement"
    "What is BITO AI"
    "Secrets and configuration"
  )
  
  for section in "${required_sections[@]}"; do
    if grep -qi "${section}" "${doc_file}"; then
      check_pass "Documentation section present: ${section}"
    else
      check_warn "Documentation section may be missing: ${section}"
    fi
  done
}

# ─── Script Permissions Check ─────────────────────────────────────────────────

check_script_permissions() {
  print_section "Checking Script Permissions"
  
  local scripts=(
    "scripts/bito-api-helper.sh"
    "scripts/test-bito-api.sh"
  )
  
  for script in "${scripts[@]}"; do
    if [ -x "${script}" ]; then
      check_pass "${script} is executable"
    else
      check_fail "${script} is not executable"
      check_info "Fix with: chmod +x ${script}"
    fi
  done
}

# ─── Summary ──────────────────────────────────────────────────────────────────

print_summary() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  Verification Summary${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
  
  echo -e "  ${GREEN}Passed:  ${CHECKS_PASSED}${NC}"
  echo -e "  ${RED}Failed:  ${CHECKS_FAILED}${NC}"
  echo -e "  ${YELLOW}Warnings: ${CHECKS_WARNED}${NC}"
  echo ""
  
  if [ ${CHECKS_FAILED} -eq 0 ] && [ ${CHECKS_WARNED} -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Bito AI is properly configured.${NC}"
    echo ""
    echo "Next steps:"
    echo "  • Open a test PR to verify the workflow runs"
    echo "  • Check that BITO posts review comments"
    echo "  • Verify labels are applied automatically"
    return 0
  elif [ ${CHECKS_FAILED} -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Configuration is mostly correct, but some warnings were raised.${NC}"
    echo ""
    echo "Review the warnings above and address them if needed."
    return 0
  else
    echo -e "${RED}❌ Some checks failed. Review the failures above and fix them.${NC}"
    echo ""
    echo "Common fixes:"
    echo "  • Run: npm install (to ensure dependencies are present)"
    echo "  • Add BITO_API_KEY secret in GitHub repository settings"
    echo "  • Run: gh auth login (to authenticate GitHub CLI)"
    echo "  • Verify GitHub App installation at: https://github.com/settings/installations/${EXPECTED_INSTALLATION_ID}"
    return 1
  fi
}

# ─── Main Execution ───────────────────────────────────────────────────────────

main() {
  print_header
  
  check_dependencies
  check_repository_files
  check_workflow_configuration
  check_labels
  check_env_example
  check_script_permissions
  check_documentation
  check_github_secret
  check_github_app_installation
  
  print_summary
  return $?
}

# Run main function
main
exit $?
