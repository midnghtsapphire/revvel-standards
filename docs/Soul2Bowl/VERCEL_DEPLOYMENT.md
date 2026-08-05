# Soul2Bowl — Vercel Staging Deployment

**Staging URL:** [https://soul2bowl.vercel.app](https://soul2bowl.vercel.app)  
**Production URL:** [https://soul2bowl.com](https://soul2bowl.com) (DigitalOcean App Platform)  
**Repository:** `midnghtsapphire/Soul2Bowl`

---

## Overview

Soul2Bowl uses **two deployment targets**:

| Environment | Platform | URL | Trigger |
|---|---|---|---|
| Staging / Preview | Vercel | `soul2bowl.vercel.app` | Every push to `main` or PR |
| Production | DigitalOcean App Platform | `soul2bowl.com` | Manual or tagged release |

The Vercel staging deployment gives a live preview URL for every push — ideal for testing and QA before promoting to production.

---

## One-Time Setup

### 1. Install the Vercel GitHub App

1. Go to [vercel.com/new](https://vercel.com/new) and log in with the `midnghtsapphire` GitHub account.
2. Click **Import Git Repository** → select `midnghtsapphire/Soul2Bowl`.
3. Set the **Framework Preset** to **Next.js**.
4. Click **Deploy** (first deploy may fail — that is expected until env vars are set).

### 2. Set Environment Variables in Vercel

Open the Vercel project → **Settings → Environment Variables** and add every variable from [`ENV_EXAMPLE.md`](./ENV_EXAMPLE.md):

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | ✅ | Clerk dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | ✅ | Clerk dashboard → Webhooks |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST` | ✅ | Stripe dashboard → Developers → API Keys |
| `STRIPE_SECRET_KEY_TEST` | ✅ | Stripe dashboard → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe dashboard → Webhooks |
| `DATABASE_URL` | ✅ | Connection string to your staging PostgreSQL database |
| `RESEND_API_KEY` | ✅ | Resend dashboard → API Keys |
| `NEXT_PUBLIC_APP_URL` | ✅ | Set to `https://soul2bowl.vercel.app` for staging |
| `OPENROUTER_API_KEY` | optional | AI alt-text generation |

Set each variable for **Preview** (and optionally **Production**) environments.

### 3. Generate a Vercel API Token

The CI/CD deployment workflow needs a `VERCEL_TOKEN`:

1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens).
2. Click **Create Token** → name it `revvel-standards-ci` → scope it to the `midnghtsapphire` team.
3. Copy the token value.

### 4. Add `VERCEL_TOKEN` to This Repository's Secrets

```text
GitHub → midnghtsapphire/revvel-standards → Settings → Secrets and variables → Actions
→ New repository secret → Name: VERCEL_TOKEN → Value: <paste token>
```

Also add these Vercel project identifiers (found in **Project Settings → General**):

| Secret name | Where to find it |
|---|---|
| `VERCEL_ORG_ID` | Vercel team settings → General → Team ID |
| `VERCEL_PROJECT_ID` | Vercel project settings → General → Project ID |

---

## Automated Deployment (CI/CD)

Once secrets are set, every push to `main` in `midnghtsapphire/Soul2Bowl` will automatically deploy to Vercel via the Vercel GitHub App (no extra workflow needed).

To trigger a **manual re-deploy** from GitHub Actions:

```bash
gh workflow run "Deployment Health Check" --repo midnghtsapphire/revvel-standards
```

---

## Monitoring

The **Deployment Health Check** workflow (`.github/workflows/deployment-health-check.yml`) pings `soul2bowl.vercel.app` every 6 hours. If the URL returns a non-2xx status, it automatically opens a GitHub issue:

- **Issue label:** `deployment-down:soul2bowl-vercel`
- **Issue title:** `🚨 Deployment DOWN — soul2bowl-vercel`

The issue is closed automatically when the URL recovers.

> **Note:** The production apex domain (`https://soul2bowl.com`) is **not**
> health-checked yet. Soul2Bowl is still Pre-Build and the apex currently
> resolves to GitHub Pages, so a check would fail with a TLS altname mismatch
> and file a false-alarm `soul2bowl-prod` issue. Re-add `soul2bowl-prod` to the
> workflow's deployment registry once production is live on DigitalOcean App
> Platform.

To run a manual health check:

```bash
gh workflow run "Deployment Health Check" \
  --repo midnghtsapphire/revvel-standards \
  -f url=https://soul2bowl.vercel.app
```

---

## Troubleshooting

### The site returns 404 / blank page

- **Cause:** Vercel project exists but no successful deployment has been made yet.
- **Fix:** In Vercel dashboard → Deployments → Redeploy the latest commit.

### Build fails with missing environment variable

- **Cause:** A required env var is not set in Vercel project settings.
- **Fix:** Add the missing variable in Vercel → Settings → Environment Variables, then redeploy.

### `VERCEL_TOKEN` is missing in GitHub Actions

- **Cause:** The secret was not added or has expired.
- **Fix:** Generate a new token at [vercel.com/account/tokens](https://vercel.com/account/tokens) and add it via:
  ```bash
  gh secret set VERCEL_TOKEN --repo midnghtsapphire/revvel-standards
  # Paste the token value when prompted.
  ```

### Secrets keep disappearing from GitHub Actions

GitHub Actions secrets are not deleted automatically by any Revvel workflow. Common causes:
1. **Manual deletion** — someone deleted them in Settings → Secrets.
2. **Fine-grained PAT expiry** — `ADMIN_GITHUB_TOKEN` and similar PATs expire; regenerate and re-add them.
3. **Organization-level override** — an org-level secret can shadow a repo-level secret but does not delete it.

To audit and restore secrets quickly, run the **Secrets Health Check** workflow:
```bash
gh workflow run "Secrets Health Check" --repo midnghtsapphire/revvel-standards
```
Then add any missing secrets directly in **Settings → Secrets and variables → Actions** or via Doppler sync.

---

## See Also

- [`ENV_EXAMPLE.md`](./ENV_EXAMPLE.md) — full list of environment variables
- [`README.md`](./README.md) — project overview and local development
- [`ROADMAP.md`](./ROADMAP.md) — phased release plan
- [`../../docs/SECRETS_MANAGEMENT.md`](../../docs/SECRETS_MANAGEMENT.md) — full secret inventory and Doppler setup
- [`../../.github/workflows/deployment-health-check.yml`](../../.github/workflows/deployment-health-check.yml) — URL monitoring workflow
- [`../../.github/workflows/secrets-health-check.yml`](../../.github/workflows/secrets-health-check.yml) — secrets audit workflow
