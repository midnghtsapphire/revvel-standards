# Revvel Ecosystem: Complete Infrastructure Map

**Author:** Audrey Evans / GlowStar Labs
**Version:** 1.1.0
**Date:** April 3, 2026
**Status:** Single Source of Truth (SSOT)

---

## 1. DigitalOcean Infrastructure

### 1.1. Droplets

This table lists all known active droplets and their primary services.

| Name | IP Address | Services | Access Credentials |
| :--- | :--- | :--- | :--- |
| **Primary Production** | `164.90.148.7` | Nginx, MindMappr Bot, PawSitting, TheAltText, ReeseReviews, ForensicStudio, Dashboard | `root` / `+j2swyCE.*B6kdg` |
| **Dashboard (Old)** | `147.182.211.246` | Legacy Dashboard (to be decommissioned) | SSH Key (Unknown) |
| **GrowlingEyes** | `164.90.148.7` | Nginx, PM2, Node.js App (`growlingeyes.com` / port 3003) | `root` / SSH Key (`growlingeyes_universal`) |
| **datascope-standalone** | `68.183.29.25` | Datascope Application | SSH Key |
| **marketing-automation** | `159.65.231.36` | Marketing Automation Suite | SSH Key |
| **project-face-standalone** | `192.241.141.186` | Project Face Application | SSH Key |
| **data-router-standalone** | `24.199.90.253` | Universal Data Router | SSH Key |
| **ai-benchmarking** | `198.211.98.52` | AI Benchmarking Tools | SSH Key |
| **revenue-apps** | `104.248.51.82` | Ordain.Church, Instant Certificates, etc. | SSH Key |

> **Note:** SSH access to most droplets is restricted to authorized SSH keys. The Primary Production droplet password is provided for emergency access only.

### 1.2. API Keys & Services

This is a central reference for critical API keys and service credentials.

| Service | Key / Token | Notes |
| :--- | :--- | :--- |
| **OpenRouter** | `OPENROUTER_API_KEY` | Stored as an environment variable in the sandbox. |
| **Stripe** | `pk_live_...`, `sk_live_...` | Live and Test keys are stored in a secure vault and injected as environment variables. |
| **Google Cloud** | `private-gpu-c7b617abaa99.json` | Service account for the "Private GPU" project. |
| **Zenodo** | `vcLlx7BOdvyxmT004hTKNJClrEiBglVR6YwT2J1HmU5faKOetzzIO3Tteisd` | API Token for user `Midnghtsapphire`. ORCID: `0009-0005-0663-7832`. |
| **DigitalOcean** | `dop_v1_...` | Stored as `DIGITALOCEAN_TOKEN` environment variable. |

---

## 2. Domains and DNS

All domains are managed through GoDaddy or Namecheap, with DNS pointing to DigitalOcean or GitHub Pages.

| Domain | Points To | DNS Provider | Purpose |
| :--- | :--- | :--- | :--- |
| **meetaudreyevans.com** | GitHub Pages (`midnghtsapphire.github.io`) | GoDaddy / Namecheap | Main Hub / Portfolio |
| **reesereviews.com** | `164.90.148.7` | GoDaddy | Reese Reviews Application |
| **yumyumcode.com** | GitHub Pages (`yumyumcode`) | GoDaddy / Namecheap | Consulting & Accessibility |
| **growlingeyes.com** | `164.90.148.7` (Droplet) / DO App Platform | GoDaddy | Multi-Domain Threat Intelligence Platform |
| **truthslayer.com** | DigitalOcean Droplet | GoDaddy / Namecheap | Data Intelligence |
| **glowstarlabs.com** | GitHub Pages | GoDaddy / Namecheap | Corporate Hub |

---

## 3. GitHub Account Structure

- **Primary Account:** `MIDNGHTSAPPHIRE`
- **Total Repositories:** 300+

### Core Repositories

| Repository | Purpose | Deployment |
| :--- | :--- | :--- |
| **revvel-standards** | Master Standards & Documentation (this repo) | Manual |
| **revvel-app-template** | Boilerplate template for all new apps | Manual |
| **rvvel** | Main site (meetaudreyevans.com) | GitHub Pages |
| **growlingeyes** | Multi-domain threat intelligence (growlingeyes.com) | Droplet / DO App Platform |
| **mindmappr** | Cognitive mapping tool / MindMappr bot backend | GitHub Pages / Droplet |
| **mindmappr-setup** | Droplet config, backup, job queue | Droplet (164.90.148.7) |
| **Pawsitting** | Pet sitting management app | GitHub Pages |
| **openclaw-ui** | Agent Management SaaS Platform | Droplet / Vercel |
| **thealttext** | AI Accessibility Tool | GitHub Pages |
| **universal-data-router** | Data management tool | GitHub Pages |
| **SSRN_Whitepapers** | Academic & Technical research | Manual |

