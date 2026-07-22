# oAudrey Deployment Standard

**Version:** 1.0.0  
**Date:** 2026-04-26  
**Status:** Active  
**Owner:** MIDNGHTSAPPHIRE / Freedom Angel Corp  

---

## Overview

This document is the authoritative deployment guide for the **oAudrey Hub** (`oaudrey.com`) and all product subdomains (`*.oaudrey.com`). It covers:

1. Architecture
2. Required credentials and BOM
3. DigitalOcean App Platform setup
4. DNS configuration (Namecheap → DigitalOcean)
5. GitHub Actions CI/CD pipeline
6. Self-improvement / retrospective loop
7. Adding a new product tab and subdomain
8. Troubleshooting

---

## Architecture

```text
                  GitHub (midnghtsapphire/revvel-standards)
                       │  push to main
                       ▼
          .github/workflows/deploy-oaudrey.yml
                       │  doctl
                       ▼
         DigitalOcean App Platform (region: nyc)
              │                      │
              ▼                      ▼
     oaudrey.com (apex)    fieldwork.oaudrey.com
     (static site)          (static site)
              │
              ├── growlingeyes.oaudrey.com  (future)
              ├── penny.oaudrey.com         (future)
              ├── agents.oaudrey.com        (future)
              └── market.oaudrey.com        (future)

DNS: Namecheap (username: uprisinghope) → DigitalOcean nameservers
Secrets: GitHub Actions repo secrets → Doppler (revvel-standards project)
```

---

## Required Credentials — BOM

> Run the **Credential Gatekeeper** workflow (`.github/workflows/credential-gatekeeper.yml`) for an automated BOM checklist.

