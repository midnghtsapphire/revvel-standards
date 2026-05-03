# GitHub Automation Quick Setup Guide

Complete quickstart for setting up all GitHub PR review and approval automation in a new repository.

## Prerequisites

- Repository exists on GitHub
- GitHub CLI (`gh`) installed and authenticated
- Admin access to the repository
- GitHub Actions enabled

## 1. Copy Workflow Files (2 minutes)

```bash
# Set your repository path
REPO_PATH="path/to/your/repo"
cd $REPO_PATH

# Create workflows directory if it doesn't exist
mkdir -p .github/workflows

# Copy all automation workflows
cp /path/to/revvel-standards/.github/workflows/arsc-labels.yml .github/workflows/
cp /path/to/revvel-standards/.github/workflows/sync-labels.yml .github/workflows/
cp /path/to/revvel-standards/.github/workflows/pr-labels.yml .github/workflows/
cp /path/to/revvel-standards/.github/workflows/ready-for-review.yml .github/workflows/
cp /path/to/revvel-standards/.github/workflows/pr-review-status.yml .github/workflows/
cp /path/to/revvel-standards/.github/workflows/pr-auto-review.yml .github/workflows/
cp /path/to/revvel-standards/.github/workflows/pr-review-request-handler.yml .github/workflows/

# Copy review automation scripts
mkdir -p scripts
cp /path/to/revvel-standards/scripts/pr-auto-review.js scripts/
cp /path/to/revvel-standards/scripts/pr-review-request-handler.js scripts/

# Copy labels configuration
cp /path/to/revvel-standards/.github/labels.yml .github/
```

## 2. Configure OpenRouter API Key (1 minute)

The automated review workflows require OpenRouter API access:

```bash
# Get your API key from https://openrouter.ai/keys
# Then set it as a repository secret
gh secret set OPENROUTER_API_KEY --repo OWNER/REPO

# Verify it was set
gh secret list --repo OWNER/REPO | grep OPENROUTER
```

> **Note:** The `pr-auto-review.yml` and `pr-review-request-handler.yml` workflows will skip gracefully if `OPENROUTER_API_KEY` is not set, so other automation will continue to work.

## 3. Configure Repository Settings (1 minute)

```bash
# Enable GitHub Actions with write permissions
gh api repos/OWNER/REPO/actions/permissions \
  --method PUT \
  -f enabled=true \
  -f allowed_actions=all

# Set workflow permissions to read-write
gh api repos/OWNER/REPO/actions/permissions/workflow \
  --method PUT \
  -f default_workflow_permissions=write \
  -f can_approve_pull_request_reviews=false
```

Replace `OWNER/REPO` with your repository path (e.g., `midnghtsapphire/my-app`).

## 4. Create Review Status Labels (1 minute)

Run this script to create all review status labels:

```bash
#!/bin/bash
REPO="OWNER/REPO"  # Replace with your repo

# Review status labels
gh label create "awaiting-approval" \
  --repo $REPO \
  --color "fbca04" \
  --description "PR is awaiting review and approval"

gh label create "changes-requested" \
  --repo $REPO \
  --color "d93f0b" \
  --description "PR has changes requested by reviewers"

gh label create "approved" \
  --repo $REPO \
  --color "0e8a16" \
  --description "PR has been approved by reviewers"

gh label create "review-started" \
  --repo $REPO \
  --color "0075ca" \
  --description "PR review has been initiated"

# Optional: Other useful labels
gh label create "in-review" \
  --repo $REPO \
  --color "fbca04" \
  --description "Linked PR is open and ready for review"

gh label create "draft" \
  --repo $REPO \
  --color "cccccc" \
  --description "Pull request is still a draft"

echo "✅ All labels created successfully!"
```

**Or use the sync workflow:**

```bash
# Commit and push the labels.yml file
git add .github/labels.yml .github/workflows/sync-labels.yml
git commit -m "feat: add standard labels and sync workflow"
git push

# Manually trigger the sync workflow
gh workflow run sync-labels.yml
```

## 5. Set Up Branch Protection (2 minutes)

```bash
# Enable branch protection with required reviews
gh api repos/OWNER/REPO/branches/main/protection \
  --method PUT \
  --input - <<EOF
{
  "required_status_checks": null,
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

## 6. Test the Automation (3 minutes)

Create a test PR to verify everything works:

```bash
# Create a test branch
git checkout -b test/automation-setup
echo "# Test" >> TEST.md
git add TEST.md
git commit -m "test: verify PR automation"
git push -u origin test/automation-setup

# Create PR
gh pr create \
  --title "Test: PR Review Automation" \
  --body "Testing the automated review status labels and badges" \
  --base main

