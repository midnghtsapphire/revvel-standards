# oAudrey — Bill of Materials (BOM)

**Project:** oAudrey Hub (`oaudrey.com`)  
**Entity:** Freedom Angel Corp / MIDNGHTSAPPHIRE  
**BOM Version:** 1.0.0  
**Date:** 2026-04-26  
**Standard Reference:** `standards/OAUDREY_DEPLOYMENT_STANDARD.md`

---

## Purpose

This BOM lists every credential, API, service, and tool the BOM team needs to implement, deploy, and operate the oAudrey hub and its product subdomains. Check this before beginning any implementation work.

---

## P0 — Required Before First Deploy

| Item | Provider | Cost | Purpose | Secret Name | Status |
|---|---|---|---|---|---|
| DigitalOcean API Token | DigitalOcean | $0 (included) | `doctl` authentication for App Platform deploy | `DIGITALOCEAN_API_TOKEN` | ❌ Not provisioned |
| Doppler Service Token | Doppler | $0 (free tier) | Inject secrets into GitHub Actions | `DOPPLER_TOKEN` | ❌ Not provisioned |
| `oaudrey.com` domain | Namecheap | ~$15/yr | Apex domain for the hub | — | ❌ Verify active |

### How to provision DigitalOcean API Token

1. Log in at [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Go to **API** → **Personal Access Tokens** → **Generate New Token**
3. Name: `revvel-standards-deploy`; Scopes: **Read + Write**
4. Copy token immediately (shown once)
5. Add to GitHub: `gh secret set DIGITALOCEAN_API_TOKEN --repo midnghtsapphire/revvel-standards`
6. Add to Doppler: `doppler secrets set DIGITALOCEAN_API_TOKEN --value "YOUR_TOKEN"`

---

## P1 — Required for Full Operations

| Item | Provider | Cost | Purpose | Secret Name | Status |
|---|---|---|---|---|---|
| Namecheap API Key | Namecheap | $0 | Automated DNS record management | `NAMECHEAP_API_KEY` | ❌ Not provisioned |
| Namecheap Username | Namecheap | — | API authentication | `NAMECHEAP_USERNAME` | `uprisinghope` (known) |
| UptimeRobot monitors | UptimeRobot | $0 (free: 50 monitors) | Uptime alerts for oaudrey.com and subdomains | — | ❌ Not configured |
| Sentry / GlitchTip | Self-hosted or Sentry | $0 free tier | Error tracking for any server-side components | `SENTRY_DSN` | ❌ Not configured |
| Resend API Key | Resend | $0 (3k/mo free) | Alert emails for deployment failures and retro reports | `RESEND_API_KEY` | ❌ Not provisioned if not set |

---

## P2 — Nice to Have

| Item | Provider | Cost | Purpose | Secret Name | Status |
|---|---|---|---|---|---|
| Plausible Analytics | Plausible | $9/mo | Privacy-first web analytics (no cookies) for oaudrey.com | — | — Optional |
| GlitchTip (self-hosted) | Self-hosted | $0 | Open-source Sentry alternative on existing DO droplet | `GLITCHTIP_DSN` | — Optional |

---

## Infrastructure Inventory

| Service | Value | Notes |
|---|---|---|
| DigitalOcean region | `nyc` | App Platform free tier — `nyc` is default |
| App Platform tier | Static site (free) | ≤3 free static sites per account |
| Domain registrar | Namecheap (`uprisinghope`) | Set nameservers to DO (`ns1–3.digitalocean.com`) |
| Apex domain | `oaudrey.com` | Verify registration is active |
| Hub subdomain | `oaudrey.com` (apex) | App Platform handles SSL via Let's Encrypt |
| FieldWork subdomain | `fieldwork.oaudrey.com` | CNAME → App Platform URL |
| CI/CD | GitHub Actions | `deploy-oaudrey.yml` — triggered on push to `main` |
| Secrets management | Doppler | Project: `revvel-standards`, environment: `production` |
| Deploy spec | `oaudrey/.do/app.yaml` | Committed to repo |

---

## GitHub Actions Secrets Checklist

```bash
# Verify all required secrets are set
gh secret list --repo midnghtsapphire/revvel-standards

# Required secrets:
# DIGITALOCEAN_API_TOKEN  — Deploy automation
# DOPPLER_TOKEN           — Secrets injection
```

---

## Credential Gatekeeper

The **Credential Gatekeeper** workflow (`.github/workflows/credential-gatekeeper.yml`) auto-detects credential needs from issue text. Label any implementation issue with `ready-to-implement` to trigger it.

Keywords that trigger detection for oAudrey work:
- `digitalocean`, `doctl`, `app platform` → `DIGITALOCEAN_API_TOKEN`
- `namecheap`, `dns`, `domain` → `NAMECHEAP_API_KEY`
- `doppler`, `secrets sync` → `DOPPLER_TOKEN`

---

## Related Documents

- `standards/OAUDREY_DEPLOYMENT_STANDARD.md` — full deployment process
- `docs/SECRETS_MANAGEMENT.md` — full secrets matrix for all workflows
- `.env.example` — local dev environment variable reference
- `oaudrey/.do/app.yaml` — DigitalOcean App Platform spec
