# Credential Routing Process

**Automatic routing of credentials-missing issues to agents with desktop access**

---

## Overview

This document describes the automated workflow for routing issues that require credential provisioning to appropriate agents that have the necessary access to retrieve secrets from local systems, keychains, or credential vaults.

**Problem Solved:** Issues labeled `credentials-missing` no longer get stuck waiting for manual human intervention. The system automatically routes them to agents capable of desktop/file system access for credential retrieval.

**Doppler is optional:** `scripts/credential-backup-harness.js` checks GitHub
Actions secrets, direct env, JSON backup, SOPS/age, pass, Bitwarden CLI,
1Password CLI, and Doppler. See
[`docs/CREDENTIAL_BACKUP_HARNESS.md`](CREDENTIAL_BACKUP_HARNESS.md).

---

## How It Works

### 1. Detection Phase (`credential-gatekeeper.yml`)

When an issue is opened or labeled `ready-to-implement`:

1. **Credential Gatekeeper** scans the issue title and body for keywords indicating credential requirements
2. Detects required services (OpenRouter, Stripe, GitHub PAT, database URLs, etc.)
3. Generates a Bill of Materials (BOM) comment listing all required credentials
4. Applies the `credentials-missing` label if any credentials are not yet provisioned
5. Applies the `credentials-ready` label if all credentials are already available

**Detected Services:**
- OpenRouter API key
- Jules API key
- OpenAI API key
- GitHub PAT / App credentials
- Database credentials (Supabase, PlanetScale, DigitalOcean)
- Payment services (Stripe)
- DNS providers (DigitalOcean, Namecheap, GoDaddy, Porkbun)
- Email services (Resend)
- Analytics (Mixpanel, PostHog, Amplitude)
- Testing (mabl)
- And many more (see `credential-gatekeeper.yml` for full list)

### 2. Routing Phase (`credential-label-router.yml`)

When the `credentials-missing` label is applied:

**Priority 1: Agent HQ (if configured)**
- Triggers desktop agent orchestrator
- Desktop agent has full file system and keychain access
- Can retrieve credentials from:
  - HashiCorp Vault CLI
  - macOS Keychain / Windows Credential Manager
  - `.env` files in development directories
  - Doppler CLI
  - BITO CLI secret store
- Provisions credentials to Doppler or GitHub Actions secrets
- **Estimated time:** 5-15 minutes

**Priority 2: Vault Agent (fallback)**
- Applies `vault-agent` label
- Posts routing comment with 3 provisioning options:
  1. **Automated via Doppler** (recommended)
  2. **Manual GitHub Secrets** (direct to repo settings)
  3. **Desktop agent** (Flexina, Agent HQ, BITO CLI)
- Provides step-by-step instructions for each option

**Priority 3: Stale Detection & Escalation**
- If credentials-missing remains for > 24 hours without update
- Automatically applies `needs-human` label
- Posts escalation comment explaining why manual intervention is needed
- Suggests configuration improvements for future automation

### 3. Provisioning Phase

**Option A: Automated (Agent HQ)**
```bash
# Agent HQ desktop agent automatically:
1. Detects credential requirements from issue
2. Searches local vault/keychain/env files
3. Retrieves credential values
4. Provisions to Doppler via API
5. Triggers gatekeeper-sync.sh to sync to GitHub
6. Removes credentials-missing label
7. Adds credentials-ready label
```

**Option B: Automated (Doppler + Gatekeeper)**
```bash
# Developer manually adds to Doppler:
doppler login
doppler setup
doppler secrets set SECRET_NAME --value "VALUE"

# Gatekeeper workflow automatically:
1. Detects new secret in Doppler
2. Syncs to GitHub Actions secrets via gatekeeper-sync.sh
3. Updates BOM comment with ✅ synced status
4. Removes credentials-missing label when all synced
5. Adds credentials-ready label
```

