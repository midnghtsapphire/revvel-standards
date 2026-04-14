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
| `auto-fix.yml` | Auto-fix loop — creates GitHub Issue + Copilot instructions on CI failure | `.github/workflows/auto-fix.yml` |
| `security.yml` | Security scanning — `pnpm audit` + TruffleHog secret scan | `.github/workflows/security.yml` |
| `deploy-android.yml` | Manual PWA → Play Store scaffold (inactive until Google Play account) | `.github/workflows/deploy-android.yml` |
| `deploy-ios.yml` | Manual PWA → App Store scaffold (inactive until Apple Developer account) | `.github/workflows/deploy-ios.yml` |

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

```
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

```
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
