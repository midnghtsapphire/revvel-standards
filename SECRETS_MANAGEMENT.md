# Secrets Management — Workflow ↔ Secret Matrix

> **Last audited:** 2026-07-09
> **Source:** Doppler decommission (wr/pending/12-secrets-sanity.md, issue #15516)
> **Generated map:** see [`docs/SECRETS_MAP.md`](./SECRETS_MAP.md) — regenerated from the
> workflows themselves (`npm run secrets:map`), so it cannot drift. Prefer it over the
> hand-maintained tables below.

This document maps every GitHub Actions workflow to the secrets it requires
(excluding `GITHUB_TOKEN`, which is auto-provided). Use this to verify
that all automations have the secrets they need to actually run.

## ✍️ The ONE write path (read this first)

**GitHub Actions repository secrets are the single store.** Doppler is
decommissioned (owner decision 2026-07-08: "i dont want doppler"). To add or
update a secret there is exactly one way:

```bash
gh secret set NAME --repo midnghtsapphire/revvel-standards
# or: GitHub → repo Settings → Secrets and variables → Actions
```

Values additionally live in your desktop password manager (1Password/Bitwarden)
as the human-side backup — see [`skills/credential-clerk/`](../skills/credential-clerk/SKILL.md)
for the reconciliation skill. **No workflow may write, rotate, or delete
secrets automatically.** The sync/rotation/auto-heal workflows that used to do
this are disabled (headers in each file explain why):

- `doppler-secrets-sync.yml`, `sync-secrets-to-repos.yml` — Doppler sync, retired
- `secret-rotation-schedule.yml` — weekly auto-rotation, cron off for good
- `secret-persistence-guard.yml`, `secrets-sentinel.yml` — "auto-recovery" that
  restored stale Doppler values over good GitHub tokens, crons off
- `secret-lifecycle.yml`, `credential-gatekeeper.yml`,
  `gatekeeper-registry-drift.yml` — Doppler-backed lifecycle/provisioning,
  auto-triggers off (manual dispatch kept for history)

**Owner checklist to finish the decommission:**

1. In Doppler's dashboard, disconnect the **GitHub sync integration** (prime
   suspect for the daily secret deletions). Don't delete the project yet.
2. Copy any values still only in Doppler into GitHub Actions secrets.
3. Watch the presence ledger (`docs/secrets-ledger.json`) for 7 quiet days.
4. Then delete the six `DOPPLER_*` GitHub secrets and the Doppler account, and
   remove `DOPPLER_TOKEN` from the ledger `NAMES` list in
   `secrets-backup-daily.yml` **at the same time**.

## 🛡️ Secret Protection & Monitoring

- ✅ **Secrets Presence Ledger** (`.github/workflows/secrets-backup-daily.yml`)
  - Daily record of secret **presence + peppered fingerprint** (never values)
    in `docs/secrets-ledger.json`
  - Shows exactly WHEN a secret vanished or was rotated
  - Files one labeled `[SECRET-MISSING]` issue per disappearance

## Missing-secret preflight standard

Every workflow that needs a secret must degrade gracefully instead of failing
hard. Use the `wr-auto-classify.yml` preflight pattern:

```yaml
jobs:
  preflight:
    name: Preflight credential check
    runs-on: ubuntu-latest
    outputs:
      has_key: ${{ steps.check.outputs.has_key }}
    steps:
      - name: Probe credentials
        id: check
        env:
          THE_KEY: ${{ secrets.THE_KEY }}
        run: |
          if [ -n "${THE_KEY}" ]; then
            echo "has_key=true" >> "$GITHUB_OUTPUT"
          else
            echo "has_key=false" >> "$GITHUB_OUTPUT"
            echo "::warning::THE_KEY is not configured — job will be skipped. See docs/SECRETS_MAP.md."
          fi

  main:
    needs: preflight
    if: needs.preflight.outputs.has_key == 'true'
    # ... the real work ...
```

Rules:

- **Probe in a dedicated job step via `env:`** — never interpolate
  `${{ secrets.X }}` into `if:` on the job itself (secrets aren't available
  in job-level `if:`).
- **Skip, don't fail** — a missing key emits a `::warning::` and skips.
- **One labeled issue, not spam** — persistent absence is detected by the
  presence ledger, which files a single `[SECRET-MISSING]` issue; preflights
  must not open their own duplicates.
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
| `GMAIL_APP_PASSWORD` | vine-to-marketplace | Yes (skips fetch with warning) | Gmail App Password for `angelreporters@gmail.com` IMAP access; generate at myaccount.google.com/apppasswords |
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

## Doppler Integration (DECOMMISSIONED 2026-07-09)

> **Doppler is out** (owner decision, issue #15516; findings in
> `wr/pending/12-secrets-sanity.md`). Its GitHub sync integration was the prime
> suspect for the daily secret deletions — it removes repo secrets not present
> in the Doppler config. GitHub Actions secrets are now the single store (see
> "The ONE write path" above). The six token names (`DOPPLER_TOKEN`,
> `DOPPLER_AGENT_TOKEN`, `DOPPLER_LOCAL_TOKEN`, `DOPPLER_API_KEY`,
> `DOPPLER_AGENT_ODIC`, `DOPPLER_CIRCLECI_OIDC`) collapse to **zero** once the
> presence ledger shows 7 quiet days. Doppler-backed workflows are disabled,
> not deleted — each file's header explains its retirement.

### Credential Gatekeeper

> **Manual dispatch only since 2026-07-09** — its auto-provision job wrote
> secrets from Doppler/backup sources; the issue trigger is disabled as part of
> the Doppler decommission. Retire-vs-refactor is the owner's call.

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