**Option C: Manual GitHub Secrets**
```bash
# Developer adds directly:
Settings → Secrets and variables → Actions → New repository secret

# Then manually:
1. Remove credentials-missing label
2. Add credentials-ready label
```

**Option D: Desktop Agent (Flexina)**
```bash
# If Flexina agent is available:
1. Add flexina label to issue
2. Flexina agent (if configured) will automatically:
   - Read credential requirements from issue
   - Locate credentials on desktop
   - Provision to configured secret store
   - Update labels when complete
```

### 4. Verification Phase

Once all credentials are provisioned:

1. The `credentials-missing` label is removed
2. The `credentials-ready` label is applied
3. A success comment is posted with credential status table
4. Implementation agents can now proceed with the task

---

## Flow Diagram

```text
┌─────────────────────────┐
│ Issue Opened/Labeled    │
│ (ready-to-implement)    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│ Credential Gatekeeper Workflow          │
│ (.github/workflows/credential-          │
│  gatekeeper.yml)                        │
│                                         │
│ 1. Scan issue title + body for keywords│
│ 2. Detect required services/credentials│
│ 3. Check Doppler for existing secrets  │
│ 4. Generate BOM comment                │
│ 5. Apply label                          │
└─────────────┬───────────────────────────┘
              │
      ┌───────┴────────┐
      │                │
      ▼                ▼
┌──────────┐    ┌─────────────┐
│credentials│    │credentials- │
│-ready     │    │missing      │
└─────┬─────┘    └──────┬──────┘
      │                 │
      ▼                 ▼
┌──────────┐    ┌─────────────────────────┐
│Implementation   │ Credential Label Router │
│can proceed │    │ (.github/workflows/     │
└──────────┘    │  credential-label-      │
               │  router.yml)             │
               │                          │
               │ Triggered by:            │
               │ - credentials-missing    │
               │   label added            │
               │ - Hourly cron sweep      │
               └────────┬─────────────────┘
                        │
            ┌───────────┴────────────┐
            │                        │
            ▼                        ▼
┌──────────────────┐      ┌──────────────────┐
│ Agent HQ Token   │      │ No Agent HQ      │
│ Available?       │      │ Token            │
└────────┬─────────┘      └────────┬─────────┘
         │ YES                     │ NO
         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│ Trigger Agent HQ │      │ Apply vault-agent│
│ Desktop Agent    │      │ label            │
│                  │      │                  │
│ 1. POST to       │      │ Post routing     │
│    Agent HQ API  │      │ comment with     │
│ 2. Add labels:   │      │ 3 provisioning   │
│    - agent-hq    │      │ options          │
│    - desktop-    │      │                  │
│      access-     │      │ Developer chooses│
│      required    │      │ option and       │
│ 3. Post routing  │      │ provisions       │
│    comment       │      │ manually         │
└────────┬─────────┘      └────────┬─────────┘
         │                         │
         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│ Desktop Agent    │      │ Wait for manual  │
│ Provisions       │      │ provisioning     │
│ Credentials      │      └────────┬─────────┘
│                  │               │
│ 1. Search local  │               │ 24+ hours?
│    vault/keychain│               ▼
│ 2. Retrieve      │      ┌──────────────────┐
│    values        │      │ Stale Detection  │
│ 3. Provision to  │      │ (hourly cron)    │
│    Doppler       │      │                  │
│ 4. Trigger sync  │      │ Add needs-human  │
│ 5. Update labels │      │ label            │
└────────┬─────────┘      │                  │
         │                │ Post escalation  │
         │                │ comment          │
         │                └────────┬─────────┘
         │                         │
         └─────────┬───────────────┘
                   │
                   ▼
         ┌──────────────────┐
         │ All Credentials  │
         │ Provisioned      │
         │                  │
         │ 1. Remove        │
         │    credentials-  │
         │    missing       │
         │ 2. Add           │
         │    credentials-  │
         │    ready         │
         │ 3. Post success  │
         │    comment       │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Implementation   │
         │ Proceeds         │
         └──────────────────┘
```

---

