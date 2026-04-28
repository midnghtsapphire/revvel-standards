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

## Related Documents

- `oaudrey/README.md` — product overview and design system
- `oaudrey/.do/app.yaml` — DigitalOcean App Platform spec
- `.github/workflows/deploy-oaudrey.yml` — deployment workflow
- `.github/workflows/oaudrey-retro.yml` — self-improvement retro workflow
- `docs/DEPLOYMENT_GUIDE.md` — general Revvel deployment guide
- `docs/SECRETS_MANAGEMENT.md` — full secrets matrix
- `docs/oaudrey/BOM.md` — complete credential/API bill of materials for oAudrey team
- `skills/deployment/SKILL.md` — deployment skill (loaded for all deploy tasks)
