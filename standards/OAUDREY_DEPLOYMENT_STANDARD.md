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

```
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

## DNS Configuration (Namecheap → DigitalOcean)

### Step 1: Point Namecheap to DigitalOcean nameservers

1. Log in to [namecheap.com](https://www.namecheap.com/myaccount/login/) (username: `uprisinghope`)
2. Go to **Domain List** → click **Manage** next to `oaudrey.com`
3. Under **Nameservers**, select **Custom DNS**
4. Enter DigitalOcean nameservers:
   ```
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
   ```
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

```
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

```
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

### Deploy fails: "App not found"

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

### 2026-04-30 — Retro Findings & Resolutions

**Issue:** `oAudrey retro — 2026-04-30 — 2 item(s) need attention`

| Item | Finding | Resolution | Status |
|------|---------|------------|--------|
| `oaudrey.com` not responding | `HTTP 000` — DNS does not resolve because Namecheap nameservers are not pointed to DigitalOcean and no DO App Platform app has been deployed yet | Improved `oaudrey-retro.yml`: added DNS pre-flight check steps (`dig +short`) so the retro issue body now distinguishes "DNS not resolving" from "server error" and includes the resolved IP when DNS is working. Also added an "Infrastructure Setup Required" section with step-by-step instructions directly in the issue body when both sites are down with no DNS. | ⚠️ Infrastructure pending |
| `fieldwork.oaudrey.com` not responding | Same root cause — DNS not configured; app not deployed | Same infrastructure fix required. Also fixed inconsistency: the fieldwork "not responding" message now includes the HTTP status code (matching the oaudrey.com message format). | ⚠️ Infrastructure pending |

**Actions taken (code):**
- `oaudrey-retro.yml`: added `DNS check — oaudrey.com` and `DNS check — fieldwork.oaudrey.com` steps that run `dig +short` before the curl health checks, outputting resolved IPs for diagnostic use in the retro issue
- `oaudrey-retro.yml`: updated `generate retrospective report` step to include DNS resolution result in the "Needs Work" message and emit an "Infrastructure Setup Required" section with ordered setup steps when both sites are down with no DNS
- `oaudrey-retro.yml`: fixed inconsistency — fieldwork "not responding" message now includes HTTP status code (e.g., `HTTP 000`) to match oaudrey.com format

**Remaining actions (infrastructure — requires live secrets):**
1. Set `DIGITALOCEAN_API_TOKEN` in GitHub repo secrets
2. Run `deploy-oaudrey.yml` manually via `workflow_dispatch`
3. In DigitalOcean dashboard: add `oaudrey.com` and `fieldwork.oaudrey.com` as custom domains on the app
4. In Namecheap: point `oaudrey.com` nameservers to `ns1-3.digitalocean.com`
5. Re-run `oaudrey-retro.yml` — expect `HTTP 200`/`301`/`302` for both domains

---

### 2026-04-28 — Retro Findings & Resolutions

**Issue:** `oAudrey retro — 2026-04-28 — 2 item(s) need attention`

| Item | Finding | Resolution | Status |
|------|---------|------------|--------|
| `oaudrey.com` not responding | `HTTP 000000` reported — two issues: (1) retro script double-printed `000` via `|| echo "000"` pattern; (2) app not yet deployed to DO App Platform | (1) Fixed in `oaudrey-retro.yml` — health check now uses `|| true` so curl's `-w "%{http_code}"` is the sole source of the status string; (2) Requires `DIGITALOCEAN_API_TOKEN` secret and DNS pointed to DigitalOcean nameservers — see [Troubleshooting: HTTP 000](#retro-health-check-reports-http-000-for-oaudreycoms--fieldworkoaudreycoms) | ⚠️ Infrastructure pending |
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