## Labels

### Credential Status Labels

| Label | Color | Meaning | Applied By |
|---|---|---|---|
| `credentials-missing` | Red (`d93f0b`) | Issue blocked — missing API keys/secrets | `credential-gatekeeper.yml` |
| `credentials-ready` | Green (`0e8a16`) | All required credentials provisioned | `credential-gatekeeper.yml`, `credential-label-router.yml` |

### Routing Labels

| Label | Color | Meaning | Applied By |
|---|---|---|---|
| `vault-agent` | Yellow (`e4e669`) | Vault Agent credential provisioning required | `credential-label-router.yml` |
| `agent-hq` | Purple (`6f42c1`) | Routed to Agent HQ desktop agent system | `credential-label-router.yml` |
| `desktop-access-required` | Orange (`fbca04`) | Requires desktop agent with file system access | `credential-label-router.yml` |
| `flexina` | Purple (`9b59b6`) | Route to Flexina desktop automation agent | Manual or automation |

### Escalation Labels

| Label | Color | Meaning | Applied By |
|---|---|---|---|
| `needs-human` | Red (`d93f0b`) | Escalated — requires human intervention | `credential-label-router.yml` (after 24h) |

---

## Configuration

### Repository Secrets

| Secret | Required | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | Powers OpenRouter triage and routing |
| `DOPPLER_TOKEN` | Recommended | Enables automated secret sync from Doppler |
| `ADMIN_GITHUB_TOKEN` | Recommended | Allows gatekeeper to write Actions secrets |
| `AGENT_HQ_TOKEN` | Optional | Enables Agent HQ desktop agent routing |
| `AGENT_HQ_URL` | Optional | Agent HQ API endpoint (defaults to `https://agent-hq.revvel.co`) |

### Doppler Setup

```bash
# Install Doppler CLI
curl -Ls https://cli.doppler.com/install.sh | sh

# Login
doppler login

# Create project (first time only)
doppler projects create revvel-standards

# Select project and config
doppler setup

# Add a secret
doppler secrets set OPENROUTER_API_KEY --value "sk-or-v1-..."

# View all secrets
doppler secrets
```

### Agent HQ Setup

1. Deploy Agent HQ to your infrastructure:
   ```bash
   git clone https://github.com/your-org/agent-hq
   cd agent-hq
   npm install
   npm run deploy
   ```

2. Generate API token:
   ```bash
   npm run create-token
   ```

3. Add to repository secrets:
   ```bash
   gh secret set AGENT_HQ_TOKEN --body "agent-hq-token-here"
   gh secret set AGENT_HQ_URL --body "https://your-agent-hq.com"
   ```

4. Configure desktop agent(s) in Agent HQ:
   - Install Agent HQ desktop client on your development machine
   - Configure vault CLI, keychain access, file system paths
   - Register agent with Agent HQ server

---

## Troubleshooting

### Issue stuck on credentials-missing for > 24 hours

**Cause:** Automated agents cannot access the credentials.

**Solution:**
1. Check the routing comment for instructions
2. If Agent HQ is configured, verify the desktop agent is running
3. If using Doppler, verify credentials are in the correct project/config
4. If using manual GitHub secrets, add them via Settings → Secrets
5. Once all credentials are added, manually remove `credentials-missing` and add `credentials-ready`

### Agent HQ routing fails

**Cause:** Agent HQ token not configured or endpoint unreachable.

**Solution:**
1. Verify `AGENT_HQ_TOKEN` secret is set: `gh secret list`
2. Verify `AGENT_HQ_URL` is correct (or omit to use default)
3. Check Agent HQ server logs for errors
4. Test endpoint manually: `curl -H "Authorization: Bearer $TOKEN" https://agent-hq-url/api/health`
5. If Agent HQ is not available, the workflow will fall back to Vault Agent routing

### Doppler sync fails with ❌

**Cause:** `ADMIN_GITHUB_TOKEN` missing or has insufficient scopes.