---

## 4. Bot & Communication Channels

| Platform | Channel / Group | Bot Name | How to Interact |
| :--- | :--- | :--- | :--- |
| **Telegram** | RISINGALOHA | `@googlieeyes_bot` | Mention the bot in the group. |
| **Slack** | RISINGALOHA | `@mindmappr` | Mention the bot in any channel. |

### MindMappr Bot Setup
- **Location:** MindMappr Droplet (`164.90.148.7`)
- **Telegram Token:** *(Refer to `.env` in `/root/mindmappr`)*
- **Slack Token:** *(Refer to `.env` in `/root/mindmappr`)*
- **Group IDs:** *(Configured in `config.json`)*

---

## 5. Corporate Entity Hierarchy

This hierarchy is used for all legal, branding, and SEO purposes. The anchor founding date for all properties is **2010**.

```text
Freedom Angel Corp (2010, CO, EIN: 86-1209156, Non-Profit, Good Standing)
├── Freedom Angel Fighters (Advocacy & Anti-Trafficking)
├── Angel Reporter(s) (Investigative Journalism, Copyright 2010 & 2018)
├── Aloha Notary & Copies (Native Hawaiian Veterans & Military)
├── IT Division
│   ├── Angel Reporter LLC (CA, Entity #201313610094, 2013, SUSPENDED)
│   ├── XI Website Solutions LLC
│   ├── Spiderwebz Designs
│   ├── Evans Digital Assets LLC (CO, Entity #20181113423, 2018)
│   └── Fast Macros
└── Product Brands
    ├── GlowStarLabs / Audrey Evans Official (umbrella)
    ├── Revvel / Hailstorm (music only)
    ├── MeetAudreyEvans (hub)
    ├── PawSitting
    ├── TheAltText
    ├── Reese Reviews
    ├── Forensic Studio
    ├── RevvelPress
    └── Revvel Music Studio
```

---

## 6. Deployment & Maintenance

### GitHub Pages (Auto-deploy)
Repos like `rvvel`, `mindmappr`, and `Pawsitting` use GitHub Actions for automatic deployment upon pushing to the `main` branch.

### Droplet Services
1. SSH into the droplet.
2. Navigate to the project directory (e.g., `/root/mindmappr`).
3. Pull latest changes: `git pull origin main`.
4. Restart services using `pm2 restart all` or `systemctl restart <service>`.

### CI/CD Pipeline
- Push to `main` triggers GitHub Actions for build, test, and deploy.
- CodeMagic handles mobile (React Native/Expo) builds and store submissions.
- Venice AI code review is mandatory before every push.
- Auto-deploy to DigitalOcean on push to `main`.
- Reference templates: `templates/cicd/` in this repository.

---

## 7. Immediate Contacts & Support
- **Primary Contact:** Audrey Evans (<angelreporters@gmail.com>)
- **Technical Support:** Submit request at [https://help.manus.im](https://help.manus.im)

---

**References:**
- DigitalOcean Dashboard: [https://cloud.digitalocean.com](https://cloud.digitalocean.com)
- GitHub Org: [https://github.com/MIDNGHTSAPPHIRE](https://github.com/MIDNGHTSAPPHIRE)
- Revvel Standards: `MIDNGHTSAPPHIRE/revvel-standards`

---

## 8. Freedom Angel Corps Repo Manager UI (2026-04-15)

A static, zero-dependency standards audit dashboard lives inside this
repository at [`ui/freedom-angel-repo-manager/`](../../ui/freedom-angel-repo-manager/).

| Attribute | Value |
|---|---|
| **Path** | `ui/freedom-angel-repo-manager/` |
| **Runtime** | Browser (HTML + CSS + vanilla JS) |
| **External calls** | `api.github.com` only |
| **Credentials** | Optional fine-grained PAT, stored in `localStorage` |
| **Write access** | None — strictly read-only against GitHub |
| **Hosting options** | `file://`, localhost, or GitHub Pages (`main` / root) |
| **Accessibility** | All 7 modes from `ACCESSIBILITY_STANDARD.md` §4 |

Inherits branding and compliance from **Freedom Angel Corp** (root
entity, EIN 86-1209156). See
[`ui/freedom-angel-repo-manager/README.md`](../../ui/freedom-angel-repo-manager/README.md)
for the 10-step bootstrap verification checklist.