# Check PR number
PR_NUM=$(gh pr view --json number -q .number)

# Verify automation ran
gh pr view $PR_NUM --json labels -q '.labels[].name'
# Should show: awaiting-approval

# Submit a review to test label changes
gh pr review $PR_NUM --approve
# Label should change to: approved

# Clean up
gh pr close $PR_NUM --delete-branch
```

## 7. Add Status Badges to README (Optional)

Add these badges to your `README.md`:

```markdown
## Status

![Open PRs](https://img.shields.io/github/issues-pr/OWNER/REPO?style=for-the-badge)
![CI Status](https://img.shields.io/github/actions/workflow/status/OWNER/REPO/ci.yml?branch=main&style=for-the-badge&label=CI)

### PR Review Status

- ![Awaiting Approval](https://img.shields.io/badge/-awaiting_approval-yellow) — Needs review
- ![Approved](https://img.shields.io/badge/-approved-green) — Ready to merge
- ![Changes Requested](https://img.shields.io/badge/-changes_requested-red) — Needs updates
```

## Complete Setup Script

Save this as `setup-github-automation.sh`:

```bash
#!/bin/bash
set -e

# Configuration
REPO="${1:-}"
REVVEL_STANDARDS_PATH="${2:-../revvel-standards}"

if [ -z "$REPO" ]; then
  echo "Usage: $0 OWNER/REPO [revvel-standards-path]"
  echo "Example: $0 midnghtsapphire/my-app ../revvel-standards"
  exit 1
fi

echo "🚀 Setting up GitHub automation for $REPO..."

# Step 1: Copy workflow files
echo "📁 Copying workflow files..."
mkdir -p .github/workflows
cp "$REVVEL_STANDARDS_PATH/.github/workflows/arsc-labels.yml" .github/workflows/
cp "$REVVEL_STANDARDS_PATH/.github/workflows/sync-labels.yml" .github/workflows/
cp "$REVVEL_STANDARDS_PATH/.github/workflows/pr-labels.yml" .github/workflows/
cp "$REVVEL_STANDARDS_PATH/.github/workflows/ready-for-review.yml" .github/workflows/
cp "$REVVEL_STANDARDS_PATH/.github/workflows/pr-review-status.yml" .github/workflows/
cp "$REVVEL_STANDARDS_PATH/.github/workflows/pr-auto-review.yml" .github/workflows/
cp "$REVVEL_STANDARDS_PATH/.github/workflows/pr-review-request-handler.yml" .github/workflows/
cp "$REVVEL_STANDARDS_PATH/.github/labels.yml" .github/

# Copy review automation scripts
mkdir -p scripts
cp "$REVVEL_STANDARDS_PATH/scripts/pr-auto-review.js" scripts/
cp "$REVVEL_STANDARDS_PATH/scripts/pr-review-request-handler.js" scripts/

# Step 2: Configure OpenRouter API key (optional but recommended)
echo "🔑 Configuring secrets..."
echo "⚠️  Please set OPENROUTER_API_KEY manually:"
echo "    gh secret set OPENROUTER_API_KEY --repo $REPO"
echo ""

# Step 3: Enable Actions
echo "⚙️  Configuring repository settings..."
gh api "repos/$REPO/actions/permissions" \
  --method PUT \
  -f enabled=true \
  -f allowed_actions=all

gh api "repos/$REPO/actions/permissions/workflow" \
  --method PUT \
  -f default_workflow_permissions=write \
  -f can_approve_pull_request_reviews=false

# Step 4: Create labels
echo "🏷️  Creating labels..."
gh label create "awaiting-approval" --repo "$REPO" --color "fbca04" --description "PR is awaiting review and approval" || true
gh label create "changes-requested" --repo "$REPO" --color "d93f0b" --description "PR has changes requested by reviewers" || true
gh label create "approved" --repo "$REPO" --color "0e8a16" --description "PR has been approved by reviewers" || true
gh label create "review-started" --repo "$REPO" --color "0075ca" --description "PR review has been initiated" || true
gh label create "in-review" --repo "$REPO" --color "fbca04" --description "Linked PR is open and ready for review" || true
gh label create "draft" --repo "$REPO" --color "cccccc" --description "Pull request is still a draft" || true

# Step 5: Commit and push
echo "💾 Committing changes..."
git add .github/ scripts/
git commit -m "feat: add GitHub PR review automation

- Add PR review status automation with badges
- Add automated code review submission via OpenRouter (pr-auto-review.yml)
- Add automated review feedback analysis (pr-review-request-handler.yml)
- Add ARSC labels workflow for label management
- Add PR labels workflow for label-driven CI
- Add ready-for-review workflow for auto-promotion
- Add sync-labels workflow for label synchronization

Co-authored-by: revvel-standards <revvel-standards@midnghtsapphire.com>"

git push

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Enable branch protection: Settings → Branches → Add rule"
echo "2. Test with a new PR to verify automation"
echo "3. Add status badges to README.md (optional)"
echo ""
echo "Documentation:"
echo "- PR Review Status: $REVVEL_STANDARDS_PATH/docs/PR_REVIEW_STATUS_AUTOMATION.md"
echo "- PR Auto Review: $REVVEL_STANDARDS_PATH/docs/PR_AUTO_REVIEW_AUTOMATION.md"
echo "- PR Review Request Handler: $REVVEL_STANDARDS_PATH/docs/PR_REVIEW_REQUEST_AUTOMATION.md"
echo "- Badge Guide: $REVVEL_STANDARDS_PATH/docs/PR_STATUS_BADGES_GUIDE.md"
echo "- Full Setup: $REVVEL_STANDARDS_PATH/docs/GITHUB_PROJECTS_SETUP.md"
```

Make it executable and run:

```bash
chmod +x setup-github-automation.sh
./setup-github-automation.sh midnghtsapphire/my-app
```

## Troubleshooting

### Workflows Not Running

**Issue:** Workflows don't trigger on PR events

**Solution:**
1. Check Actions are enabled: Settings → Actions → General
2. Verify workflow files are on the default branch (`main`)
3. Check workflow syntax with: `gh workflow view pr-review-status.yml`

### Labels Not Updating

**Issue:** Labels don't change when reviews are submitted

**Solution:**
1. Check workflow permissions: Settings → Actions → Workflow permissions → Read and write
2. Verify labels exist: Settings → Issues → Labels
3. Check workflow run logs: Actions tab → Select workflow run

### Branch Protection Blocking

**Issue:** Can't push to main due to branch protection

**Solution:**
1. Disable branch protection temporarily
2. Push your changes
3. Re-enable branch protection
4. Or: Always work in feature branches

### API Rate Limiting

**Issue:** GitHub API rate limit exceeded

**Solution:**
1. Wait 1 hour for rate limit reset
2. Use a personal access token with higher limits
3. Reduce frequency of workflow triggers

## Advanced Configuration

### Custom Review Requirements

Edit `pr-review-status.yml` to add custom review logic:

```yaml
# Require 2 approvals for approved status
const approvalCount = Array.from(reviewerStates.values())
  .filter(r => r.state === 'APPROVED').length;

if (approvalCount >= 2) {
  targetLabel = 'approved';
}
```

### Slack Notifications

Add Slack webhook notifications:

```yaml
- name: Notify Slack
  if: steps.determine-review-state.outputs.review_status == 'approved'
  uses: slackapi/slack-github-action@v1.24.0
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "PR approved and ready to merge! 🎉"
      }
```

### Custom Badge Styles

Modify badge URLs in the workflow:

```javascript
// Change from for-the-badge to flat-square
statusBadge = '![Status](https://img.shields.io/badge/status-approved-green?style=flat-square)';
```

## Maintenance

### Update Workflows

Pull latest changes from revvel-standards:

```bash
cd /path/to/revvel-standards
git pull

cd /path/to/your/repo
cp /path/to/revvel-standards/.github/workflows/pr-review-status.yml .github/workflows/
git add .github/workflows/pr-review-status.yml
git commit -m "chore: update PR review automation workflow"
git push
```

### Sync Labels

Run the sync-labels workflow manually:

```bash
gh workflow run sync-labels.yml
```

Or trigger automatically by updating labels.yml:

```bash
# Edit .github/labels.yml
# Commit and push - workflow runs automatically
```

## Documentation Links

- **PR Review Status Automation**: [PR_REVIEW_STATUS_AUTOMATION.md](PR_REVIEW_STATUS_AUTOMATION.md)
- **Badge Integration Guide**: [PR_STATUS_BADGES_GUIDE.md](PR_STATUS_BADGES_GUIDE.md)
- **Complete GitHub Setup**: [GITHUB_PROJECTS_SETUP.md](GITHUB_PROJECTS_SETUP.md)
- **Workflow Templates**: [templates/cicd/](../templates/cicd/)

## Support

For help or questions:

1. Check the troubleshooting section above
2. Review workflow run logs in the Actions tab
3. Open an issue in `midnghtsapphire/revvel-standards`
4. Tag `@copilot` or `@openrouter` for assistance

---

**Quick Setup Time:** ~5-10 minutes  
**Maintained By:** MIDNGHTSAPPHIRE Team  
**Last Updated:** April 29, 2026