**Solution:**
1. Create a fine-grained PAT with `Administration: read and write` permission for the repository
2. Add as `ADMIN_GITHUB_TOKEN` secret: `gh secret set ADMIN_GITHUB_TOKEN --body "github_pat_..."`
3. Re-run the credential-gatekeeper workflow: Actions → Credential Gatekeeper → Run workflow

### Credentials in Doppler but not syncing

**Cause:** Secret name mismatch or `gatekeeper-sync.sh` not executable.

**Solution:**
1. Verify secret names match exactly (case-sensitive)
2. Verify `scripts/gatekeeper-sync.sh` exists and is executable
3. Check workflow logs for specific error messages
4. Manually run sync script locally to debug:
   ```bash
   DRY_RUN=1 scripts/gatekeeper-sync.sh \
     --secrets OPENROUTER_API_KEY,JULES_API_KEY \
     --repo midnghtsapphire/revvel-standards \
     --json
   ```

### Desktop agent cannot find credentials

**Cause:** Credentials not in expected locations or agent permissions insufficient.

**Solution:**
1. Verify credentials exist in one of:
   - HashiCorp Vault: `vault kv get revvel/apps/...`
   - macOS Keychain: `security find-generic-password -s "credential-name"`
   - BITO CLI: `bito secret list`
   - Environment files: Check `.env.local`, `~/.env`, etc.
2. Verify desktop agent has appropriate file system and keychain access permissions
3. Check desktop agent logs for permission errors
4. If credentials are in an unexpected location, update Agent HQ configuration to include that path

---

## Related Workflows

| Workflow | Purpose | Trigger |
|---|---|---|
| `credential-gatekeeper.yml` | Detects credential requirements, applies labels | Issue opened/labeled `ready-to-implement` |
| `credential-label-router.yml` | Routes to appropriate agent, handles escalation | `credentials-missing` label added, hourly cron |
| `doppler-secrets-sync.yml` | Syncs all Doppler secrets to GitHub (bulk) | Manual, scheduled |
| `openrouter-triage.yml` | AI-powered triage and routing | Issue/PR opened |
| `ralph-loop.yml` | Self-healing for CI failures | CI fails |

---

## Skills & Standards

- **Skill:** `skills/vault-agent/SKILL.md` — Vault Agent provisioning instructions
- **Standard:** `docs/Master_Inventory/VAULT_AGENT_STANDARD.md` — Credential provisioning standard
- **Standard:** `standards/CREDENTIAL_AUDIT_SYSTEM.md` — Credential audit and rotation
- **Standard:** `standards/GATEKEEPER.md` — Gatekeeper system overview
- **Doc:** `docs/SECRETS_MANAGEMENT.md` — Comprehensive secrets management guide

---

## Examples

### Example 1: OpenRouter API Key Required

**Issue body includes:** `"AI-powered triage using OpenRouter"`

**Workflow:**
1. Credential Gatekeeper detects `openrouter` keyword
2. Adds BOM comment: "OPENROUTER_API_KEY required"
3. Applies `credentials-missing` label
4. Credential Label Router triggers
5. Routes to Agent HQ (if available) or posts Vault Agent instructions
6. Desktop agent retrieves from local vault: `vault kv get revvel/apps/revvel-standards/prod/openrouter`
7. Provisions to Doppler: `doppler secrets set OPENROUTER_API_KEY --value "sk-or-v1-..."`
8. Gatekeeper auto-syncs to GitHub: `gh secret set OPENROUTER_API_KEY`
9. Labels updated: `-credentials-missing +credentials-ready`
10. Implementation proceeds

### Example 2: Multiple Services Required

**Issue body includes:** `"Deploy to Vercel with Stripe payments and Supabase database"`

