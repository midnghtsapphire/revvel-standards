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
| `repository.created` | When a new repo is created in the org |
| `workflow_dispatch` | Manual Bootstrap (for repos created before this workflow) |
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
              --title "[WR] Task failed in ${{ github.repo }}" \
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