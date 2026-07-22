# Test Environments Standard

**Version:** 1.0.0
**Date:** April 15, 2026
**Status:** Mandatory Policy
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Introduction

This standard defines the **four-stage test environment pipeline** used by all Revvel and MIDNGHTSAPPHIRE projects. It names the test harness, specifies what runs in each environment, how to deploy to each stage, and how to graduate code from development to production.

The test harness used across all Revvel applications is the **S.H.I.F.T. framework** — *Self-Healing Intent-Focused Tasks* — described fully in `templates/agent-handoff/SHIFT_TESTING_STANDARD.md`.

---

## 2. The Four-Stage Pipeline

```text
┌─────────────────────────────────────────────────────────────┐
│                  Revvel Test Pipeline                        │
│                                                             │
│  [dev]  →  [staging]  →  [live-test]  →  [production]      │
│   Local    midnghtsapphire   oaudrey      Freedom Angel    │
│   machine  GitHub Actions   subdomain      Corps / DO       │
└─────────────────────────────────────────────────────────────┘
```

| Stage | Name | Host | URL Pattern | Who Can Access |
|---|---|---|---|---|
| 1 | **dev** | Local machine | `http://localhost:3000` | Developer only |
| 2 | **staging** | GitHub Actions + Pages | `https://midnghtsapphire.github.io/<repo>` or private deploy | Team only (private repo) |
| 3 | **live-test** | oaudrey subdomain | `https://<app>.oaudrey.com` | Invited testers only |
| 4 | **production** | Freedom Angel Corps / DigitalOcean | `https://<app>.com` | End users |

---

## 3. Stage 1 — dev (Local Development)

### Purpose

Rapid iteration. All feature development happens here before any code is pushed.

### Requirements

- Run `npm run dev` (Vite dev server) or equivalent.
- Unit tests run locally via `npx vitest`.
- S.H.I.F.T. behavioral tests run locally via `npx playwright test`.
- No real API keys in local `.env` — use sandbox/test keys only.
- MSW (Mock Service Worker) intercepts all external HTTP requests in tests.

### Local Test Commands

```bash
# Unit + integration tests
npx vitest run

# E2E tests (Playwright)
npx playwright test

# Coverage report
npx vitest run --coverage

# TypeScript check
npx tsc --noEmit
```

### Graduate to Staging When

- [ ] All unit tests pass (`vitest run`)
- [ ] All E2E tests pass (`playwright test`)
- [ ] TypeScript check passes (`tsc --noEmit`)
- [ ] Coverage meets thresholds (80% statements, 75% branches, 80% functions, 80% lines)
- [ ] No hardcoded secrets in code
- [ ] PR opened and passing CodeRabbit review

---

## 4. Stage 2 — staging (midnghtsapphire / GitHub Actions)

### Purpose

Automated CI gate. Every push to `main` (or the designated staging branch) triggers the full test suite and a preview deployment via GitHub Actions. This is the first time the code runs in a cloud environment.

### GitHub Actions Workflow

Every Revvel repository must include a staging workflow. Copy from `templates/cicd/`:

```yaml
# .github/workflows/staging.yml
name: Staging Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Run unit + integration tests
        run: npx vitest run --coverage

      - name: Run E2E tests (Playwright)
        run: npx playwright test
        env:
          BASE_URL: http://localhost:3000

      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          configPath: './lighthouserc.json'

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Build
        run: npm run build
        env:
          NODE_ENV: production

      - name: Deploy to GitHub Pages (staging preview)
        uses: actions/deploy-pages@v4
        # Or deploy to a staging slot on DigitalOcean
```

### GitHub Pages (Staging Preview)

For frontend applications, GitHub Pages provides a free zero-config staging URL:

1. Go to `Settings → Pages` in the repository.
2. Set **Source** to `GitHub Actions`.
3. The staging URL becomes: `https://midnghtsapphire.github.io/<repo-name>/`

> **Important:** Ensure the repository is **private**. GitHub Pages for private repositories requires GitHub Pro or higher. If the account is on the free tier, use a DigitalOcean staging app instead (see §4.1).

#### Adding a Jekyll Theme on GitHub Pages

If the repository uses Jekyll for Pages, add or update `_config.yml` in the repository root:

```yaml
title: My Site
theme: minima
```

Then commit and push. GitHub Pages will rebuild with the selected theme.

For a supported remote theme, add `remote_theme` and append `jekyll-remote-theme` to the existing `plugins:` list if one is already present:

```yaml
title: My Site
remote_theme: pages-themes/cayman@v0.2.0
plugins: # append to this list if plugins already exist; do not replace existing entries
  - jekyll-remote-theme
```

