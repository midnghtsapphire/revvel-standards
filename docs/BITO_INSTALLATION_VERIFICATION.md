# BITO AI GitHub App Installation Verification

**Date:** May 3, 2026  
**Status:** Active  
**Installation ID:** 128849516  
**Repository:** midnghtsapphire/revvel-standards  

---

## 1. Overview

This document tracks the installation status of the Bito AI GitHub App for the MIDNGHTSAPPHIRE organization. The Bito AI extension provides:

- **Persistent-memory code review** on every PR
- **Agentic workflow** that learns repository conventions over time
- **Desktop CLI and IDE integration** for local development
- **Automated label management** integrated with the ARSC label system

---

## 2. Installation Verification

### 2.1 GitHub App Installation

The Bito AI GitHub App is installed with ID: **128849516**

**Installation URL:** <https://github.com/settings/installations/128849516>

**To verify the installation:**

1. Navigate to <https://github.com/settings/installations>
2. Look for "Bito AI" or "Bito" in the list of installed GitHub Apps
3. Verify the installation ID matches 128849516
4. Confirm it has access to `midnghtsapphire/revvel-standards`

**Required Permissions:**

The Bito GitHub App requires the following permissions:
- ✅ **Pull requests:** Read & Write (to post review comments)
- ✅ **Issues:** Read & Write (to manage labels)
- ✅ **Contents:** Read (to access repository code)
- ✅ **Metadata:** Read (standard GitHub app permission)

### 2.2 Repository Configuration

The following files confirm Bito AI integration in the repository:

| File | Purpose | Status |
|------|---------|--------|
| `.github/workflows/bito-ai.yml` | Main review workflow | ✅ Present |
| `.github/workflows/test-bito-integration.yml` | Integration tests | ✅ Present |
| `scripts/bito-api-helper.sh` | API key management | ✅ Present |
| `scripts/test-bito-api.sh` | API connectivity tests | ✅ Present |
| `docs/BITO_AI_INTEGRATION.md` | Integration documentation | ✅ Present |
| `standards/BITO_AI_INTEGRATION_STANDARD.md` | Integration standard | ✅ Present |
| `skills/bito-ai/SKILL.md` | Skill metadata | ✅ Present |
| `.env.example` | Environment variables | ✅ Includes BITO_API_KEY |

### 2.3 Required GitHub Secrets

| Secret | Status | Where to Configure |
|--------|--------|-------------------|
| `BITO_API_KEY` | ⚠️ Needs Verification | Settings → Secrets and variables → Actions → Repository secrets |

**To verify the secret:**

```bash
# Check if secret is configured (requires gh CLI with admin access)
gh secret list --repo midnghtsapphire/revvel-standards | grep BITO_API_KEY
```

**To configure the secret:**

1. Get your API key from <https://bito.ai> → Settings → API Keys
2. Go to <https://github.com/midnghtsapphire/revvel-standards/settings/secrets/actions>
3. Click "New repository secret"
4. Name: `BITO_API_KEY`
5. Value: (paste your API key)
6. Click "Add secret"

### 2.4 Required Labels

The following labels must exist in the repository for Bito AI workflow automation:

| Label | Color | Description | Status |
|-------|-------|-------------|--------|
| `bito-ai` | `#7B68EE` | Marks PR as reviewed by BITO AI | ✅ Configured |
| `bito-ai:review` | `#9370DB` | BITO review complete | ✅ Configured |
| `bito-ai:changes-needed` | `#FF6347` | BITO found blocking issues | ✅ Configured |

**Verification:** Labels are defined in `.github/labels.yml` and synced by the `sync-labels.yml` workflow.

---

## 3. Testing the Installation

### 3.1 Automated Tests

Run the integration test workflow:

```bash
# Trigger the test workflow manually
gh workflow run test-bito-integration.yml --repo midnghtsapphire/revvel-standards
```

Or navigate to: <https://github.com/midnghtsapphire/revvel-standards/actions/workflows/test-bito-integration.yml>

### 3.2 Manual Verification

1. **Open a test PR** in the repository
2. **Verify the workflow runs:** Check the Actions tab for "BITO AI — Code Review"
3. **Check for review comments:** BITO should post structured review feedback
4. **Verify labels:** The PR should receive `bito-ai` and `bito-ai:review` labels
5. **Test opt-out:** Add `[skip-bito]` to PR title and verify workflow skips

### 3.3 Using Helper Scripts

```bash
# Check configuration status
./scripts/bito-api-helper.sh status

# Test API connectivity (requires BITO_API_KEY)
export BITO_API_KEY="your-key-from-bito.ai"
./scripts/test-bito-api.sh
```

---

## 4. Desktop Integration (Optional)

For local development, install the Bito CLI and IDE extensions:

