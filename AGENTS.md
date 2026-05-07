# Revvel Standards — Agent Guide

> **ALWAYS LOOK HERE FIRST** before starting any new project, automation, or integration.

## Quick Start

```bash
# 1. Bootstrap new repo:
node scripts/sync-secrets.js --repo=owner/repo
node scripts/deploy-vercel.js --repo=owner/repo

# 2. Run automation doctor:
npm run automation:doctor

# 3. Validate workflows:
npm run workflows:validate
```

## Where to Look First

### For Standards & Templates
- `standards/*.md` — All automation standards
- `templates/` — Reusable templates

### For Secrets & API Keys
- `docs/SECRETS_MATRIX.md` — **SSOT: ALWAYS LOOK HERE FIRST**
- `docs/SECRETS_MANAGEMENT.md` — Workflow secret mapping
- `docs/Soul2Bowl/IMAGE_GENERATION.md` - Image generation APIs

### For GitHub Actions
- `.github/workflows/` — All workflows
- **Always search marketplace first:** https://github.com/marketplace
  - Use verified actions with 100+ stars
  - Check last commit date (< 6 months)
  - Prefer `vX` tags

### For Deployment
- `vercel.com` — Import repo there
- `docs/VERCEL_DEPLOYMENT.md` — Vercel setup docs
- Workflow: `deploy.yml` (auto-generated)

### For Error Handling
- **Every workflow MUST have error handling:**
```yaml
- name: Run task
  run: |
    your-command || {
      echo "::warning::Task failed - creating WR"
      gh issue create --title "[WR] Task failed" ...
    }
```

### For Issues & Automation
- Wr (Work Request) — needs human
- Wr:checking — in progress
- Wr:check-failed — automation failed

## Key Scripts

| Script | Purpose |
|--------|---------|
| `scripts/sync-secrets.js` | Sync API keys to target repos |
| `scripts/deploy-vercel.js` | Setup Vercel deploy workflow |
| `scripts/automation-doctor.js` | Validate workflows & find stuck issues |
| `npm run automation:doctor` | Run diagnostics |
| `npm run workflows:validate` | Validate YAML |

## Common Patterns

### New Web Project
1. Add secrets: `scripts/sync-secrets.js --repo=...`
2. Add deploy: `scripts/deploy-vercel.js --repo=...`
3. Run automation doctor

### New GitHub Action
1. Search https://github.com/marketplace
2. Use action with 100+ stars, `vX` tag
3. Add error handling (`|| {}` + WR on fail)

### Sync Secrets to Repo
```bash
gh workflow run sync-secrets-to-repos.yml -f target_repo=owner/repo
```

---

*Updated: 2026-05-07*
*Location: Always check this file first*