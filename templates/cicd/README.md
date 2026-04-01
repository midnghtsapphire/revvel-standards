# Revvel CI/CD Templates

These are the **mandatory** CI/CD templates for every Revvel/MIDNGHTSAPPHIRE application deployed to a DigitalOcean Droplet. Copy these into every new app repo from day one — no exceptions.

---

## Files in This Directory

| File | Purpose | Where It Goes in Your App Repo |
|---|---|---|
| `deploy.yml` | GitHub Actions workflow — auto-deploys on every push to `main` | `.github/workflows/deploy.yml` |
| `deploy.sh` | Manual one-click deploy script for local use | `deploy.sh` (repo root) |

---

## New App Setup Checklist

Follow these steps every time you create a new app repo.

### Step 1 — Run the Bootstrap Script
From your new app's repo root, run the one-line bootstrap command. This automatically downloads the standard templates and configures them with your specific app details.

```bash
curl -sL https://raw.githubusercontent.com/midnghtsapphire/revvel-standards/main/templates/cicd/bootstrap-deploy.sh | bash -s <app_name> <droplet_ip> <app_dir>

# Example:
# curl -sL https://raw.githubusercontent.com/midnghtsapphire/revvel-standards/main/templates/cicd/bootstrap-deploy.sh | bash -s growlingeyes 164.90.148.7 growlingeyes
```

This will instantly generate `.github/workflows/deploy.yml` and `deploy.sh` fully configured for your app.

### Step 3 — Add the SSH secret to GitHub
1. Go to: `github.com/midnghtsapphire/YOUR_REPO/settings/secrets/actions`
2. Click **New repository secret**
3. Name: `SSH_PRIVATE_KEY`
4. Value: Paste the **full contents** of `~/.ssh/YOUR_APP_universal` (the private key)
5. Save

> **Note:** The SSH key naming convention is `<app_name>_universal`. If the key doesn't exist yet, generate it on the droplet and add the public key to `~/.ssh/authorized_keys`.

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
