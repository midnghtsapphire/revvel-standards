# Revvel CI/CD Templates

These are the **mandatory** CI/CD templates for every Revvel/MIDNGHTSAPPHIRE application deployed to a DigitalOcean Droplet. Copy these into every new app repo from day one — no exceptions.

---

## Files in This Directory

| File | Purpose | Where It Goes in Your App Repo |
|---|---|---|
| `deploy.yml` | GitHub Actions workflow — auto-deploys on every push to `main`; **includes DeployBot tracking** | `.github/workflows/deploy.yml` |
| `deploy.sh` | Manual one-click deploy script for local use | `deploy.sh` (repo root) |
| `monitor.yml` | Uptime/health-check monitoring workflow | `.github/workflows/monitor.yml` |
| `ci.yml` | Universal CI — TypeScript check, Vitest unit tests, Playwright E2E | `.github/workflows/ci.yml` |
| `commit-queue-monitor.yml` | Commit Queue Monitor — alerts when merge queue backlog exceeds threshold | `.github/workflows/commit-queue-monitor.yml` |
| `auto-fix.yml` | Auto-fix loop — creates GitHub Issue + Copilot instructions on CI failure | `.github/workflows/auto-fix.yml` |
| `security.yml` | Security scanning — `pnpm audit` + TruffleHog secret scan | `.github/workflows/security.yml` |
| `panda-ops.yml` | PandaOps AI PR Review — posts inline OpenAI-powered feedback on every PR | `.github/workflows/panda-ops.yml` |
| `ready-for-review.yml` | Ready for Review Automation — auto-promotes draft PRs, labels linked issues, posts review checklist | `.github/workflows/ready-for-review.yml` |
| `mergify-merge-queue-labels-copier.yml` | Mergify Merge-Queue Labels Copier — copies labels from source PRs to Mergify merge-queue PRs | `.github/workflows/mergify-merge-queue-labels-copier.yml` |
| `dependabot.yml` | Dependabot configuration — automated dependency and security updates | `.github/dependabot.yml` |
| `deploy-android.yml` | Manual PWA → Play Store scaffold (inactive until Google Play account) | `.github/workflows/deploy-android.yml` |
| `deploy-ios.yml` | Manual PWA → App Store scaffold (inactive until Apple Developer account) | `.github/workflows/deploy-ios.yml` |
| `labels-as-parameters.yml` | Converts PR labels (`key:value`) into named step outputs for conditional deploys and feature flags | `.github/workflows/labels-as-parameters.yml` |
| `eisenhower.yml` | Eisenhower Priority Labeler — auto-assigns `P1`–`P4` labels to issues using the Eisenhower Matrix (Impact × Urgency) | `.github/workflows/eisenhower.yml` |
| `eisenhower-issue-template.yml` | Companion issue form with required `Impact` / `Urgency` dropdowns, consumed by `eisenhower.yml` | `.github/ISSUE_TEMPLATE/prioritized-issue.yml` |
| `ai-weekly-changelog.yml` | Weekly AI-generated `CHANGELOG.md` via OpenRouter ([`fridzema/ai-weekly-changelog-action`](https://github.com/fridzema/ai-weekly-changelog-action)) | `.github/workflows/ai-weekly-changelog.yml` |
| `ai-pr-review-openrouter.yml` | Per-PR diff analysis posted as a sticky comment ([`maxlim0/AI-PR-Reviewer`](https://github.com/maxlim0/AI-PR-Reviewer)) | `.github/workflows/ai-pr-review-openrouter.yml` |
| `ai-readme-translator.yml` | GitPolyglot — translates `README.md` → `README.<lang>.md` via OpenRouter ([`aboutexo04/git-polyglot`](https://github.com/aboutexo04/git-polyglot)) | `.github/workflows/ai-readme-translator.yml` |
| `ai-ci-failure-helper.yml` | Post-failure AI root-cause analysis in a PR comment ([`maxlim0/actions-progci-fail`](https://github.com/maxlim0/actions-progci-fail)) | `.github/workflows/ai-ci-failure-helper.yml` |
| `circleci-openrouter.yml` | CircleCI equivalent of AI CI failure analysis (calls OpenRouter directly on CircleCI `when: on_fail`) | `.circleci/config.yml` |
| `ai-code-reviewer-pro.yml` | Inline AI review comments on changed lines + summary ([`VIVAAN-DHAWAN/ai-code-reviewer`](https://github.com/VIVAAN-DHAWAN/ai-code-reviewer)) | `.github/workflows/ai-code-reviewer-pro.yml` |
| `android-resource-translator.yml` | Android `strings.xml` missing-translation → auto-PR ([`duartebarbosadev/AndroidResourceTranslator`](https://github.com/duartebarbosadev/AndroidResourceTranslator)) | `.github/workflows/android-resource-translator.yml` |
| `mcp-server-evals.yml` | LLM-as-judge evaluations against an MCP server ([`mcp-use/eval-action`](https://github.com/mcp-use/eval-action)) | `.github/workflows/mcp-server-evals.yml` |
| `gass-scoring.yml` | On-chain PR quality score via O2 Oracle ([`michael-bey/gass`](https://github.com/michael-bey/gass)) | `.github/workflows/gass-scoring.yml` |
| `iara-code-reviewer.yml` | Iara AI reviewer — bugs / SAST / performance ([`felipefernandes/iara`](https://github.com/felipefernandes/iara)) | `.github/workflows/iara-code-reviewer.yml` |
| `bc-ai-code-reviewer.yml` | Business Central AL-specific AI review ([`ACSG-BizApps/bc-ai-reviewer`](https://github.com/ACSG-BizApps/bc-ai-reviewer)) | `.github/workflows/bc-ai-code-reviewer.yml` |
| `xai-review-oleg-fork.yml` | Multi-mode AI review via OpenRouter — summary / inline / context / reply ([`HomeBake/ai-review`](https://github.com/HomeBake/ai-review), Marketplace [xai-review-oleg-fork](https://github.com/marketplace/actions/xai-review-oleg-fork)) | `.github/workflows/xai-review-oleg-fork.yml` |
| `google-cloud-identity-verify.yml` | Verify Google Cloud Identity / Workforce Identity Federation configuration (weekly + on-demand) | `.github/workflows/google-cloud-identity-verify.yml` |
| `get-saml-identity.yml` | Resolve GitHub username to SAML/SSO corporate email in CI/CD workflows | `.github/workflows/get-saml-identity.yml` |
| `hog-heaven-release-annotations.yml` | PostHog release annotations via Hog Heaven — marks releases on analytics charts ([`joggrdocs/hog-heaven`](https://github.com/joggrdocs/hog-heaven)) | `.github/workflows/hog-heaven-release-annotations.yml` |
| `posthog-annotations.yml` | PostHog annotations — marks PR merges, releases, deployments on analytics charts | `.github/workflows/posthog-annotations.yml` |
| `posthog-send-event.yml` | PostHog custom events — track CI/CD pipeline events (reusable workflow) | `.github/workflows/posthog-send-event.yml` |
| `posthog-upload-sourcemaps.yml` | PostHog source maps upload — enables readable error stack traces | `.github/workflows/posthog-upload-sourcemaps.yml` |
| `eco-ci-energy-estimation.yml` | Measures GitHub runner energy usage across checkout / install / test steps ([`green-coding-solutions/eco-ci-energy-estimation`](https://github.com/green-coding-solutions/eco-ci-energy-estimation)) | `.github/workflows/eco-ci-energy-estimation.yml` |
| `sustainable-npm.yml` | Applies low-overhead npm defaults to reduce install waste in Node CI ([`lowlydba/sustainable-npm`](https://github.com/lowlydba/sustainable-npm)) | `.github/workflows/sustainable-npm.yml` |
| `a11yguard.yml` | Accessibility regression / audit workflow for preview or production URLs ([`a11ywatch/github-actions`](https://github.com/a11ywatch/github-actions)) | `.github/workflows/a11yguard.yml` |
| `eco-infra-action.yml` | Uploads infra plan JSON to Eco Infra for emissions reporting ([`eco-infra/ecoinfra-action`](https://github.com/eco-infra/ecoinfra-action)) | `.github/workflows/eco-infra-action.yml` |
| `naukri-resume-action.yml` | Refreshes Naukri resumes from a self-hosted runner ([`Prateek-Wayne/naukri-resume-action`](https://github.com/Prateek-Wayne/naukri-resume-action)) | `.github/workflows/naukri-resume-action.yml` |
| `reno-auto.yml` | AI-generated reno release notes for new PRs via OpenAI ([`vblagoje/reno-auto`](https://github.com/vblagoje/reno-auto)) | `.github/workflows/reno-auto.yml` |
| `validate-tableau-format-xai.yml` | Validate Tableau `.twb`/`.tds` files against a JSON style guide ([`dsmdavid/action-test-tableau-format`](https://github.com/dsmdavid/action-test-tableau-format)) | `.github/workflows/validate-tableau-format-xai.yml` |
| `tableau/example_style_guide.json` | Example Tableau style guide consumed by `validate-tableau-format-xai.yml` | `style_guide/tableau_style_guide.json` |
| `xai-code-review.yml` | xAI Grok PR code review — advisory comments via Grok ([`tarmojussila/xai-code-review`](https://github.com/tarmojussila/xai-code-review)) | `.github/workflows/xai-code-review.yml` |

> **OpenRouter-backed actions.** The templates from `ai-weekly-changelog.yml` through 
> `bc-ai-code-reviewer.yml` all share the single `OPENROUTER_API_KEY` secret 
> (Vault path `revvel/shared/llm/openrouter`).
> See [`docs/OPENROUTER_MARKETPLACE_ACTIONS.md`](../../docs/OPENROUTER_MARKETPLACE_ACTIONS.md)
> for rollout steps, cost governance, and per-action extra secrets.
> **PostHog integrations.** The PostHog templates (`hog-heaven-release-annotations.yml`, 
> `posthog-annotations.yml`, `posthog-send-event.yml`, `posthog-upload-sourcemaps.yml`) 
> require `POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID`, and (for annotations/sourcemaps) 
> `POSTHOG_PERSONAL_API_KEY` secrets. See `skills/posthog/SKILL.md` and 
> `templates/standards/posthog-events.md` for setup instructions.
> **Eco/accessibility bundle.** The templates `eco-ci-energy-estimation.yml`,
> `sustainable-npm.yml`, `a11yguard.yml`, `eco-infra-action.yml`, and
> `naukri-resume-action.yml` are documented together in
> [`docs/ECO_MARKETPLACE_ACTIONS.md`](../../docs/ECO_MARKETPLACE_ACTIONS.md),
> including latest release pins, repo fit, and rollout caveats.
> **Tableau style validation.** `validate-tableau-format-xai.yml` plus
> `tableau/example_style_guide.json` are documented in
> [`docs/TABLEAU_FORMAT_XAI.md`](../../docs/TABLEAU_FORMAT_XAI.md). Template-only
> here — copy into product repos that ship Tableau workbooks.
> **xAI / Grok review.** `xai-code-review.yml` uses the existing `XAI_API_KEY`
> secret (Vault path `revvel/shared/llm/xai`). Soft-skips when the key is
> missing and is advisory-only (`continue-on-error`). See
> [`docs/XAI_CODE_REVIEW.md`](../../docs/XAI_CODE_REVIEW.md).

---

## DeployBot Integration

**[deploybot-app](https://deploybot.app/)** (developed by [@poseidon](https://github.com/poseidon)) is the Revvel standard for tracking GitHub Deployments across every repo and the organisation.

### How it works

The `deploy.yml` template uses the GitHub Deployments API to create a `pending` deployment record at the start of every run, then updates it to `success` or `failure` when the workflow finishes. DeployBot reads these records and surfaces a live deployment dashboard across all Revvel repos — **no extra configuration per project is needed** once the app is installed at the organisation level.

### What is automated

- **Create deployment (pending)** — at workflow start, via `chrnorm/deployment-action@v2`
- **Update to `success`** — when the full build + SSH deploy finishes cleanly
- **Update to `failure`** — on any workflow error, so failures are immediately visible in the DeployBot dashboard

### Organisation-level install (one time only)

DeployBot only needs to be installed once at the **midnghtsapphire** organisation level. Every repo that uses `deploy.yml` automatically appears in the dashboard.

```text
GitHub → github.com/apps/deploybot-app → Install → midnghtsapphire (All repositories)
```

### Placeholders to replace in `deploy.yml`

| Placeholder | Replace with |
|---|---|
| `YOUR_APP_NAME` | PM2 process name (e.g. `growlingeyes`) |
| `YOUR_DROPLET_IP` | Droplet IP address (e.g. `164.90.148.7`) |
| `YOUR_APP_DIR` | App directory on droplet (e.g. `growlingeyes`) |
| `YOUR_DOMAIN` | Production domain (e.g. `growlingeyes.com`) |

---

## PandaOps AI PR Review

**[PandaOps](https://github.com/omnedia/panda-ops)** (`omnedia/panda-ops`) is the Revvel standard for automated AI-powered pull request reviews. It uses OpenAI to post inline feedback and a summary comment on every PR.

### How it works

The `panda-ops.yml` workflow runs on every `pull_request` (opened, synchronize, reopened), fetches the PR diff, and uses OpenAI to produce actionable feedback directly in the GitHub PR interface — before any human review takes place.

### What is automated

- **Heuristic scanning** — flags `console.log`, `debugger`, TODOs, and oversized diffs without spending API credits
- **AI review** — posts inline comments for critical errors, risky logic, and maintainability tips
- **Summary comment** — posts an overall review summary to the PR

### One-time secret setup (per repo)

Add the `OPENAI_API_KEY` secret to the repository:

```text
GitHub → Settings → Secrets and variables → Actions → New repository secret
Name: OPENAI_API_KEY
Value: <your key from https://platform.openai.com/api-keys>
```

`GITHUB_TOKEN` is provided automatically by GitHub Actions — no extra setup needed.

### Configuration options

| Input | Description | Default |
|---|---|---|
| `fail_on_warnings` | Set `true` to block merges when warnings are found | `false` |
| `max_comments` | Cap on total comments posted | `25` |
| `ai_focus_errors` | Detect critical/breaking issues | `true` |
| `ai_focus_warn` | Detect risky logic | `true` |
| `ai_focus_tips` | Suggest maintainability improvements | `true` |
| `ai_focus_notes` | Add design/architecture notes | `false` |
| `ai_focus_grammar` | Grammar/naming checks | `false` |

---

## New App Setup Checklist

Follow these steps every time you create a new app repo.

### Step 1 — Run the Bootstrap Script
From your new app's repo root, run the one-line bootstrap command. This automatically downloads the standard templates and configures them with your specific app details.

```bash
curl -sL https://raw.githubusercontent.com/midnghtsapphire/revvel-standards/main/templates/cicd/bootstrap-deploy.sh | bash -s <app_name> <droplet_ip> <app_dir> <domain>

# Example:
# curl -sL https://raw.githubusercontent.com/midnghtsapphire/revvel-standards/main/templates/cicd/bootstrap-deploy.sh | bash -s growlingeyes 164.90.148.7 growlingeyes growlingeyes.com
```

This will instantly generate `.github/workflows/deploy.yml` and `deploy.sh` fully configured for your app, including **DeployBot deployment tracking**.

### Step 3 — The SSH Secret is Already Shared
Because all Revvel apps deploy to the same DigitalOcean droplet (`164.90.148.7`), the `SSH_PRIVATE_KEY` secret is **shared across all your repositories**. 

When you create a new app, you do **not** need to generate a new SSH key or manually add it to the repo settings. Just run this one command in your terminal to copy the shared key from an existing repo (like `growlingeyes`) to your new one:

```bash
# Copy the shared deploy key to your new repo
gh secret set SSH_PRIVATE_KEY --repo midnghtsapphire/YOUR_NEW_REPO --body "$(gh secret list --repo midnghtsapphire/growlingeyes)" 
```
*(Note: If you have the private key saved locally, just run `gh secret set SSH_PRIVATE_KEY --repo midnghtsapphire/YOUR_NEW_REPO < ~/.ssh/growlingeyes_deploy`)*

### Step 4 — Add any app-specific secrets
Add any `.env` variables your app needs as GitHub Actions secrets (same location as above). Common ones:

| Secret Name | What It Is |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `STRIPE_SECRET_KEY` | Stripe live secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth client secret |
| `JWT_SECRET` | Session signing key |
| `SESSION_SECRET` | Express session secret |

### Step 5 — Push and verify
```bash
git add .github/workflows/deploy.yml deploy.sh
git commit -m "feat: add CI/CD pipeline (Revvel standard)"
git push origin main
```
Then go to: `github.com/midnghtsapphire/YOUR_REPO/actions` to watch the first deploy run.

---

## How the Pipeline Works

```text
Push to main
    ↓
GitHub Actions runner (ubuntu-latest)
    ↓
pnpm install → pnpm build
    ↓
rsync dist/index.js + dist/public/ + package.json + pnpm-lock.yaml → Droplet APP_DIR
    ↓
SSH into droplet:
  - pm2 restart APP_NAME --update-env
    ↓
Live at https://YOUR_DOMAIN.com (~2-3 min total)
```

---

## Typical Deploy Time

| Step | Time |
|---|---|
| Checkout + setup | ~15s |
| pnpm install (cached) | ~30s |
| pnpm build | ~45-90s |
| Package + SCP upload | ~15s |
| SSH extract + PM2 restart | ~20s |
| **Total** | **~2-3 minutes** |

---

## Troubleshooting

**Deploy failed — SSH connection refused**
- Check that `SSH_PRIVATE_KEY` secret is set correctly in GitHub
- Verify the droplet IP is correct and the droplet is running
- Confirm the public key is in `/root/.ssh/authorized_keys` on the droplet

**PM2 process not found**
- SSH into the droplet and run `pm2 list` to see all process names
- Make sure `APP_NAME` in the workflow matches exactly

**Build failed**
- Check the Actions log for the exact error
- Run `pnpm build` locally first to confirm it passes before pushing
