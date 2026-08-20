# 🛰️ oAudrey — Automation Software Hub

## Live Deployment

▶️ **[Open the live app & test it](https://midnghtsapphire.github.io/revvel-standards/docs/oaudrey/)**

## What Is This

**oAudrey** is the public-facing **Automation Software Hub** for
**Freedom Angel Corp** — an autonomous umbrella over a growing family of
software, mobile apps, autonomous systems, marketing and ecommerce products.
Its purpose is to _fill the gaps that need filling_ with self-running,
forward-looking automation.

This directory holds the **concept landing page** for the hub — a single
static `index.html` (Tailwind CSS via CDN), matching the authoring convention
used by `/fieldwork` in this repository.

---

## Giving Pledge (mission-linked)

A percentage of proceeds from every oAudrey product — software, mobile apps,
autonomous systems, marketing and ecommerce — is donated to programs that
support **trafficking survivors** with:

- **Reskilling** — technical training, certifications, mentor-matching.
- **Recovery** — trauma-informed care, counseling, safe-housing support.
- **Restoration** — legal aid, re-entry resources, long-term stability.

Administered through **Freedom Angel Fighters**, the advocacy and
anti-trafficking program of Freedom Angel Corp (Colorado, EIN 86-1209156,
Non-Profit, Good Standing).

---

## Subdomain Model

Per [`docs/Master_Inventory/TEST_ENVIRONMENTS_STANDARD.md`](../docs/Master_Inventory/TEST_ENVIRONMENTS_STANDARD.md),
every Freedom Angel Corp product ships to an `<app>.oaudrey.com` subdomain
during the **live-test** stage, and is surfaced as a **tab** in the oAudrey
hub landing page.

> **Canonical domain:** `oaudrey.com`. Older copies of the standards doc may
> still reference `openaudrey.com` — `oaudrey.com` is the correct apex for
> this hub and all product subdomains.

| Product (tab)               | Subdomain                  | Source in this repo                                              |
| --------------------------- | -------------------------- | ---------------------------------------------------------------- |
| **FieldWork**               | `fieldwork.oaudrey.com`    | [`/fieldwork`](../fieldwork)                                     |
| GrowlingEyes                | `growlingeyes.oaudrey.com` | _(external repo)_                                                |
| Penny Sovereign Yield Scout | `penny.oaudrey.com`        | [`/penny-sovereign-yield-scout`](../penny-sovereign-yield-scout) |
| Agent Factory               | `agents.oaudrey.com`       | [`/agent-factory`](../agent-factory)                             |
| Marketing & Ecommerce       | `market.oaudrey.com`       | _(external repo)_                                                |
| **ColdTrace**               | `coldtrace.oaudrey.com`    | [`/coldtrace`](../coldtrace)                                     |
| **Reese Reviews**           | `reesereviews.com`         | _(external repo: steel-white)_                                   |

---

## Agent Factory lane

The oAudrey **Agent Factory** now reserves a named **Rex** assignee lane for
research-first automation that should use the repo's **no-key Perplexity**
path. In practice that means:

- **Rex** = label-first assignee for oAudrey agent-factory work
- **Perplexity no-key** = use the `helallao/perplexity-ai` bridge, not a
  required `PERPLEXITY_API_KEY`
- **Proof of Life** = choose `Rex` in
  [`docs/PROOF_OF_LIFE_PROCESS.md`](../docs/PROOF_OF_LIFE_PROCESS.md) when the
  run should stay in the oAudrey / Agent Factory lane

---

## Project Layout

```text
oaudrey/
├── README.md            ← You are here
├── index.html           ← Hub landing page (static, Tailwind CDN)
├── 404.html             ← Branded error page
├── dns-records.yml      ← Declarative DNS records (registrar-agnostic)
└── .do/
    └── app.yaml         ← DigitalOcean App Platform spec
```

---

## Deployment

The oAudrey hub deploys automatically to **DigitalOcean App Platform** on every push to `main` that touches `oaudrey/**` or `fieldwork/**`.

### CI/CD Pipeline

| Step                 | Workflow                                 | Trigger                             |
| -------------------- | ---------------------------------------- | ----------------------------------- |
| Deploy               | `.github/workflows/deploy-oaudrey.yml`   | push to `main`                      |
| DNS Sync             | `.github/workflows/sync-oaudrey-dns.yml` | after deploy; weekly Monday; manual |
| Health-check + retro | `.github/workflows/oaudrey-retro.yml`    | after deploy; weekly Monday         |

### Required Secret

Before the automated deploy can run, provision `DIGITALOCEAN_API_TOKEN` in GitHub repo secrets:

```bash
gh secret set DIGITALOCEAN_API_TOKEN --repo midnghtsapphire/revvel-standards
```

### Manual Deploy

```bash
# Install doctl (one time)
brew install doctl   # macOS
doctl auth init      # paste your DO API token

# Deploy or update
doctl apps create --spec oaudrey/.do/app.yaml --wait
# or update existing:
APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | grep "oaudrey-hub" | awk '{print $1}')
doctl apps update "$APP_ID" --spec oaudrey/.do/app.yaml
```

### DNS Setup (multi-registrar — Namecheap / GoDaddy / Porkbun)

`oaudrey.com` may live on Namecheap, GoDaddy, or Porkbun. The repo ships a
**registrar-agnostic** sync that pushes the declarative record list in
[`oaudrey/dns-records.yml`](./dns-records.yml) to whichever registrar is
holding the domain — no code changes when you migrate.

1. Provision the registrar's API credentials via the **Credential Gatekeeper**
   (see `standards/OAUDREY_DEPLOYMENT_STANDARD.md` for exact secret names).
2. Run the **Sync oAudrey DNS records** workflow
   (`.github/workflows/sync-oaudrey-dns.yml`) — it auto-detects the active
   registrar from whichever secrets are set, resolves the App Platform ingress
   via `doctl`, and pushes every record in `oaudrey/dns-records.yml`.
3. The workflow also runs automatically after every successful deploy and
   weekly on Mondays as a drift-correction sweep.

| Registrar | Credentials needed                                                                     | Apex strategy                                                               |
| --------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Namecheap | `NAMECHEAP_API_KEY`, `NAMECHEAP_API_USER`, `NAMECHEAP_USERNAME`, `NAMECHEAP_CLIENT_IP` | move apex to DigitalOcean nameservers (Namecheap API rejects ALIAS at apex) |
| GoDaddy   | `GODADDY_API_KEY`, `GODADDY_API_SECRET`                                                | resolve `APP_TARGET` to an IP — sync auto-translates apex `ALIAS` → `A`     |
| Porkbun   | `PORKBUN_API_KEY`, `PORKBUN_SECRET_API_KEY`                                            | native `ALIAS` at apex                                                      |

Local dry-run (no API calls):

```bash
DRY_RUN=true \
  APP_TARGET=oaudrey-hub-abcde.ondigitalocean.app \
  PORKBUN_API_KEY=test PORKBUN_SECRET_API_KEY=test \
  node scripts/sync-dns-records.js
```

Full guide: `standards/OAUDREY_DEPLOYMENT_STANDARD.md`

---

## 🚀 Running Locally

Want to see the oAudrey hub on your local machine instead of DigitalOcean? It's easy!

**Quick Start:**

```bash
cd oaudrey
python3 -m http.server 8080
# → open http://localhost:8080
```

**📖 For complete local setup instructions**, including:

- Multiple server options (Python, Node.js, PHP)
- GitHub Pages deployment
- Testing with product tabs
- Troubleshooting

**See [`LOCAL_SETUP.md`](./LOCAL_SETUP.md)** — your complete guide to running oAudrey locally.

---

## Design System (Summary)

| Token      | Value                                    |
| ---------- | ---------------------------------------- |
| Background | `#0B0F1A` (void)                         |
| Surface    | `#121828` (carbon) / `#1E2638` (steel)   |
| Text       | `#E7ECF5` (ice) / `#8A93A6` (mist)       |
| Accent 1   | `#7C5CFF` (iris — autonomy / automation) |
| Accent 2   | `#3DDCFF` (cyan — signal / data)         |
| Mission    | `#F7C948` (gold — giving pledge)         |
| Advocacy   | `#FF6B6B` (ember — restoration)          |
| Type       | Inter (sans), JetBrains Mono (metadata)  |

Forward-looking posture: aurora gradients, subtle circuit grid, glass
surfaces. Accessible tabs with full keyboard support
(`ArrowLeft/Right/Up/Down`, `Home`, `End`) and `prefers-reduced-motion`
respected.

---

## Status

- [x] Hub landing page v1.0 (static, single file)
- [x] FieldWork tab linked to `fieldwork.oaudrey.com`
- [x] Reese Reviews tab linked to `reesereviews.com`
- [x] Giving Pledge section (reskilling, recovery, restoration)
- [x] Original oAudrey SVG monogram mark in nav (orbit + aperture + signal dot)
- [x] Branded `404.html` error page
- [x] DigitalOcean App Platform spec (`oaudrey/.do/app.yaml`)
- [x] GitHub Actions deploy workflow (`deploy-oaudrey.yml`)
- [x] Post-deploy health-check + retro workflow (`oaudrey-retro.yml`)
- [x] BOM for BOM team (`docs/oaudrey/BOM.md`)
- [x] Full deployment standard (`standards/OAUDREY_DEPLOYMENT_STANDARD.md`)
- [x] Multi-registrar DNS sync (`scripts/sync-dns-records.js` — Namecheap, GoDaddy, Porkbun)
- [x] DNS sync workflow (`.github/workflows/sync-oaudrey-dns.yml`)
- [x] Credential Gatekeeper detects GoDaddy + Porkbun keys
- [x] Rex assignee lane documented for Agent Factory + no-key Perplexity research
- [ ] Provision `DIGITALOCEAN_API_TOKEN` secret in repo settings
- [ ] Provision a registrar credential set (Namecheap / GoDaddy / Porkbun) via the Gatekeeper
- [ ] Verify `oaudrey.com` apex resolves to App Platform
- [ ] Extend brand system: supporting illustrations, bot characters, product iconography — all original, **no third-party assets reused**.
- [ ] Connect tabs to live metrics pulled from each product subdomain

## Features

- **Static HTML Structure**: No complex build steps or dependencies. Pure HTML, CSS, and JS for maximum performance and reliability.
- **Progressive Web App (PWA) Ready**: Includes a `manifest.json` and basic capabilities to install as a standalone app.
- **Accessibility First**: Designed with high contrast, semantic HTML, and full keyboard navigation.
- **Secure by Default**: Configured with strict Content-Security-Policy (CSP) headers and secure external links.