### 4.1 CLI Installation

```bash
# macOS
brew install bito-ai/tap/bito

# Linux
curl -fsSL https://bito.ai/install.sh | bash

# Authenticate
bito auth login
```

### 4.2 VS Code Extension

1. Open VS Code Extensions (Ctrl+Shift+X or Cmd+Shift+X)
2. Search for "Bito AI"
3. Install the extension
4. Sign in when prompted

### 4.3 JetBrains Plugin

1. Go to Settings → Plugins
2. Search for "Bito"
3. Install and restart
4. Sign in when prompted

---

## 5. Troubleshooting

### 5.1 Workflow Not Running

**Symptom:** Bito workflow doesn't trigger on PRs

**Solutions:**
- Verify the workflow file exists: `.github/workflows/bito-ai.yml`
- Check PR is not in draft mode (drafts are skipped)
- Verify PR title doesn't contain `[skip-bito]`
- Check repository settings: Actions → General → Allow all actions

### 5.2 Missing Review Comments

**Symptom:** Workflow runs but no review comments appear

**Solutions:**
- Check `BITO_API_KEY` secret is configured
- Verify the secret has a valid API key from <https://bito.ai>
- Check workflow logs for errors: Actions → BITO AI — Code Review → View logs
- Ensure the GitHub App has `pull-requests: write` permission

### 5.3 Labels Not Applied

**Symptom:** Review completes but labels aren't added

**Solutions:**
- Run the label sync workflow: Actions → Sync Standard Labels → Run workflow
- Verify labels exist: Settings → Labels
- Check workflow has `issues: write` permission
- Review workflow logs for permission errors

### 5.4 API Key Issues

**Symptom:** Workflow shows "BITO_API_KEY is not set" warning

**Solutions:**
- Add the secret: Settings → Secrets and variables → Actions → New repository secret
- Use helper script: `./scripts/bito-api-helper.sh wire`
- Verify secret name is exactly `BITO_API_KEY` (case-sensitive)

---

## 6. Compliance Checklist

Before marking Bito AI as fully operational:

- [ ] GitHub App installed and accessible to the repository
- [ ] Installation ID verified: 128849516
- [ ] Required permissions granted (pull-requests, issues, contents)
- [ ] `BITO_API_KEY` secret configured in GitHub Actions
- [ ] All required labels synced from `.github/labels.yml`
- [ ] Test workflow passes: `test-bito-integration.yml`
- [ ] Manual PR test confirms review comments are posted
- [ ] Labels are automatically applied on review completion
- [ ] Documentation is up-to-date in `docs/BITO_AI_INTEGRATION.md`
- [ ] Standard is published in `standards/BITO_AI_INTEGRATION_STANDARD.md`

---

## 7. References

- **Bito AI Website:** <https://bito.ai>
- **GitHub App Installation:** <https://github.com/settings/installations/128849516>
- **Integration Documentation:** [docs/BITO_AI_INTEGRATION.md](./BITO_AI_INTEGRATION.md)
- **Integration Standard:** [standards/BITO_AI_INTEGRATION_STANDARD.md](../standards/BITO_AI_INTEGRATION_STANDARD.md)
- **Skill Metadata:** [skills/bito-ai/SKILL.md](../skills/bito-ai/SKILL.md)
- **Workflow:** [.github/workflows/bito-ai.yml](../.github/workflows/bito-ai.yml)
- **Helper Scripts:** `scripts/bito-api-helper.sh`, `scripts/test-bito-api.sh`

---

## 8. Maintenance

### 8.1 Periodic Checks

Run these checks monthly to ensure continued operation:

```bash
# 1. Verify workflow syntax
npm test

# 2. Check configuration status
./scripts/bito-api-helper.sh status

# 3. Test API connectivity
./scripts/test-bito-api.sh

# 4. Run integration tests
gh workflow run test-bito-integration.yml
```

### 8.2 API Key Rotation

When rotating the BITO API key:

1. Generate new key at <https://bito.ai> → Settings → API Keys
2. Update GitHub secret: `gh secret set BITO_API_KEY --repo midnghtsapphire/revvel-standards`
3. (Optional) Update Vault: `vault kv put revvel/shared/code-review/bito api_key="<new-key>"`
4. Test connectivity: `./scripts/test-bito-api.sh`

### 8.3 Updating Bito GitHub Action

Monitor for updates to `bito-core/bito-github-action`:

```yaml
# Current version in .github/workflows/bito-ai.yml
uses: bito-core/bito-github-action@v1
```

Check for updates at: <https://github.com/bito-core/bito-github-action/releases>

---

**Last Verified:** May 3, 2026  
**Verified By:** GitHub Copilot Cloud Agent  
**Next Verification Due:** June 3, 2026
