# Revvel Ecosystem: Complete Infrastructure Map

**Version:** 1.0.0
**Date:** 2026-02-25
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
| **project-face-standalone**| `192.241.141.186`| Project Face Application | SSH Key |
| **data-router-standalone** | `24.199.90.253` | Universal Data Router | SSH Key |
| **ai-benchmarking** | `198.211.98.52` | AI Benchmarking Tools | SSH Key |
| **revenue-apps** | `104.248.51.82` | Ordain.Church, Instant Certificates, etc. | SSH Key |

### 1.2. API Keys & Services

This is a central reference for critical API keys and service credentials.

| Service | Key / Token | Notes |
| :--- | :--- | :--- |
| **OpenRouter** | `OPENROUTER_API_KEY` | Stored as an environment variable in the sandbox. |
| **Stripe** | `pk_live_...`, `sk_live_...` | Live and Test keys are stored in a secure vault and injected as environment variables. |
| **Google Cloud** | `private-gpu-c7b617abaa99.json` | Service account for the "Private GPU" project. |
| **Zenodo** | `vcLlx7BOdvyxmT004hTKNJClrEiBglVR6YwT2J1HmU5faKOetzzIO3Tteisd` | API Token for user `Midnghtsapphire`. ORCID: `0009-0005-0663-7832`. |
| **DigitalOcean** | `dop_v1_...` | Stored as `DIGITALOCEAN_TOKEN` environment variable. |

## 2. Domains and DNS

All domains are managed through GoDaddy or Namecheap, with DNS pointing to DigitalOcean or GitHub Pages.

| Domain | Points To | DNS Provider | Purpose |
| :--- | :--- | :--- | :--- |
| meetaudreyevans.com | GitHub Pages (`midnghtsapphire.github.io`) | GoDaddy | Main Hub / Portfolio |
| reesereviews.com | `164.90.148.7` | GoDaddy | Reese Reviews Application |
| yumyumcode.com | TBD | GoDaddy | Consulting & Accessibility |
| growlingeyes.com | `164.90.148.7` (Droplet) / DO App Platform | GoDaddy | Multi-Domain Threat Intelligence Platform |
| truthslayer.com | TBD | GoDaddy | Data Intelligence |
| glowstarlabs.com | TBD | GoDaddy | Corporate Hub |

## 3. GitHub Account Structure

- **Primary Account:** `MIDNGHTSAPPHIRE`
- **Total Repositories:** 300+
- **Core Repositories:**
    - `MIDNGHTSAPPHIRE/revvel-standards`: This repository.
    - `MIDNGHTSAPPHIRE/revvel-app-template`: The boilerplate template for all new apps.
    - `MIDNGHTSAPPHIRE/rvvel`: The source for `meetaudreyevans.com`.
    - `MIDNGHTSAPPHIRE/growlingeyes`: The source for `growlingeyes.com` (formerly osint-watch).
    - `MIDNGHTSAPPHIRE/mindmappr`: The MindMappr bot backend.
    - Individual app repositories (e.g., `Pawsitting`, `the-alt-text`).

## 4. Bot & Communication Channels

| Platform | Channel / Group | Bot Name | How to Interact |
| :--- | :--- | :--- | :--- |
| **Telegram** | RISINGALOHA | `@googlieeyes_bot` | Mention the bot in the group. |
| **Slack** | RISINGALOHA | `@mindmappr` | Mention the bot in any channel. |

## 5. Corporate Entity Hierarchy

This hierarchy is used for all legal, branding, and SEO purposes. The anchor founding date for all properties is **2010**.

```
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