Use a theme supported by GitHub Pages to avoid build failures.

### Graduate to Live-Test When

- [ ] All CI checks pass on `main`
- [ ] Lighthouse CI scores meet thresholds (Performance ≥ 90, Accessibility ≥ 95)
- [ ] S.H.I.F.T. automated behavioral tests pass
- [ ] No critical TruffleHog findings
- [ ] Staging URL renders and loads correctly

---

## 5. Stage 3 — live-test (oaudrey subdomain)

### Purpose

Human acceptance testing against a live URL running production-equivalent configuration. This stage uses real (but sandbox) API credentials and mirrors the production environment as closely as possible.

**This is where the S.H.I.F.T. Human Testing API runs.**

### MANDATORY REQUIREMENT: oAudrey UI Deployment

All Revvel and MIDNGHTSAPPHIRE projects MUST have a user interface accessible via an `<app>.oaudrey.com` subdomain. The oAudrey UI enables Audrey Evans to test, review, and validate the application before production deployment. This requirement applies to:

- Web applications
- Mobile app web previews
- API documentation interfaces
- Admin panels and dashboards
- Any user-facing interface

Without an oAudrey subdomain deployment, the project cannot graduate to production.

### Setup

1. Point a subdomain on `oaudrey.com` to a DigitalOcean droplet or App Platform instance.
2. Configure the subdomain: `<app>.oaudrey.com` (e.g., `growlingeyes.oaudrey.com`).
3. Use Let's Encrypt (Certbot) or DigitalOcean's managed TLS for HTTPS.
4. Protect the live-test URL with HTTP Basic Auth or Clerk's staging environment to prevent public access.

### Nginx Configuration (Password-Protected Subdomain)

```nginx
server {
    listen 443 ssl;
    server_name growlingeyes.oaudrey.com;

    ssl_certificate /etc/letsencrypt/live/oaudrey.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/oaudrey.com/privkey.pem;

    # Password-protect the live-test environment
    auth_basic "Live Test — Authorized Access Only";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Create .htpasswd file for basic auth
sudo htpasswd -c /etc/nginx/.htpasswd <tester-username>
```

### S.H.I.F.T. Human Testing API Run

Once the live-test URL is confirmed live, run the S.H.I.F.T. Human Testing API:

```bash
# Run from the revvel-standards repo
node scripts/run-human-testing-api.js \
  --url https://growlingeyes.oaudrey.com \
  --app GrowlingEyes \
  --scenarios all
```

This produces a full S.H.I.F.T. report covering:

- Functional correctness
- Accessibility (WCAG 2.2 AA)
- Performance (Lighthouse thresholds)
- Security posture
- Neuro-inclusive UX

### Graduate to Production When

- [ ] S.H.I.F.T. Human Testing API report: all agents PASS
- [ ] No P0 or P1 issues in S.H.I.F.T. report
- [ ] Performance: LCP < 2.5s, CLS < 0.1, Lighthouse Performance ≥ 90
- [ ] Accessibility: Lighthouse Accessibility ≥ 95, no critical WCAG failures
- [ ] All authentication flows tested end-to-end
- [ ] OWASP ZAP baseline scan passes (no critical findings)
- [ ] Stakeholder sign-off (Audrey Evans)

---

## 6. Stage 4 — production (Freedom Angel Corps / DigitalOcean)

### Purpose

The live, public-facing application serving real users. Deployed via the DigitalOcean App Platform (for standard apps) or a managed DigitalOcean Droplet with Nginx + PM2 (for custom deployments).

### Production Deployment

Production deployments follow the **Deploy Agent Model** defined in `DEPLOYMENT_STANDARD.md`. The deploy agent:

1. Pulls `main` after all S.H.I.F.T. live-test checks pass.
2. Runs TypeScript check, full test suite, and clean build.
3. Deploys to DigitalOcean (App Platform auto-deploy or manual `rsync` to Droplet).
4. Verifies the live URL responds with HTTP 200.
5. Creates a `DEPLOY_REPORT.md` with the deployment summary.

### DigitalOcean App Platform (Recommended for Most Apps)

```yaml
# .do/app.yaml
name: <app-name>
region: nyc

services:
  - name: web
    github:
      repo: freedom-angel-corps/<repo-name>
      branch: main
      deploy_on_push: true
    build_command: npm run build
    run_command: node dist/index.js
    environment_slug: node-js
    envs:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        scope: RUN_TIME
        type: SECRET
```

### DigitalOcean Droplet (Custom / Existing)

```bash
# Deploy script (run by deploy agent)
rsync -avz --delete dist/ deploy@<droplet-ip>:/var/www/<app-name>/dist/
ssh deploy@<droplet-ip> "pm2 restart <app-name> --update-env"
curl -sL https://<app-domain>.com | head -5
```

