# Secrets Management — Workflow ↔ Secret Matrix

> **Last audited:** 2026-04-26
> **Source:** Gap analysis session ([link](https://app.devin.ai/sessions/40f0ab04ae9b44459499712d0cc4dd2f))

This document maps every GitHub Actions workflow to the secrets it requires
(excluding `GITHUB_TOKEN`, which is auto-provided). Use this to verify
that all automations have the secrets they need to actually run.

## Secret Inventory

| Secret | Used By | Skip Guard? | Notes |
|---|---|---|---|
| `OPENROUTER_API_KEY` | ai-pr-review, ai-ci-failure-helper, ai-weekly-changelog, openrouter-triage, openrouter-coder, openrouter-instantiation-check, priority-router, proof-of-life, research-module, run-human-testing-api | Most have guards | Core LLM routing key — if missing, most AI features silently skip |
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
| `NAMECHEAP_API_KEY` | credential-gatekeeper (BOM detection only) | Yes | Namecheap API key for DNS automation; enable at Namecheap → Profile → API Access |

## Workflows Without Custom Secrets

These workflows only use `GITHUB_TOKEN` (auto-provided):

- `arsc-labels.yml`
- `auto-merge.yml`
- `close-linked-issue.yml`
- `commit-queue-monitor.yml`
- `compliance-watcher.yml`
- `create-issue-branch.yml`
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

[Doppler](https://doppler.com) is the recommended secrets management platform for
provisioning and syncing secrets across environments.

### Setup

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

1. Label an issue with `ready-to-implement`
2. The gatekeeper scans the issue text for keywords (openrouter, stripe, supabase, etc.)
3. Posts a comment with the required secrets and Doppler provisioning commands
4. Adds `credentials-missing` or `credentials-ready` label
5. Implementation should not begin until `credentials-ready` is applied
