# Automatic Bootstrap Workflow

> Runs on new repo creation → provisions secrets, health checks, and error handling

## TL;DR

This workflow automatically bootstraps every new repository in the org with:
- ✅ `.env.example` synced from revvel-standards
- ✅ Secrets health check scheduled
- ✅ Error handling fail-safe (WR/PF creation on failure)

## Trigger

| Event | Description |
|-------|-------------|
| `workflow_dispatch` | Manual bootstrap for a target repository |
| `schedule` | Weekly verification (`cron: 0 2 * * 0`) |

## What It Does

### 1. Sync Secrets Template
```bash
node scripts/sync-secrets.js --repo=${{ github.event.repository.full_name }}
```
→ Updates `.env.example` with all required API keys from `docs/SECRETS_MANAGEMENT.md`

### 2. Secrets Health Check
```bash
gh workflow run secrets-health-check.yml
```
→ Verifies required secrets are configured

### 3. Error Handling Fail-Safe

Every workflow should have this pattern:

```yaml
jobs:
  job_name:
    name: Do Something
    runs-on: ubuntu-latest
    steps:
      - name: Run task
        id: run_task
        run: |
          your-command || { 
            echo "::warning::Task failed - creating WR"
            gh issue create \
              --title "[WR] Task failed in ${{ github.repository }}" \
              --body "Automated issue: Task failed. See logs."
          }
```

**Required for EVERY workflow:**
- Always wrap risky commands in `|| {}` blocks
- Use `if: always()` to continue even on failure
- Create WR (Work Request) issue when automation fails

## Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `WR` | Work Request | Issue created, needs human |
| `PF` | Partial Failure | Some work done, needs review |
| `BLOCKED` | Cannot proceed | Missing required secret/config |

## Secrets to Validate

| Secret | Used By | Critical? |
|--------|--------|----------|
| `OPENROUTER_API_KEY` | AI routing | Yes |
| `VERCEL_TOKEN` | Deployments | No |
| `STRIPE_*` | Payments | Yes |

> See `docs/SECRETS_MANAGEMENT.md` for full list

## Run Manually

```bash
gh workflow run auto-bootstrap.yml
```

## Verification

After bootstrap, verify:
```bash
gh run list --repo owner/repo --limit 5
grep "^WR\|^PF" issue-list
```

---

*Part of Revvel Standards — Auto-Healing Automation*
*Updated: 2026-05-07*

## Vercel Deployment Automation

Every new project with a web frontend should have Vercel deployment automated:

### Verified GitHub Actions (from Marketplace)

| Action | Use For | Stars | Link |
|--------|--------|------|------|
| `amondnet/vercel-action@v25` | Production deploys | 1k+ | [vercel-action](https://github.com/marketplace/vercel-action) |
| `zentered/vercel-preview-url@v7` | PR preview URLs | 2k+ | [vercel-preview-url](https://github.com/marketplace/vercel-preview-url) |
| `styfle/cancel-workflow-action@0.12.1` | Cancel stale deploys | 500+ | [cancel-workflow-action](https://github.com/marketplace/actions/cancel-workflow-action) |

### Marketplace Search Terms (not `uses:` IDs)

| Search Term | Use For | Marketplace Link |
|------------|---------|------------------|
| `vercel deploy comment` | PR comments | [Search](https://github.com/marketplace?query=vercel+deploy+comment) |
| `vercel wait` | Wait for deploy | [Search](https://github.com/marketplace?query=vercel+wait) |
| `vercel env` | Sync env vars | [Search](https://github.com/marketplace?query=vercel+env) |

### Popular Actions to Search First

> Search <https://github.com/marketplace> when starting any new automation:
> - Use verified actions with 100+ stars
> - Check last commit date (should be < 6 months ago)
> - Prefer actions with `vX` tags (stable versions)

### Additional Popular Actions for Web Projects

| Action | Use For | Stars |
|--------|--------|-------|
| `vercel/pkg` | Binary builds | 5k+ |
| `turborepo-setup` | Remote caching | 3k+ |
| `actions/cache` | Build caching | Built-in |

### Required Workflow: `.github/workflows/deploy.yml`

```yaml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Required Secrets for All Web Projects

| Secret | Required? | Where |
|--------|----------|-------|
| `VERCEL_TOKEN` | Yes | vercel.com/account/tokens |
| `VERCEL_ORG_ID` | Yes | Project settings |
| `VERCEL_PROJECT_ID` | Yes | Project settings |

### Auto-Deploy Pattern

```bash
# In revvel-standards, add to all new repos:
node scripts/deploy-vercel.js --repo=owner/repo
```

### Error Handling

```yaml
- name: Deploy
  id: deploy
  uses: amondnet/vercel-action@v25
  with: ...
  
- name: Create WR on failure
  if: failure()
  run: gh issue create --title "[WR] Deploy failed" ...
```
