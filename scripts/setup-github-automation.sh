#!/bin/bash
# GitHub PR Review Automation Setup Script
# 
# This script automates the setup of PR review status automation, labels,
# and related workflows for any GitHub repository.
#
# Usage:
#   ./setup-github-automation.sh OWNER/REPO [revvel-standards-path]
#
# Example:
#   ./setup-github-automation.sh midnghtsapphire/my-app ../revvel-standards

set -e  # Exit on error

# ═══════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════

REPO="${1:-}"
REVVEL_STANDARDS_PATH="${2:-../revvel-standards}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════════════════

log_info() {
  echo -e "${BLUE}ℹ${NC}  $1"
}

log_success() {
  echo -e "${GREEN}✓${NC}  $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC}  $1"
}

log_error() {
  echo -e "${RED}✗${NC}  $1"
}

check_prerequisites() {
  log_info "Checking prerequisites..."
  
  # Check if gh CLI is installed
  if ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) is not installed"
    echo "Install from: https://cli.github.com/"
    exit 1
  fi
  
  # Check if gh is authenticated
  if ! gh auth status &> /dev/null; then
    log_error "GitHub CLI is not authenticated"
    echo "Run: gh auth login"
    exit 1
  fi
  
  # Check if revvel-standards path exists
  if [ ! -d "$REVVEL_STANDARDS_PATH" ]; then
    log_error "revvel-standards path not found: $REVVEL_STANDARDS_PATH"
    exit 1
  fi
  
  log_success "Prerequisites check passed"
}

# ═══════════════════════════════════════════════════════════════════════════
# Main Script
# ═══════════════════════════════════════════════════════════════════════════

# Check arguments
if [ -z "$REPO" ]; then
  echo "Usage: $0 OWNER/REPO [revvel-standards-path]"
  echo "Example: $0 midnghtsapphire/my-app ../revvel-standards"
  exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  GitHub PR Review Automation Setup"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Repository: $REPO"
echo "Standards:  $REVVEL_STANDARDS_PATH"
echo ""

# Run prerequisite checks
check_prerequisites

# ───────────────────────────────────────────────────────────────────────────
# Step 1: Copy Workflow Files
# ───────────────────────────────────────────────────────────────────────────

echo ""
log_info "Step 1: Copying workflow files..."

mkdir -p .github/workflows

WORKFLOWS=(
  "arsc-labels.yml"
  "sync-labels.yml"
  "pr-labels.yml"
  "ready-for-review.yml"
  "pr-review-status.yml"
)

for workflow in "${WORKFLOWS[@]}"; do
  SOURCE="$REVVEL_STANDARDS_PATH/.github/workflows/$workflow"
  TARGET=".github/workflows/$workflow"
  
  if [ -f "$SOURCE" ]; then
    cp "$SOURCE" "$TARGET"
    log_success "Copied $workflow"
  else
    log_warning "Workflow not found: $workflow (skipping)"
  fi
done

# Copy labels configuration
if [ -f "$REVVEL_STANDARDS_PATH/.github/labels.yml" ]; then
  cp "$REVVEL_STANDARDS_PATH/.github/labels.yml" .github/
  log_success "Copied labels.yml"
else
  log_warning "labels.yml not found (skipping)"
fi

# ───────────────────────────────────────────────────────────────────────────
# Step 2: Configure Repository Settings
# ───────────────────────────────────────────────────────────────────────────

echo ""
log_info "Step 2: Configuring repository settings..."

# Enable Actions with all permissions
log_info "Enabling GitHub Actions..."
gh api "repos/$REPO/actions/permissions" \
  --method PUT \
  -f enabled=true \
  -f allowed_actions=all \
  2>/dev/null && log_success "Actions enabled" || log_warning "Could not enable Actions (may already be enabled)"

# Set workflow permissions to read-write
log_info "Setting workflow permissions..."
gh api "repos/$REPO/actions/permissions/workflow" \
  --method PUT \
  -f default_workflow_permissions=write \
  -f can_approve_pull_request_reviews=false \
  2>/dev/null && log_success "Workflow permissions set to read-write" || log_warning "Could not set permissions (check admin access)"

# ───────────────────────────────────────────────────────────────────────────
# Step 3: Create Review Status Labels
# ───────────────────────────────────────────────────────────────────────────

echo ""
log_info "Step 3: Creating labels..."

create_label() {
  local name=$1
  local color=$2
  local description=$3
  
  gh label create "$name" \
    --repo "$REPO" \
    --color "$color" \
    --description "$description" \
    2>/dev/null && log_success "Created label: $name" || log_info "Label already exists: $name"
}

# Review status labels
create_label "awaiting-approval" "fbca04" "PR is awaiting review and approval"
create_label "changes-requested" "d93f0b" "PR has changes requested by reviewers"
create_label "approved" "0e8a16" "PR has been approved by reviewers"
create_label "review-started" "0075ca" "PR review has been initiated"

# Related labels
create_label "in-review" "fbca04" "Linked PR is open and ready for review"
create_label "draft" "cccccc" "Pull request is still a draft"
create_label "triage" "e4e669" "Needs triage — newly opened issue awaiting classification"

# ───────────────────────────────────────────────────────────────────────────
# Step 4: Commit and Push Changes
# ───────────────────────────────────────────────────────────────────────────

echo ""
log_info "Step 4: Committing changes..."

# Check if there are changes to commit
if git diff --quiet && git diff --cached --quiet; then
  log_warning "No changes to commit (workflows may already exist)"
else
  git add .github/
  
  git commit -m "feat: add GitHub PR review automation

- Add PR review status automation with badges
- Add ARSC labels workflow for label management
- Add PR labels workflow for label-driven CI
- Add ready-for-review workflow for auto-promotion
- Add sync-labels workflow for label synchronization

Automation setup via revvel-standards

Co-authored-by: revvel-standards <revvel-standards@midnghtsapphire.com>"

  log_success "Changes committed"
  
  log_info "Pushing to remote..."
  git push
  log_success "Changes pushed to remote"
fi

# ───────────────────────────────────────────────────────────────────────────
# Completion
# ───────────────────────────────────────────────────────────────────────────

echo ""
echo "════════════════════════════════════════════════════════════════"
log_success "Setup complete!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "✓ Workflow files copied"
echo "✓ Repository settings configured"
echo "✓ Review status labels created"
echo "✓ Changes committed and pushed"
echo ""
echo "Next steps:"
echo ""
echo "1. Enable branch protection (recommended):"
echo "   gh api repos/$REPO/branches/main/protection \\"
echo "     --method PUT --input protection.json"
echo ""
echo "2. Test the automation:"
echo "   - Create a new PR"
echo "   - Verify 'awaiting-approval' label is applied"
echo "   - Submit a review and check label updates"
echo ""
echo "3. Add status badges to README.md (optional):"
echo "   See: docs/PR_STATUS_BADGES_GUIDE.md"
echo ""
echo "Documentation:"
echo "  • PR Review Status: docs/PR_REVIEW_STATUS_AUTOMATION.md"
echo "  • Badge Guide: docs/PR_STATUS_BADGES_GUIDE.md"
echo "  • Full Setup: docs/GITHUB_PROJECTS_SETUP.md"
echo ""
echo "Need help? Open an issue or tag @copilot"
echo ""
