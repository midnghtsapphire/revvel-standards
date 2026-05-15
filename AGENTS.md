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
- `docs/SECRETS_MANAGEMENT.md` — **SOURCE OF TRUTH** for all API keys
- `.env.example` — Variable templates
- `doppler-secrets-sync.yml` — Sync to any repo

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

## Cursor Cloud specific instructions

### Repository structure

This is a monorepo containing standards/docs at root level plus multiple independent products under `products/`. The root `package.json` has only devDependencies for `markdownlint-cli2` and `yaml`.

### Node.js products (Next.js apps under `products/`)

| Product | Port | Notes |
|---------|------|-------|
| `products/music-video-creator` | 3000 | Next.js 14, has API routes (`/api/video`, `/api/orchestrate`) |
| `products/affiliate-hub` | 3001 | Next.js 15, requires `npm install --legacy-peer-deps` due to eslint-config-next peer conflict |
| `products/ai-video-toolkit` | 3002 | Next.js 15 |
| `products/screen-recorder-finder` | 3003 | Next.js 15 |

### Running and testing

- **Root lint:** `npm run lint` (runs markdownlint on all `*.md` files; many pre-existing warnings exist)
- **Root tests:** `npm test` (runs 18 test scripts sequentially; 6 known failures from malformed workflow YAML files `api-rate-limit-handler.yml` and `jules-coding-agent.yml`)
- **Product dev servers:** `npm run dev` in each product directory
- **Product builds:** `npm run build` in each product directory. Note: Music Video Creator has a pre-existing ESLint error (`@typescript-eslint/no-require-imports` in `src/app/api/video/route.ts`); use `npx next build --no-lint` to bypass if needed
- **Product lint:** `npm run lint` in each product directory

### Gotchas

- The `affiliate-hub` product has a peer dependency conflict between `eslint@^8` and `eslint-config-next@16.2.6` (which requires `eslint>=9`). Always use `npm install --legacy-peer-deps` for that product.
- Music Video Creator API routes require external API keys (`OPENROUTER_API_KEY`, `HEYGEN_API_KEY`, `LUMA_API_KEY`) to function fully. Without them, the app runs in "backend wiring pending" mode.
- No Docker services are required for basic development of the Next.js products.

---

*Updated: 2026-05-15*
*Location: Always check this file first*