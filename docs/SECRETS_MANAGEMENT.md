# Secrets Management — Workflow ↔ Secret Matrix

> **Last audited:** 2026-05-01
> **Source:** Gap analysis session ([link](https://app.devin.ai/sessions/40f0ab04ae9b44459499712d0cc4dd2f))
> **NEW:** 🛡️ Secret Persistence Guard now active — hourly monitoring & auto-recovery

This document maps every GitHub Actions workflow to the secrets it requires
(excluding `GITHUB_TOKEN`, which is auto-provided). Use this to verify
that all automations have the secrets they need to actually run.

## 🛡️ Secret Protection & Monitoring

**NEW as of 2026-05-01:** The repository now includes automated secret protection:

- ✅ **Secret Persistence Guard** (`.github/workflows/secret-persistence-guard.yml`)
  - Blocks deletion of critical secrets
  - Monitors availability every hour
  - Auto-recovers missing secrets from Doppler
  - Creates P0 issues when recovery fails

- ✅ **Protected Secrets** (cannot be deleted):
  - `OPENROUTER_API_KEY`
  - `DOPPLER_TOKEN`
  - `ADMIN_GITHUB_TOKEN`
  - `GITHUB_TOKEN`

- ✅ **Monitored Secrets** (checked hourly):
  - All protected secrets plus
  - `JULES_API_KEY`, `OPENAI_API_KEY`, `APP_ID`, `APP_PRIVATE_KEY`, `MABL_API_KEY`

See [SECRET_PERSISTENCE_AND_LABEL_AUTOMATION.md](SECRET_PERSISTENCE_AND_LABEL_AUTOMATION.md) for complete details.

## Secret Inventory

| Secret | Used By | Skip Guard? | Notes |
|---|---|---|---|
| `OPENROUTER_API_KEY` | ai-pr-review, ai-ci-failure-helper, ai-weekly-changelog, openrouter-triage, openrouter-coder, openrouter-instantiation-check, priority-router, proof-of-life, research-module, run-human-testing-api, eeat-trust-cron | Most have guards | Core LLM routing key — if missing, most AI features silently skip |
| `JULES_API_KEY` | jules-invoke, jules-feedback, jules-pr-comment, jules-pr-reviewer | Yes (all guarded) | Google Jules agent integration |
| `OPENAI_API_KEY` | panda-ops | Yes | PandaOps AI PR review |
| `RECURSE_ML_API_KEY` | recurse-ml | No guard | RecurseML code review — will fail if missing |
| `ADMIN_GITHUB_TOKEN` | fork-audit-bot, openrouter-instantiation-check, project-board-sync, ready-for-review, saml-sso-registration | Varies | Fine-grained PAT with elevated repo permissions |
| `READY_FOR_REVIEW_TOKEN` | ready-for-review | Yes | Fine-grained PAT for promoting drafts |
| `APP_ID` | mabl, research-module, run-human-testing-api | No guard | GitHub App ID for app-based auth |
| `APP_PRIVATE_KEY` | mabl, research-module, run-human-testing-api | No guard | GitHub App private key |
| `MABL_API_KEY` | mabl | No guard | mabl testing platform API key |
| `MIRROR_GIST_ID` | durability-mirror | Yes | Gist ID for durability mirror backup |
| `MIRROR_GIST_TOKEN` | durability-mirror | Yes | PAT with gist scope for mirror |
| `DIGITALOCEAN_API_TOKEN` | deploy-oaudrey | Yes (skips with warning) | DO personal access token for App Platform deploys; create at DO → API → Tokens |
| `VERCEL_TOKEN` | deployment-health-check, Soul2Bowl CI (downstream) | Yes (health check degrades gracefully) | Vercel API token for deployment triggers and project access; create at vercel.com/account/tokens. Also add `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` (see `docs/Soul2Bowl/VERCEL_DEPLOYMENT.md`) |
| `NAMECHEAP_API_KEY` | credential-gatekeeper (BOM detection only) | Yes | Namecheap API key for DNS automation; enable at Namecheap → Profile → API Access |
| `GOOGLE_SEARCH_CONSOLE_KEY` | eeat-trust-cron | Yes (degrades gracefully) | Google Search Console API for E-E-A-T automation; create at Google Cloud Console |
| `GOOGLE_BUSINESS_PROFILE_KEY` | eeat-trust-cron | Yes (optional) | Google Business Profile API for E-E-A-T automation; create at Google Cloud Console |
| `LINKEDIN_ACCESS_TOKEN` | eeat-trust-cron | Yes (optional) | LinkedIn API access token for profile sync; optional E-E-A-T feature |
| `ORCID_API_KEY` | eeat-trust-cron | Yes (optional) | ORCID API key for publication sync; optional E-E-A-T feature |
| `REVENUECAT_PUBLIC_API_KEY_IOS` / `_ANDROID` / `_AMAZON` / `_WEB` | Downstream Revvel apps (not workflows in this repo) | N/A | Per-platform public SDK keys for RevenueCat; safe to ship in client bundles. Standard: [`standards/REVENUECAT.md`](../standards/REVENUECAT.md) |
| `REVENUECAT_SECRET_API_KEY` | Downstream Revvel app backends | N/A | Server-side RevenueCat REST key; **never** ship to clients |
| `REVENUECAT_WEBHOOK_AUTHORIZATION` | Downstream Revvel app backends | N/A | Shared secret verified on the `Authorization` header of inbound RevenueCat webhooks |
| `REVENUECAT_PROJECT_ID` | Downstream Revvel app tooling | N/A | RevenueCat project identifier required for v2 REST API calls |
| `GMAIL_APP_PASSWORD` | vine-to-marketplace | Yes (skips fetch with warning) | Gmail App Password for angelreporters@gmail.com IMAP access; generate at myaccount.google.com/apppasswords |
| `META_PAGE_ACCESS_TOKEN` | vine-to-marketplace | Yes (dry-run mode if missing) | Facebook Page Access Token with pages_manage_posts scope; generate via Graph API Explorer |
| `META_PAGE_ID` | vine-to-marketplace | Yes (dry-run mode if missing) | Facebook Page numeric ID; find at facebook.com/YOUR_PAGE → About |
| `META_CATALOG_ID` | vine-to-marketplace | Yes (optional — Page Post used instead) | Facebook Commerce Manager Catalog ID; enables proper Marketplace product listings |

## Workflows Without Custom Secrets

These workflows only use `GITHUB_TOKEN` (auto-provided):

- `arsc-labels.yml`
- `auto-merge.yml`
- `close-linked-issue.yml`
- `commit-queue-monitor.yml`
- `compliance-watcher.yml`
- `create-issue-branch.yml`
- `deployment-health-check.yml`
- `flow-chart-sync.yml`
- `match-labels.yml`
- `mergify-merge-queue-labels-copier.yml`
- `migration-cron.yml`
- `ralph-loop.yml`
- `stale-branch-cleanup.yml`
- `sync-labels.yml`
- `triage-cron.yml`

## Workflows Missing Skip Guards

These workflows will **fail hard** if their secrets are not configured
(no graceful "skip if not set" check):

| Workflow | Missing Guard For |
|---|---|
| `mabl.yml` | `APP_ID`, `APP_PRIVATE_KEY`, `MABL_API_KEY` |
| `openrouter-coder.yml` | `OPENROUTER_API_KEY` |
| `openrouter-instantiation-check.yml` | `OPENROUTER_API_KEY` |
| `recurse-ml.yml` | `RECURSE_ML_API_KEY` |
| `research-module.yml` | `APP_ID`, `APP_PRIVATE_KEY`, `OPENROUTER_API_KEY` |
| `run-human-testing-api.yml` | `APP_ID`, `APP_PRIVATE_KEY`, `OPENROUTER_API_KEY` |

**Recommendation:** Add skip guards to these workflows so they degrade
gracefully instead of failing CI when secrets aren't configured.

## How to Verify

Run the **Secrets Health Check** workflow (`.github/workflows/secrets-health-check.yml`)
manually via `workflow_dispatch`. It reports which secrets are configured vs. missing
without exposing any values.

---

## Doppler Integration

> **NOTE:** Doppler integration is **OPTIONAL**. Core repository functionality works without Doppler.
> Secrets can be managed directly in GitHub Settings → Secrets and variables → Actions.
> Doppler provides centralized management if you prefer it, but is not required.
> Doppler-specific workflows (e.g., "Doppler Secrets Sync") will not run without a valid `DOPPLER_TOKEN`.

[Doppler](https://doppler.com) is the recommended (but optional) secrets management platform for
provisioning and syncing secrets across environments. **You must acquire credentials independently** —
sign up at doppler.com and create your own account.

### Setup (Optional)

1. **Create a Doppler project** for `revvel-standards` at [dashboard.doppler.com](https://dashboard.doppler.com)
2. **Create a "github" environment** (Options → Create Environment → name it `github`)
3. **Add your secrets** in the Doppler dashboard for the `github` environment
4. **Generate a service token**: Project Settings → Service Tokens → Generate → scope to `github` config
5. **Add the service token to GitHub**: Repo Settings → Secrets and variables → Actions → `DOPPLER_TOKEN`

### Installed GitHub Actions (from Doppler Marketplace)

These official Doppler actions are already installed on this repo:

| Action | What it does |
|---|---|
| **`dopplerhq/secrets-fetch-action@v2`** | Injects all Doppler secrets as masked env vars — **use this in most workflows** |
| **`dopplerhq/cli-action@v3`** | Installs the Doppler CLI into `PATH` |

### Verifying Doppler Connection

Run the **Doppler Secrets Sync** workflow (Actions → "Doppler Secrets Sync" → Run)
to verify connectivity and list all available secrets.

### Using Doppler in Workflows

**Option 1 — Environment Loader (recommended):** Injects all secrets as masked env vars.

```yaml
- name: Fetch secrets from Doppler
  uses: dopplerhq/secrets-fetch-action@v2
  with:
    doppler-token: ${{ secrets.DOPPLER_TOKEN }}

- name: Use secrets (they're now env vars)
  run: |
    echo "OpenRouter key is set: ${OPENROUTER_API_KEY:+yes}"
```

**Option 2 — CLI (for `doppler run`):** Wraps a command with all secrets injected.

```yaml
- name: Install Doppler CLI
  uses: dopplerhq/cli-action@v3

- name: Run with Doppler secrets
  env:
    DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN }}
  run: doppler run -- your-command-here
```

### Local Development

```bash
# Install Doppler CLI
curl -Ls https://cli.doppler.com/install.sh | sh

# Login and select project
doppler login
doppler setup    # select revvel-standards → dev

# Run commands with secrets injected
doppler run -- npm start
doppler run -- node scripts/check-compliance.js .

# View configured secrets (names only)
doppler secrets --only-names
```

### Credential Gatekeeper

The **Credential Gatekeeper** workflow (`.github/workflows/credential-gatekeeper.yml`)
scans issue bodies for credential requirements and generates a Bill of Materials:

### How It Works

1. Issue opened or labeled `ready-to-implement`
2. Scans issue title + body for credential keywords (see patterns below)
3. Checks Doppler (if `DOPPLER_TOKEN` is set) for existing credentials
4. Posts a BOM comment listing required credentials with status table
5. Adds `credentials-missing` or `credentials-ready` label
6. If credentials-missing, **automatically routes to agents with desktop access**:
   - Agent HQ desktop agent (if configured) — **automatic provisioning**
   - Vault Agent — **posts manual provisioning instructions**
   - After 24 hours — **escalates to needs-human**
7. Implementation should not begin until `credentials-ready` is applied

**For full details on automatic credential routing, see [`docs/CREDENTIAL_ROUTING_PROCESS.md`](./CREDENTIAL_ROUTING_PROCESS.md).**