| Secret / Credential | Purpose | Where to Get It | Where to Store |
|---|---|---|---|
| `DIGITALOCEAN_API_TOKEN` | `doctl` authentication — create/update DO App Platform apps | DO Dashboard → API → Personal Access Tokens | GitHub repo secret + Doppler `DIGITALOCEAN_API_TOKEN` |
| `DOPPLER_TOKEN` | Injects all secrets into GitHub Actions workflows | Doppler Dashboard → Project → Service Tokens | GitHub repo secret `DOPPLER_TOKEN` |
| Namecheap credentials | Update DNS records (Namecheap API or dashboard) | Namecheap account `uprisinghope` | Vault: `revvel/shared/dns/namecheap` |
| `NAMECHEAP_API_KEY` | Namecheap API for automated DNS updates | Namecheap → Profile → API Access | GitHub repo secret + Doppler |
| `NAMECHEAP_USERNAME` | Namecheap username | `uprisinghope` | Doppler `NAMECHEAP_USERNAME` |
| `GODADDY_API_KEY` / `GODADDY_API_SECRET` | GoDaddy API for automated DNS updates | [developer.godaddy.com](https://developer.godaddy.com/keys) → Production keys | GitHub repo secret + Doppler |
| `PORKBUN_API_KEY` / `PORKBUN_SECRET_API_KEY` | Porkbun API for automated DNS updates | Porkbun → Account → API Access (enable per-domain too) | GitHub repo secret + Doppler |

### Doppler Provisioning

```bash
# Install Doppler CLI (review the script before executing — official docs: https://docs.doppler.com/docs/cli)
curl -Ls https://cli.doppler.com/install.sh -o /tmp/doppler-install.sh && sh /tmp/doppler-install.sh
doppler login
doppler setup    # select revvel-standards → production

# Provision DigitalOcean token
doppler secrets set DIGITALOCEAN_API_TOKEN --value "YOUR_DO_TOKEN_HERE"

# Verify
doppler secrets --only-names | grep DIGITAL
```

### GitHub Actions Secrets

```bash
# Using gh CLI
gh secret set DIGITALOCEAN_API_TOKEN --repo midnghtsapphire/revvel-standards
gh secret set DOPPLER_TOKEN --repo midnghtsapphire/revvel-standards

# Verify (shows names, not values)
gh secret list --repo midnghtsapphire/revvel-standards
```

### Automated provisioning (no manual `gh secret set`)

Once `DOPPLER_TOKEN` and `ADMIN_GITHUB_TOKEN` (a fine-grained PAT with
`secrets: write` on this repo) are seeded, **you should not need to run
`gh secret set` by hand again**. The Credential Gatekeeper does it for you:

1. `.github/workflows/credential-gatekeeper.yml` runs on every issue
   `opened` / `reopened` and on the `ready-to-implement` label, scans the
   issue body for credential keywords, and emits the BOM as a job output.
2. The `auto-provision` job invokes `scripts/gatekeeper-sync.sh`, which:
   - `GET`s each required secret from the Doppler API
     (`https://api.doppler.com/v3/configs/config/secret`)
   - Pipes each value into `gh secret set <NAME> --repo <owner>/<repo>`
     (which performs the libsodium-encrypted PUT to the GitHub Actions
     secrets API)
3. The job comments back on the issue with a per-secret `✅ synced`,
   `⚠️ missing in Doppler`, or `❌ failed` table and flips the
   `credentials-missing` → `credentials-ready` label when the BOM is fully
   satisfied.

Manual dry-run from any developer machine:

```bash
DRY_RUN=1 scripts/gatekeeper-sync.sh \
  --secrets DIGITALOCEAN_API_TOKEN,NAMECHEAP_API_KEY \
  --repo midnghtsapphire/revvel-standards \
  --json
```

---

## DigitalOcean App Platform Setup

### 1. First Deploy (automated)

The `deploy-oaudrey.yml` workflow handles the first deploy automatically when you push to `main`. It:

1. Installs `doctl` and authenticates with `DIGITALOCEAN_API_TOKEN`
2. Validates `oaudrey/.do/app.yaml`
3. Creates a new App Platform app (first time) or updates it (subsequent pushes)
4. Waits for the deployment to reach `ACTIVE` status

### 2. Manual Deploy via CLI

```bash
# Install doctl
brew install doctl    # macOS
# or: snap install doctl (Linux)

# Authenticate
doctl auth init       # paste DO API token when prompted

# Validate the spec
doctl apps spec validate oaudrey/.do/app.yaml

# Create app (first time)
doctl apps create --spec oaudrey/.do/app.yaml --wait

# Update app (subsequent deploys)
APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | grep "oaudrey-hub" | awk '{print $1}')
doctl apps update "$APP_ID" --spec oaudrey/.do/app.yaml

# List deployments
doctl apps list-deployments "$APP_ID"

# Get app URL
doctl apps get "$APP_ID" --format DefaultIngress --no-header
```

### 3. App Platform Free Tier

DigitalOcean App Platform offers **3 free static sites** per account. oAudrey qualifies for the free tier. If you exceed 3 free apps, the cost is $3/app/month for static sites.

---

## Alternative Deployment: GitHub Pages

GitHub Pages offers a **free, zero-config alternative** to DigitalOcean for hosting the oAudrey static site. This is useful for:

- **Testing/preview** before deploying to production
- **Development** when you want to see the site without DigitalOcean access
- **Backup/mirror** deployment
- **Cost savings** (free for public repos within GitHub Pages usage limits)

### Automated GitHub Pages Deployment

The repository includes a GitHub Actions workflow (`.github/workflows/static.yml`) that automatically deploys the entire repository to GitHub Pages on every push to `main`.

**Setup (one-time):**

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Build and deployment**:
   - Source: **GitHub Actions** (not "Deploy from a branch")
4. Save

Once enabled, the site will be available at:

```text
https://midnghtsapphire.github.io/revvel-standards/oaudrey/
```

Subdomains (like `fieldwork.oaudrey.com`) become sub-paths:

```text
https://midnghtsapphire.github.io/revvel-standards/fieldwork/
```

### GitHub Pages vs DigitalOcean App Platform

| Feature           | GitHub Pages                         | DigitalOcean App Platform                 |
| ----------------- | ------------------------------------ | ----------------------------------------- |
| **Cost**          | Free                                 | Free tier (3 sites), then $3/mo per site |
| **Custom domain** | Supported (`oaudrey.com` via A/ALIAS/ANAME; subdomains via CNAME) | Supported                                 |
| **HTTPS**         | Automatic (Let's Encrypt)            | Automatic                                 |
| **Deployment**    | Auto (on push to `main`)             | Auto (on push to `main`)                  |
| **Subdomains**    | Only via custom DNS                  | Native support (`*.oaudrey.com`)          |
| **Build time**    | ~30 seconds                          | ~2-3 minutes                              |
| **Bandwidth**     | 100 GB/month soft limit              | Unmetered                                 |
| **Best for**      | Testing, mirrors, development        | Production with subdomains                |

### Running Locally (No Deployment)

For **immediate local preview** without any deployment:

```bash
cd oaudrey
python3 -m http.server 8080
# Open http://localhost:8080
```

**Complete local setup guide:** [`oaudrey/LOCAL_SETUP.md`](../oaudrey/LOCAL_SETUP.md)

### When to Use Each Option

- **DigitalOcean (primary)** — Use for `oaudrey.com` production with full subdomain support (`fieldwork.oaudrey.com`, `penny.oaudrey.com`, etc.)
- **GitHub Pages (secondary)** — Use for testing, previews, and as a backup. Can serve the site on a custom domain if needed.
- **Local server (development)** — Use when developing/testing changes before committing.

---

## DNS Configuration (Namecheap → DigitalOcean)

### Step 1: Point Namecheap to DigitalOcean nameservers

1. Log in to [namecheap.com](https://www.namecheap.com/myaccount/login/) (username: `uprisinghope`)
2. Go to **Domain List** → click **Manage** next to `oaudrey.com`
3. Under **Nameservers**, select **Custom DNS**
4. Enter DigitalOcean nameservers:

   ```text
   ns1.digitalocean.com
   ns2.digitalocean.com
   ns3.digitalocean.com
   ```

5. Save. DNS propagation takes 0–48 hours.

### Step 2: Add domain in DigitalOcean

1. Log in to DigitalOcean dashboard
2. Go to **Networking → Domains**
3. Add `oaudrey.com` → point to your App Platform app
4. Add subdomains:

   ```text
   oaudrey.com         → ALIAS to your App Platform URL
   www.oaudrey.com     → CNAME to oaudrey.com
   fieldwork.oaudrey.com → CNAME to your App Platform URL
   ```

### Step 3: Verify DNS propagation

```bash
# Check from CLI
dig +short oaudrey.com
dig +short www.oaudrey.com

# Check HTTPS is working
curl -sI https://oaudrey.com | head -5
curl -sI https://fieldwork.oaudrey.com | head -5
```

### Automated DNS (Namecheap API)

For automated DNS management, use the Namecheap API:

```bash
# Check if Namecheap API is enabled
# Profile → API Access → Enable API
# Whitelist your server IP

# Example: create a CNAME record via API
curl "https://api.namecheap.com/xml.response" \
  -d "ApiUser=$NAMECHEAP_USERNAME" \
  -d "ApiKey=$NAMECHEAP_API_KEY" \
  -d "UserName=$NAMECHEAP_USERNAME" \
  -d "Command=namecheap.domains.dns.setHosts" \
  -d "ClientIp=YOUR_SERVER_IP" \
  -d "SLD=oaudrey" \
  -d "TLD=com" \
  -d "HostName1=@&RecordType1=ALIAS&Address1=your-app.ondigitalocean.app&TTL1=300"
```

### Automated DNS sync (registrar-agnostic)

The repo ships a registrar-agnostic DNS sync that pushes the declarative
record list in [`oaudrey/dns-records.yml`](../oaudrey/dns-records.yml) to
whichever registrar `oaudrey.com` lives on:

| Registrar | Credentials                                          | Notes |
|-----------|------------------------------------------------------|-------|
| Namecheap | `NAMECHEAP_API_KEY`, `NAMECHEAP_API_USER`, `NAMECHEAP_USERNAME`, `NAMECHEAP_CLIENT_IP` | API rejects ALIAS at apex — keep apex on DO nameservers |
| GoDaddy   | `GODADDY_API_KEY`, `GODADDY_API_SECRET`              | Sync auto-translates apex `ALIAS` → `A` when value is an IP |
| Porkbun   | `PORKBUN_API_KEY`, `PORKBUN_SECRET_API_KEY`          | Native `ALIAS` at apex — recommended for oAudrey |

The active registrar is **auto-detected** from whichever credential set is
present (provisioned via the Credential Gatekeeper). Workflow:
[`.github/workflows/sync-oaudrey-dns.yml`](../.github/workflows/sync-oaudrey-dns.yml).

```bash
# Local dry run — prints redacted requests, makes no API calls
DRY_RUN=true \
  APP_TARGET=oaudrey-hub-abcde.ondigitalocean.app \
  PORKBUN_API_KEY=test PORKBUN_SECRET_API_KEY=test \
  node scripts/sync-dns-records.js

# Force a specific registrar
DNS_PROVIDER=godaddy ... node scripts/sync-dns-records.js
```

Triggers:

- After every successful `deploy-oaudrey.yml` run (via `workflow_run`)
- Manual via `workflow_dispatch` (with optional `provider` and `dry_run`)
- Weekly Mondays 06:30 UTC as a drift-correction sweep

> **FOSS tools for DNS automation:**
>
> - [octodns](https://github.com/octodns/octodns) — declarative DNS management (YAML config → push to any provider)
> - [external-dns](https://github.com/kubernetes-sigs/external-dns) — Kubernetes-native DNS sync
> - [lexicon](https://github.com/AnalogJ/lexicon) — CLI tool for DNS manipulation across providers
> - `doctl compute domain` — DigitalOcean's own DNS management CLI

---

## CI/CD Pipeline

### Workflows

| Workflow | File | Triggers | Purpose |
|---|---|---|---|
| Deploy | `deploy-oaudrey.yml` | Push to `main` touching `oaudrey/**` or `fieldwork/**` | Deploy to DO App Platform |
| Retro | `oaudrey-retro.yml` | After successful deploy; weekly Monday 06:00 UTC | Health check + gap analysis + retro issue |

### Deploy Checklist (per deploy)

```text
[ ] oaudrey/index.html — markup valid, all tabs wired
[ ] oaudrey/404.html — exists and branded
[ ] oaudrey/.do/app.yaml — spec validated
[ ] DIGITALOCEAN_API_TOKEN secret is set
[ ] deploy-oaudrey.yml passes (GitHub Actions)
[ ] oaudrey.com returns HTTP 200
[ ] fieldwork.oaudrey.com returns HTTP 200
[ ] oaudrey-retro.yml ran — no gaps found
```

---

## Self-Improvement Process

The **oAudrey Retro** workflow (`oaudrey-retro.yml`) runs after every successful deploy and weekly. It:

1. **Health-checks** all oAudrey domains (apex + subdomains)
2. **Gap-analyzes** the live site vs what's committed (tab count, 404 page, app spec)
3. **Opens a GitHub issue** with findings categorized as:
   - ✅ What Went Well
   - ⚠️ Needs Work
   - 🔍 Gaps Found
4. **Posts a step summary** in the Actions run for quick visibility

### How to act on retro findings

1. Retro issue appears in `midnghtsapphire/revvel-standards` with label `retro`
2. Review the issue — address ⚠️ items first, then 🔍 gaps
3. Each fix becomes a commit; push triggers the next deploy + retro cycle
4. When a gap reveals a process improvement, **update this standard** (`standards/OAUDREY_DEPLOYMENT_STANDARD.md`)

### Continuous improvement loop

```text
push → deploy → retro → issue → fix → push → ...
       ↑______________________________________________↑
                  (self-improving loop)
```

---

## Adding a New Product Tab

To add a new product (e.g., `neurooz.oaudrey.com`):

### 1. Add the tab button in `oaudrey/index.html`

Find the `role="tablist"` section and add:

```html
<button role="tab" id="tab-neurooz" aria-controls="panel-neurooz" aria-selected="false"
        class="px-4 py-2 border hairline font-mono text-[11px] uppercase tracking-widest hover:text-ice">
  Neurooz
</button>
```

### 2. Add the panel in `oaudrey/index.html`

After the last panel, add:

```html
<div role="tabpanel" id="panel-neurooz" aria-labelledby="tab-neurooz" hidden
     class="grid grid-cols-1 lg:grid-cols-12 gap-10">
  <div class="lg:col-span-7 glass p-8 md:p-10">
    <div class="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-mist">
      <span class="h-1.5 w-1.5 bg-cyan pulse-dot" aria-hidden="true"></span>
      neurooz.oaudrey.com
    </div>
    <h3 class="mt-4 text-3xl md:text-5xl font-extrabold tracking-tightest leading-[1.05]">
      Neurooz — [product description].
    </h3>
    <p class="mt-6 text-mist leading-relaxed">
      [Description paragraph]
    </p>
  </div>
  <aside class="lg:col-span-5 glass p-8 md:p-10">
    <div class="font-mono text-[10px] uppercase tracking-widest text-mist">// Subdomain</div>
    <div class="mt-3 font-mono text-ice break-all">neurooz.oaudrey.com</div>
    <dl class="mt-6 space-y-4 text-sm">
      <div class="flex items-start justify-between gap-6 border-t hairline pt-4">
        <dt class="text-mist">Status</dt><dd class="font-mono text-gold">IN BUILD</dd>
      </div>
      <div class="flex items-start justify-between gap-6 border-t hairline pt-4">
        <dt class="text-mist">Pledge</dt><dd class="text-gold">% to survivors</dd>
      </div>
    </dl>
  </aside>
</div>
```

### 3. Add subdomain to app spec (`oaudrey/.do/app.yaml`)

```yaml
  - name: neurooz-landing
    github:
      repo: midnghtsapphire/revvel-standards
      branch: main
      deploy_on_push: true
    source_dir: /neurooz   # or the appropriate directory
    output_dir: /
    index_document: index.html
    error_document: 404.html
    routes:
      - path: /neurooz
```

### 4. Add DNS record in DigitalOcean

```bash
doctl compute domain records create oaudrey.com \
  --record-type CNAME \
  --record-name neurooz \
  --record-data your-app.ondigitalocean.app. \
  --record-ttl 300
```

### 5. Update the README

Add the new product to the subdomain table in `oaudrey/README.md`.

---

## Troubleshooting

### Deploy fails: App not found

The `doctl apps list` grep may fail to match the app name. Check:

```bash
doctl apps list --format ID,Spec.Name --no-header
```

Ensure the app name in `oaudrey/.do/app.yaml` matches exactly `oaudrey-hub`.

### DNS not propagating

- Use [whatsmydns.net](https://www.whatsmydns.net) to check propagation globally
- Namecheap DNS changes propagate in minutes; full global propagation can take up to 48 hours
- Verify nameservers are set to DO's nameservers (not Namecheap's BasicDNS)

### App Platform returns 404 on custom domain

- Confirm the domain is added under App Platform → App → Settings → Domains
- Confirm the CNAME / ALIAS record in DigitalOcean DNS points to the app's `ondigitalocean.app` URL
- Check for SSL provisioning (DO automatically provisions Let's Encrypt — may take ~10 minutes)

### DIGITALOCEAN_API_TOKEN not working

Token requires **read** + **write** scopes on Apps. Create a new token at:  
DO Dashboard → API → Personal Access Tokens → Generate New Token → check **Read** + **Write**

### Secrets keep disappearing / needing to be re-added every day

**Symptom:** `DIGITALOCEAN_API_TOKEN` (or other secrets) is present one day and gone the next, causing the retro to report `HTTP 000` repeatedly.

**Root cause:** GitHub fine-grained PATs expire. The default expiry is 30 days. When `ADMIN_GITHUB_TOKEN` expires, the Credential Gatekeeper's auto-provision step can no longer write secrets back to the repo — so secrets that would have been auto-synced from Doppler silently remain absent.

**Permanent fix (sentinel + bootstrap contract):**

The repo ships `.github/workflows/secrets-sentinel.yml` which runs daily at 05:00 UTC and auto-heals missing secrets from Doppler. It only needs two stable bootstrap secrets:

| Secret | How to provision | TTL |
|--------|-----------------|-----|
| `DOPPLER_TOKEN` | Doppler Dashboard → Project `revvel-standards` → Service Tokens → Generate | Non-expiring (use a **service token**, not a personal token) |
| `ADMIN_GITHUB_TOKEN` | GitHub → Settings → Developer settings → Fine-grained PATs → generate with `secrets:write` on `midnghtsapphire/revvel-standards` | Up to 1 year — **set a calendar reminder to rotate 30 days before expiry** |

```bash
# One-time bootstrap
gh secret set DOPPLER_TOKEN         --repo midnghtsapphire/revvel-standards
gh secret set ADMIN_GITHUB_TOKEN    --repo midnghtsapphire/revvel-standards

# Immediately restore all other secrets (no need to wait for 05:00 UTC)
gh workflow run secrets-sentinel.yml --repo midnghtsapphire/revvel-standards
```

After the sentinel runs, `DIGITALOCEAN_API_TOKEN` and other secrets will be restored automatically from Doppler. The sentinel will continue to run daily and heal any future lapses.

### Retro health check reports `HTTP 000` for `oaudrey.com` / `fieldwork.oaudrey.com`

`HTTP 000` from `oaudrey-retro.yml` means `curl` could not complete the TLS
handshake at all — DNS did not resolve, the connection was refused, or it
timed out. It does **not** mean the site is returning an error page (that
would be `4xx`/`5xx`). Triage in this order:

1. **DNS resolution** — from any shell:

   ```bash
   dig +short oaudrey.com
   dig +short fieldwork.oaudrey.com
   ```

   Empty output → DNS not provisioned. Confirm Namecheap nameservers point
   to DigitalOcean (`ns1.digitalocean.com`, `ns2.digitalocean.com`, and
   `ns3.digitalocean.com`) and that the records exist in DO → Networking →
   Domains. See [DNS Configuration](#dns-configuration-namecheap--digitalocean).

2. **App Platform deploy state** — confirm the app exists and is healthy:

   ```bash
   doctl apps list --format ID,Spec.Name,DefaultIngress,ActiveDeployment.Phase
   ```

   If `ActiveDeployment.Phase` is not `ACTIVE`, re-run `deploy-oaudrey.yml`
   and inspect its logs.

3. **Required secrets** — if no deploy has ever succeeded, the apex won't
   resolve. Verify `DIGITALOCEAN_API_TOKEN` is set:

   ```bash
   gh secret list --repo midnghtsapphire/revvel-standards | grep DIGITALOCEAN_API_TOKEN
   ```

4. **Re-run the retro after fixing** — once DNS resolves and the deploy is
   `ACTIVE`, manually trigger the retro to confirm:

   ```bash
   gh workflow run oaudrey-retro.yml --repo midnghtsapphire/revvel-standards
   ```

   A successful retro will close the loop with `200`/`301`/`302` and no
   `⚠️ Needs Work` items.

> **Note:** The retro's health-check step relies on curl's `-w "%{http_code}"`
> formatter, which always emits `000` on connection failure. Do not add a
> fallback `|| echo "000"` — that double-prints and produces invalid status
> strings like `HTTP 000000` in the retro report.

---

## Research: FOSS / GitHub CLI / Extensions Used

| Tool | Category | How Used in This Standard |
|---|---|---|
| [doctl](https://github.com/digitalocean/doctl) | DO CLI | Deploy app spec, manage domains and DNS |
| [digitalocean/action-doctl](https://github.com/digitalocean/action-doctl) | GitHub Action | Installs `doctl` in GitHub Actions |
| [octodns](https://github.com/octodns/octodns) | DNS-as-code | Declarative DNS management from YAML |
| [lexicon](https://github.com/AnalogJ/lexicon) | DNS CLI | Manipulate DNS across Namecheap and other providers |
| [Doppler CLI](https://github.com/DopplerHQ/cli) | Secrets management | Inject secrets into GitHub Actions and local dev |
| [gh CLI](https://github.com/cli/cli) | GitHub CLI | Create secrets, list workflows, open issues |

---

## Retro Log

### 2026-05-03 — Retro Findings & Resolutions

**Issue:** `oAudrey retro — 2026-05-03 — 2 item(s) need attention` ([#575](https://github.com/midnghtsapphire/revvel-standards/issues/575))

| Item | Finding | Resolution | Status |
|------|---------|------------|--------|
| `oaudrey.com` not responding (HTTP 000) — DNS resolves to `3.33.130.190` | DNS points to an AWS Global Accelerator IP, not the DigitalOcean App Platform ingress. App Platform ingress and correct ALIAS/CNAME records not yet pushed. | `oaudrey.com` came back online before 2026-05-18 (confirmed by retro update comments). Root cause was deploy + DNS sync completing after the 2026-05-03 retro run. | ✅ Resolved |
| `fieldwork.oaudrey.com` not responding (HTTP 000) — DNS does not resolve | No CNAME record exists for the `fieldwork` subdomain; the DO App Platform app spec did not declare `fieldwork.oaudrey.com` as a custom domain, so the domain was never registered and `sync-oaudrey-dns.yml` had nothing to sync it against. | Added `domains` block to `oaudrey/.do/app.yaml` (`fieldwork.oaudrey.com` as `ALIAS`) so `doctl apps update` registers it automatically on next deploy, eliminating the manual dashboard step. | ⚠️ Infrastructure pending — resolve on next deploy |

**Root cause — `fieldwork.oaudrey.com` never registering:**

The `oaudrey/.do/app.yaml` app spec defined the `fieldwork-landing` component with a path-level route (`/fieldwork`) but did not include a `domains` section. DigitalOcean App Platform only registers custom domains for a component when they are explicitly listed in the spec OR added manually in the dashboard. Without that registration, DO never provisioned a certificate or ingress route for `fieldwork.oaudrey.com`, and the `sync-oaudrey-dns.yml` DNS sync therefore had no valid target to point the CNAME at.

**Additionally — automation loop fix:**

The weekly retro was updating issue #575 with a new "still open" comment every Monday but the issue was labeled `auto-fix`, causing the OpenRouter assignee workflow to treat it as an auto-fixable task and repeatedly route it. To break this loop, `oaudrey-retro.yml` now adds `needs-human` to the label set when creating retro issues that contain infrastructure health-check failures. This signals to the OpenRouter automation that human intervention is required and prevents the endless routing cycle.

**Actions taken (code):**

- `oaudrey/.do/app.yaml` — added `domains` block registering `oaudrey.com` (PRIMARY), `www.oaudrey.com` (ALIAS), and `fieldwork.oaudrey.com` (ALIAS); fixed `fieldwork-landing` route from `/fieldwork` to `/` so the component serves the subdomain root correctly.
- `.github/workflows/oaudrey-retro.yml` — retro issues that contain `needsWork` items (infrastructure health failures) now receive `needs-human` label at creation time, preventing the OpenRouter auto-fix loop.

**Remaining actions (infrastructure — requires live secrets):**

1. Trigger `deploy-oaudrey.yml` via `workflow_dispatch` — `doctl apps update` will register `fieldwork.oaudrey.com` as a custom domain in the App Platform
2. After deploy, run or wait for `sync-oaudrey-dns.yml` (auto-triggers after deploy) — it will push the `fieldwork` CNAME pointing to the App Platform ingress
3. Allow 5–30 minutes for DNS propagation
4. Re-run `oaudrey-retro.yml` — both sites should return HTTP 200/301/302 and issue #575 will auto-close

---

### 2026-04-30 — Retro Findings & Resolutions

**Issue:** `oAudrey retro — 2026-04-30 — 2 item(s) need attention`

| Item | Finding | Resolution | Status |
|------|---------|------------|--------|
| `oaudrey.com` not responding | `HTTP 000` — curl cannot complete TLS handshake; DNS not provisioned or app not deployed | Root cause: `DIGITALOCEAN_API_TOKEN` repeatedly absent from GitHub repo secrets, preventing the deploy workflow from running. See **Secrets Persistence** section below. | ⚠️ Infrastructure pending |
| `fieldwork.oaudrey.com` not responding | Same root cause as apex | Same as above | ⚠️ Infrastructure pending |

**Root cause analysis — secrets disappearing:**

GitHub fine-grained personal access tokens (PATs) expire. The default expiry is 30 days and the maximum is 1 year. When `ADMIN_GITHUB_TOKEN` (used by the Credential Gatekeeper to write secrets) expires, the auto-provision pipeline silently loses the ability to re-sync secrets from Doppler. Subsequent runs of `credential-gatekeeper.yml` emit `❌ gh secret set failed` rows but the maintainer may not notice, leaving `DIGITALOCEAN_API_TOKEN` absent.

Additionally, Doppler service tokens are non-expiring by default, but if `DOPPLER_TOKEN` itself was provisioned with a short-lived token type, it too expires — breaking the entire self-healing chain.

**Actions taken (code — this PR):**

- `.github/workflows/secrets-sentinel.yml` — **new** daily sentinel (05:00 UTC, one hour before retro). Audits `DIGITALOCEAN_API_TOKEN`, `DOPPLER_TOKEN`, `ADMIN_GITHUB_TOKEN`, `NAMECHEAP_API_KEY`, and `OPENROUTER_API_KEY`. If any are missing and `DOPPLER_TOKEN` is available, invokes `scripts/gatekeeper-sync.sh` to restore them from Doppler automatically. Opens or updates a `secrets-missing` tracking issue when auto-heal is not possible.
- `.github/workflows/secrets-health-check.yml` — added `DIGITALOCEAN_API_TOKEN` and `DOPPLER_TOKEN` to the weekly audit (both were absent from the checked set).

**Secrets persistence — bootstrap contract:**

Only two secrets need to be set manually; everything else can auto-heal from them:

| Secret | Type | TTL | Notes |
|--------|------|-----|-------|
| `DOPPLER_TOKEN` | Doppler service token | Non-expiring (default) | Use a **service token**, not a personal token, to avoid expiry |
| `ADMIN_GITHUB_TOKEN` | GitHub fine-grained PAT | Max 1 year | Must have `secrets:write` on this repo; set a calendar reminder to rotate 30 days before expiry |

Once both bootstrap secrets are present, the daily sentinel (`secrets-sentinel.yml`) will auto-restore any other missing secret by pulling it from Doppler.

**Remaining actions (infrastructure — requires live secrets):**

1. Set `DOPPLER_TOKEN` (service token, non-expiring) and `ADMIN_GITHUB_TOKEN` (`secrets:write`) manually
2. Trigger `secrets-sentinel.yml` manually to restore `DIGITALOCEAN_API_TOKEN` and other missing secrets
3. Run `deploy-oaudrey.yml` via `workflow_dispatch` to deploy to DigitalOcean App Platform
4. In DigitalOcean dashboard: confirm `oaudrey.com` and `fieldwork.oaudrey.com` are custom domains on the app
5. In Namecheap: confirm nameservers point to `ns1-3.digitalocean.com`
6. Re-run `oaudrey-retro.yml` — expect `HTTP 200`/`301`/`302` for both domains

---

### 2026-04-28 — Retro Findings & Resolutions

**Issue:** `oAudrey retro — 2026-04-28 — 2 item(s) need attention`

| Item | Finding | Resolution | Status |
|------|---------|------------|--------|
| `oaudrey.com` not responding | `HTTP 000000` reported — two issues: (1) retro script double-printed `000` via \|\| echo pattern; (2) app not yet deployed to DO App Platform | (1) Fixed in `oaudrey-retro.yml` — health check now uses \|\| true so curl's `-w "%{http_code}"` is the sole source of the status string; (2) Requires `DIGITALOCEAN_API_TOKEN` secret and DNS pointed to DigitalOcean nameservers — see [Troubleshooting: HTTP 000](#retro-health-check-reports-http-000-for-oaudreycom--fieldworkoaudreycom) | ⚠️ Infrastructure pending |
| `fieldwork.oaudrey.com` not responding | App not yet deployed; DNS not configured | Same as above + `fieldwork/404.html` was missing from repo (required by `oaudrey/.do/app.yaml` `error_document: 404.html`) — now added | ⚠️ Infrastructure pending |

**Actions taken (code):**

- `oaudrey-retro.yml` health-check steps: replaced `|| echo "000"` with `|| true` to prevent double-printing of `000` (bug produced `HTTP 000000` in retro reports)
- `fieldwork/404.html`: added branded error page to match `error_document: 404.html` in `oaudrey/.do/app.yaml`

**Remaining actions (infrastructure — requires live secrets):**

1. Set `DIGITALOCEAN_API_TOKEN` in GitHub repo secrets
2. Run `deploy-oaudrey.yml` manually via `workflow_dispatch`
3. In DigitalOcean dashboard: add `oaudrey.com` and `fieldwork.oaudrey.com` as custom domains on the app
4. In Namecheap: point `oaudrey.com` nameservers to `ns1-3.digitalocean.com`
5. Re-run `oaudrey-retro.yml` — expect `HTTP 200`/`301`/`302` for both domains

---

## Related Documents

- `oaudrey/README.md` — product overview and design system
- `oaudrey/.do/app.yaml` — DigitalOcean App Platform spec
- `.github/workflows/deploy-oaudrey.yml` — deployment workflow
- `.github/workflows/oaudrey-retro.yml` — self-improvement retro workflow
- `docs/DEPLOYMENT_GUIDE.md` — general Revvel deployment guide
- `docs/SECRETS_MANAGEMENT.md` — full secrets matrix
- `docs/oaudrey/BOM.md` — complete credential/API bill of materials for oAudrey team
- `skills/deployment/SKILL.md` — deployment skill (loaded for all deploy tasks)