### Production Environment Variables

All production secrets are stored in **HashiCorp Vault** (see `VAULT_AGENT_STANDARD.md`). The DigitalOcean App Platform injects them at runtime via the App Platform's encrypted environment variable store.

**Never commit production `.env` files to any repository.**

### Freedom Angel Corps Migration (Long-Term)

As applications mature, migrate the repository ownership from `midnghtsapphire` to `freedom-angel-corps` following the process in `REPOSITORY_PRIVACY_MIGRATION_STANDARD.md §4`.

---

## 7. The S.H.I.F.T. Test Harness

### What Is S.H.I.F.T

**S.H.I.F.T.** stands for **Self-Healing Intent-Focused Tasks**. It is the Revvel test framework that goes beyond binary pass/fail checks to validate that software:

1. **Solves the user's actual intent** (not just executes code paths).
2. **Self-heals** across environments (handles API failures gracefully).
3. **Respects neurodivergent user needs** (cognitive load, sensory control, predictability).

The full S.H.I.F.T. specification is in `templates/agent-handoff/SHIFT_TESTING_STANDARD.md`.

### S.H.I.F.T. Test Agents

The `scripts/run-human-testing-api.js` script orchestrates five AI test agents:

| Agent | Role | Focus |
|---|---|---|
| `functional` | QA Tester | Journeys, happy paths, error handling |
| `accessibility` | WCAG Auditor | WCAG 2.2 AA, neuro-inclusive design |
| `performance` | Performance Engineer | Lighthouse CI, LCP, CLS, FID |
| `security` | Security Analyst | OWASP Top 10, header compliance |
| `ux` | UX Researcher | Usability, cognitive load, clarity |

A sixth **Synthesizer** agent aggregates all five reports into a single S.H.I.F.T. Verdict.

### S.H.I.F.T. Verdict Codes

| Code | Meaning | Action Required |
|---|---|---|
| `PASS` | All five agents pass | Graduate to next stage |
| `CONDITIONAL_PASS` | Minor issues, no blockers | Document and proceed |
| `FAIL` | One or more P0/P1 findings | Fix before graduating |
| `BLOCKED` | Unreachable URL or build failure | Fix deployment first |

### When to Run S.H.I.F.T

| Stage | Automated? | Manual? |
|---|---|---|
| dev | Optional (Playwright E2E) | Optional |
| staging | Yes (CI via GitHub Actions) | No |
| live-test | Yes (full S.H.I.F.T. Human Testing API) | Yes (stakeholder review) |
| production | Post-deploy smoke test only | Yes (for major releases) |

---

## 8. Environment Variables by Stage

| Variable | dev | staging | live-test | production |
|---|---|---|---|---|
| `NODE_ENV` | `development` | `test` | `staging` | `production` |
| `DATABASE_URL` | Local SQLite or dev DB | Test DB | Staging DB | Production DB (Vault) |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_test_...` | `sk_test_...` | `sk_live_...` (Vault) |
| `CLERK_SECRET_KEY` | Dev instance | CI instance | Staging instance | Production instance (Vault) |
| `BASE_URL` | `http://localhost:3000` | CI-provided | `https://<app>.oaudrey.com` | `https://<app>.com` |

---

## 9. Compliance Checklist (Per Stage)

### dev → staging

- [ ] `vitest run` passes
- [ ] `playwright test` passes
- [ ] `tsc --noEmit` passes
- [ ] Coverage ≥ thresholds
- [ ] PR review complete (CodeRabbit)

### staging → live-test

- [ ] All CI checks green on `main`
- [ ] Lighthouse CI scores meet thresholds
- [ ] TruffleHog scan: zero verified findings
- [ ] S.H.I.F.T. staging behavioral tests: PASS

### live-test → production

- [ ] S.H.I.F.T. Human Testing API report: all agents PASS or CONDITIONAL_PASS
- [ ] OWASP ZAP baseline: no critical findings
- [ ] Stakeholder sign-off
- [ ] Deploy report created

---

## 10. Related Standards

- `TESTING_STANDARD.md` — Unit, integration, and E2E test requirements
- `templates/agent-handoff/SHIFT_TESTING_STANDARD.md` — Full S.H.I.F.T. specification
- `DEPLOYMENT_STANDARD.md` — Deploy agent model and production deploy checklist
- `SECURITY_STANDARD.md` — Security requirements for all environments
- `REPOSITORY_PRIVACY_MIGRATION_STANDARD.md` — Repository privacy and FAC migration
- `INFRASTRUCTURE_MAP.md` — Infrastructure topology for all environments
