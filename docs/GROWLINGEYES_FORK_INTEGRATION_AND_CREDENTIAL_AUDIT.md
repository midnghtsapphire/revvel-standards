# GrowlingEyes — Fork Integration Map + Credential Audit

**Date:** 2026-04-25
**Author:** OpenHands (gap analysis session)
**Repos reviewed:** `midnghtsapphire/growlingeyes`, `midnghtsapphire/revvel-standards`, 22 preserved forks

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Brand Change Status](#brand-change-status)
3. [Fork Integration Map](#fork-integration-map)
4. [Credential / API Audit](#credential--api-audit)
5. [Recommended Next Steps](#recommended-next-steps)

---

## Executive Summary

GrowlingEyes is a massive 18-domain OSINT threat intelligence platform with **75+ pages/routes**, 176+ RSS sources, and real-time intelligence dashboards. It's built on React + TypeScript + tRPC + Drizzle + PostgreSQL with a sophisticated navigation structure spanning 12 sidebar sections.

**Key findings:**
- **53 env vars referenced in code** but only **9 configured in DigitalOcean** deployment — 44 are missing/unconfigured
- **Brand change is incomplete** — code references both "GrowlingEyes" and "OSINT Watch" in different files
- **7 of 22 preserved forks** can directly enhance GrowlingEyes functionality with new pages or data sources
- **DashboardLayout sidebar is a stub** (only 2 placeholder items) while `OsintLayout` has the real 75+ item nav — the DashboardLayout needs to be replaced or synced

---

## Brand Change Status

The platform is transitioning from **"OSINT Watch"** to **"GrowlingEyes"** but the change is **incomplete**:

### Already Branded "GrowlingEyes
- Landing page (`Landing.tsx`) — uses GrowlingEyes logos, CDN assets, hero banners
- `OsintLayout.tsx` — sidebar header says "GrowlingEyes — The Watcher"
- `package.json` — name is `growlingeyes`
- `.do/app.yaml` — app name is `growlingeyes`
- All marketing assets on CloudFront CDN

### Still References "OSINT Watch
| File | What's Outdated |
|---|---|
| `drizzle/schema.ts` | Table/column comments reference "OSINT Watch" |
| `server/scraper.ts` | Internal comments mention "OSINT Watch" |
| `server/routers.ts` | Route descriptions use old name |
| `server/newsletter.ts` | Email templates may reference old brand |
| `server/broadcastScraper.ts` | Comments use old name |
| `server/watchlistRouter.ts` | Comments use old name |
| `.coderabbit.yaml` | Config references old name |
| `client/src/pages/Watchlist.tsx` | UI text may reference old name |
| `docs/MARKETING_PLAN.md` | Entire doc titled "OSINT Watch" |
| `docs/KANBAN.md` | Title says "OSINT Watch" |

### Parent Organization Brand
Per `revvel-standards/docs/BRAND_ARCHITECTURE.md`:
- **Canonical legal name:** Freedom Angel Corp (NO "s", matches EIN 86-1209156)
- **GitHub org:** Freedom-Angel-Corp (hyphenated)
- **Product family:** Revvel (product brand), GrowlingEyes (OSINT product)
- **Legacy:** "Freedom Angel Corps" (with S) exists in older docs — NOT canonical

---

## Fork Integration Map

### Category 1: Direct GrowlingEyes Enhancement (Build New Pages/Tabs)

These forks contain code or data that can be integrated into GrowlingEyes as new navigation items or data sources.

| Fork | What It Is | Integration Point | Effort |
|---|---|---|---|
| **sleuthkit** | Digital forensics file system analysis library (C/C++) | New "Forensic Analysis" tab under SURVEILLANCE section — provide file carving, disk image analysis, timeline generation for uploaded evidence files | High — requires backend bindings to C library, or use TSK command-line tools via child_process |
| **artifacts** + **artifacts-kb** | ForensicArtifacts Python library — defines what forensic artifacts to collect from Windows/Mac/Linux | New "Forensic Artifacts" reference tab — searchable knowledge base of OS artifacts (registry keys, browser history paths, log locations) for investigators | Medium — parse YAML artifact definitions, serve as searchable DB |
| **trawl** | Network traffic analysis tool | Enhance existing "Cyber Threats" or "Counter-Intel" pages with network capture analysis capability | Medium |
| **ForensicsTools** + **Digital-Forensics-Guide** | Curated lists of forensic tools and educational resources | New "Forensic Toolkit" reference page under SURVEILLANCE — link directory + how-to guides for each domain's forensic methods | Low — mostly static content curation |
| **OSACT** (OpenSourceArtifactCollectionToolkit) | Python modules for live Windows forensic artifact collection | Could power a "Live Artifact Scanner" feature if GrowlingEyes ever adds endpoint analysis capability | High — Windows-specific, niche use case |

### Category 2: Claude/OpenClaw Ecosystem (DevOps / Agent Tooling — Not GrowlingEyes Pages)

These forks support your AI agent development workflow, not GrowlingEyes directly. They're valuable for your `revvel-standards` automation pipeline.

| Fork | What It Is | Value to Your Stack |
|---|---|---|
| **claw-code** | The viral OpenClaw coding agent (100K+ stars) | Reference implementation for your own agent workflows |
| **awesome-openclaw-skills** | 5,400+ skill catalog | Skill library for building new agents |
| **OpenClaw-Medical-Skills** | Medical AI skills | Domain-specific agent capabilities |
| **Claude-Skills-GRC** | Governance/Risk/Compliance skills (94% vs 72% baseline) | Directly supports your compliance workflows in revvel-standards |
| **clawe** | Multi-agent coordination | Architecture reference for parallel development skill |
| **babysitter** | Claude Code workflow orchestrator | Useful for managing complex multi-step agent tasks |
| **OpenClaw-Docs-Sync** | Documentation sync tool | Could auto-sync your skills vault or wiki |
| **claude-code-hooks-mastery** | Claude Code hooks guide | Reference for building hooks in your agent pipeline |
| **agent-of-empires** | Terminal session manager for coding agents | Multi-agent tmux management |
| **awesome-cli-coding-agents** | Directory of terminal AI coding agents | Reference catalog |
| **OpenMythos** | Claude Mythos architecture reconstruction | Research reference |

### Category 3: Developer Tools (Indirect Value)

| Fork | What It Is | Potential Use |
|---|---|---|
| **chrome-devtools-mcp** | Chrome DevTools MCP server | Useful for testing/debugging GrowlingEyes UI with AI agents |
| **XcodeBuildMCP** | Xcode build MCP server | Relevant only if you build GrowlingEyes as a native iOS app via Expo |
| **awesome-opensource-boilerplates** | SaaS boilerplate catalog | Reference for future Revvel products |

### Proposed New Navigation Sections

If you integrate the forensic forks, here's how the sidebar could expand:

```text
SURVEILLANCE (existing)
├── LiDAR Mapping          (existing)
├── Missing Persons        (existing)  
├── Gov Crime Docs         (existing)
├── Drone No-Fly Zones     (existing)
├── Vet Dashboard          (existing)
├── 🆕 Forensic Artifacts  (from artifacts + artifacts-kb)
├── 🆕 Forensic Toolkit    (from ForensicsTools + Digital-Forensics-Guide)  
└── 🆕 Network Analysis    (from trawl)
```

---

## Credential / API Audit

### Environment Variables: Code vs. Deployment

GrowlingEyes references **53 environment variables** in server code. Only **9** are configured in DigitalOcean (`.do/app.yaml`). The rest are completely missing from deployment.

### Critical (App Won't Function Without These)

| Env Var | In Code? | In DO Deploy? | Status | How to Get |
|---|---|---|---|---|
| `DATABASE_URL` | Yes | Yes (empty) | **NEEDS VALUE** | DigitalOcean managed DB connection string |
| `JWT_SECRET` | Yes | Yes (empty) | **NEEDS VALUE** | Generate: `openssl rand -hex 32` |
| `GOOGLE_OAUTH_CLIENT_ID` | Yes | Yes (empty) | **NEEDS VALUE** | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Yes | Yes (empty) | **NEEDS VALUE** | Same as above |
| `OPENROUTER_API_KEY` | Yes | Yes (empty) | **NEEDS VALUE** | openrouter.ai → API Keys |

### Important (Core Features Break Without These)

| Env Var | Feature It Powers | Status | How to Get |
|---|---|---|---|
| `GOOGLE_MAPS_API_KEY` | Tactical Map, Live Map | In DO (empty) | Google Cloud Console → Maps JavaScript API |
| `RESEND_API_KEY` | Email/Newsletter system | In DO (empty) | resend.com → API Keys |
| `STRIPE_SECRET_KEY` | Subscription/payments | **NOT in DO** | stripe.com → Dashboard → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe event verification | **NOT in DO** | Stripe Dashboard → Webhooks |

### Data Source APIs (Domains Fail Without These)

| Env Var | Domain(s) | Free? | How to Get |
|---|---|---|---|
| `ACLED_API_KEY` | Geopolitical/Conflict | Free for researchers | acleddata.com → Register |
| `ACLED_EMAIL` | Geopolitical/Conflict | — | Your registered email |
| `AISSTREAM_API_KEY` | Maritime vessel tracking | Free tier | aisstream.io → Sign up |
| `ADSBX_API_KEY` | Air Activity / ADS-B | Free tier | adsbexchange.com → API |
| `EIA_API_KEY` | Pipeline & Energy | Free | eia.gov → Register |
| `FRED_API_KEY` | Economic/Markets | Free | fred.stlouisfed.org → API Keys |
| `GDELT_PROXY_URL` | Cross-domain events | Free | Custom proxy or direct GDELT API |
| `GDELT_PROXY_TOKEN` | Cross-domain events | Free | Custom proxy auth token |
| `HIBP_API_KEY` | Cyber Threats (breach data) | $3.50/mo | haveibeenpwned.com → API |
| `NASA_FIRMS_KEY` | Wildfire detection | Free | firms.modaps.eosdis.nasa.gov |
| `NASA_FIRMS_MAP_KEY` | Wildfire map tiles | Free | Same as above |
| `NVD_API_KEY` | Cyber Threats (CVEs) | Free | nvd.nist.gov → Request key |
| `OPENSKY_CLIENT_ID` | Air tracking | Free | opensky-network.org → Register |
| `OPENSKY_CLIENT_SECRET` | Air tracking | Free | Same as above |
| `OPENTOPOGRAPHY_API_KEY` | LiDAR Mapping | Free | opentopography.org → Register |
| `OTX_API_KEY` | Cyber Threats (AlienVault) | Free | otx.alienvault.com → Register |
| `SHODAN_API_KEY` | Cyber Threats (Shodan) | Free tier / $49 member | shodan.io → Account |
| `VIRUSTOTAL_API_KEY` | Cyber Threats | Free tier | virustotal.com → API |

### Notification / Integration APIs

| Env Var | Feature | Status | How to Get |
|---|---|---|---|
| `SLACK_WEBHOOK_URL` | Slack notifications | **NOT in DO** | Slack → Apps → Incoming Webhooks |
| `SLACK_CHANNEL` | Slack channel target | **NOT in DO** | Channel name (e.g., #alerts) |
| `PAGERDUTY_ROUTING_KEY` | PagerDuty alerts | **NOT in DO** | PagerDuty → Services → Integration |
| `DISCORD_BOT_TOKEN` | Discord integration | **NOT in DO** | Discord Developer Portal → Bot |
| `DISCORD_CHANNEL_IDS` | Discord channels | **NOT in DO** | Right-click channel → Copy ID |
| `TELEGRAM_BOT_TOKEN` | Telegram listener | **NOT in DO** | @BotFather on Telegram |
| `TWILIO_ACCOUNT_SID` | SMS notifications | **NOT in DO** | twilio.com → Console |
| `TWILIO_AUTH_TOKEN` | SMS notifications | **NOT in DO** | Same |
| `TWILIO_FROM` | SMS sender number | **NOT in DO** | Twilio phone number |
| `TWILIO_TO` | SMS recipient | **NOT in DO** | Your phone number |
| `MUX_TOKEN_ID` | Video streaming | **NOT in DO** | mux.com → Settings → API |
| `MUX_TOKEN_SECRET` | Video streaming | **NOT in DO** | Same |

### Email (SMTP)

| Env Var | Status | Notes |
|---|---|---|
| `SMTP_HOST` | **NOT in DO** | e.g., smtp.gmail.com or Resend SMTP |
| `SMTP_PORT` | **NOT in DO** | Usually 587 |
| `SMTP_USER` | **NOT in DO** | Email address |
| `SMTP_PASS` | **NOT in DO** | App password |
| `ALERT_EMAIL` | **NOT in DO** | Recipient for system alerts |

### Internal / GitHub

| Env Var | Status | Notes |
|---|---|---|
| `GITHUB_TOKEN` / `GH_TOKEN` | **NOT in DO** | For GitHub integration (issues, code audit) |
| `GITHUB_REPO` | **NOT in DO** | e.g., midnghtsapphire/growlingeyes |
| `REST_API_KEY` | **NOT in DO** | Custom API key for REST API v1 auth |
| `OWNER_OPEN_ID` | **NOT in DO** | Owner's OpenID for admin access |
| `APP_ID` | **NOT in DO** | Application identifier |
| `PRODUCTION_URL` | **NOT in DO** | e.g., <https://growlingeyes.com> |

### Summary Scorecard

| Category | Total Vars | Configured in DO | Missing | % Complete |
|---|---|---|---|---|
| **Critical (app basics)** | 5 | 5 (all empty) | 0 listed, all need values | 0% |
| **Core features** | 4 | 2 | 2 | 0% |
| **Data source APIs** | 18 | 0 | 18 | 0% |
| **Notifications** | 12 | 0 | 12 | 0% |
| **Email/SMTP** | 5 | 0 | 5 | 0% |
| **Internal/GitHub** | 6 | 0 | 6 | 0% |
| **Runtime** | 3 | 2 (NODE_ENV, PORT) | 1 | 67% |
| **TOTAL** | **53** | **9** | **44** | **17%** |

---

## Recommended Next Steps

### Priority 1: Get the App Running (Credential Provisioning)

1. **Set up Doppler project** for GrowlingEyes with environments: `dev`, `staging`, `prod`
2. **Provision the 5 critical vars** first (DATABASE_URL, JWT_SECRET, Google OAuth, OpenRouter)
3. **Add free API keys** — at least 12 of the 18 data source APIs are completely free, just need registration:
   - ACLED, EIA, FRED, NASA FIRMS, NVD, OpenSky, OpenTopography, OTX — all free, 5 min signup each
4. **Wire Doppler → DigitalOcean** sync so secrets auto-deploy

### Priority 2: Complete the Brand Change

1. Search-and-replace "OSINT Watch" → "GrowlingEyes" in the 10 files identified above
2. Update docs (MARKETING_PLAN.md, KANBAN.md) to use current branding
3. Verify all email templates use "GrowlingEyes" not "OSINT Watch"

### Priority 3: Fork Integration (New Features)

1. **Quick win (Low effort):** Create "Forensic Toolkit" page from ForensicsTools + Digital-Forensics-Guide — curated link directory, no backend needed
2. **Medium effort:** Parse `artifacts` + `artifacts-kb` YAML files into a searchable "Forensic Artifacts" knowledge base
3. **Higher effort:** Integrate `sleuthkit` for file analysis or `trawl` for network analysis — requires backend work

### Priority 4: Fix DashboardLayout Stub

The `DashboardLayout.tsx` component only has 2 placeholder menu items (`Page 1`, `Page 2`) while `OsintLayout.tsx` has the full 75+ item navigation. Either:
- Remove DashboardLayout and use OsintLayout everywhere, OR
- Sync DashboardLayout's menu items with OsintLayout's NAV_ITEMS

### Credential Gatekeeper Integration

The credential gatekeeper workflow (PR #308) in `revvel-standards` can be extended to:
1. Auto-scan GrowlingEyes issues for credential requirements
2. Cross-reference against the audit table above
3. Generate a BOM of what APIs need provisioning
4. Use Doppler to track provisioning status

Create an issue on `midnghtsapphire/growlingeyes` with the full credential inventory above and the gatekeeper will track provisioning progress.