**Workflow:**
1. Credential Gatekeeper detects 3 services
2. BOM comment lists:
   - `VERCEL_TOKEN`
   - `STRIPE_SECRET_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Applies `credentials-missing` label
4. Routes to desktop agent or posts manual instructions
5. Developer provisions via Doppler:
   ```bash
   doppler secrets set VERCEL_TOKEN --value "..."
   doppler secrets set STRIPE_SECRET_KEY --value "sk_live_..."
   doppler secrets set SUPABASE_SERVICE_ROLE_KEY --value "..."
   ```
6. Gatekeeper syncs all 3 to GitHub
7. Success comment shows ✅ for all 3
8. Labels updated: `-credentials-missing +credentials-ready`

### Example 3: Stale Routing (24+ hours)

**Issue remains on credentials-missing for 25 hours**

**Workflow:**
1. Hourly cron sweep detects stale issue
2. Triggers escalation job
3. Applies `needs-human` label
4. Posts escalation comment explaining:
   - Why automation couldn't provision
   - What manual steps are needed
   - How to improve automation for next time
5. Human provisions credentials manually
6. Human updates labels: `-credentials-missing +credentials-ready`

---

## Testing

### Manual Test: Credential Detection

```bash
# Create a test issue
gh issue create \
  --title "Test: OpenRouter Integration" \
  --body "Implement AI-powered code review using OpenRouter API" \
  --label "ready-to-implement"

# Expected:
# 1. Credential Gatekeeper runs
# 2. Detects OPENROUTER_API_KEY requirement
# 3. Posts BOM comment
# 4. Applies credentials-missing label
# 5. Credential Label Router triggers
# 6. Posts routing comment
```

### Manual Test: Agent HQ Routing

```bash
# Prerequisites: AGENT_HQ_TOKEN configured

# Create test issue
gh issue create \
  --title "Test: Agent HQ Credential Routing" \
  --body "Requires OpenRouter API key for testing" \
  --label "credentials-missing"

# Expected:
# 1. Credential Label Router triggers
# 2. Calls Agent HQ API
# 3. Applies agent-hq and desktop-access-required labels
# 4. Posts Agent HQ routing comment
# 5. Desktop agent provisions within 5-15 minutes
# 6. Labels updated automatically
```

### Manual Test: Stale Detection

```bash
# Create old test issue (backdated simulation not possible, so wait 24h)
gh issue create \
  --title "Test: Stale Credential Detection" \
  --body "Test issue for stale detection" \
  --label "credentials-missing"

# Wait 24+ hours, then trigger cron:
gh workflow run credential-label-router.yml

# Expected:
# 1. Sweep job finds stale issue
# 2. Applies needs-human label
# 3. Posts escalation comment
```

---

## Future Enhancements

### Planned

- [ ] **Flexina Integration** — Direct routing to Flexina desktop automation agent
- [ ] **1Password CLI Support** — Auto-retrieve from 1Password vaults
- [ ] **AWS Secrets Manager** — Support for AWS SSM Parameter Store
- [ ] **Azure Key Vault** — Support for Azure Key Vault
- [ ] **Credential Rotation** — Automated rotation reminders and workflows
- [ ] **Credential Audit Trail** — Track who provisioned what when
- [ ] **Slack Notifications** — Alert team when credentials-missing escalates

### Considered

- **BITO CLI Integration** — Auto-retrieve via `bito secret get` (may be redundant with Agent HQ)
- **Google Secret Manager** — Support for GCP secrets (low priority, Doppler preferred)
- **Manual Credential Wiring UI** — Web UI for non-CLI users (out of scope)

---

## Contributing

When adding support for a new credential source:

1. Add detection pattern to `credential-gatekeeper.yml` in the `CREDENTIAL_PATTERNS` array
2. Update routing logic in `credential-label-router.yml` if special handling needed
3. Document the new source in this file under "Provisioning Options"
4. Add example to "Examples" section
5. Update test cases
6. Submit PR with all changes

---

## Change Log

| Date | Change | PR |
|---|---|---|
| 2026-05-01 | Initial implementation — automated credential routing | #TBD |

---

**Maintainer:** @midnghtsapphire  
**Status:** Active  
**Version:** 1.0.0
