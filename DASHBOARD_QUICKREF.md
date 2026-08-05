# Project Dashboard - Quick Reference

## Problem Solved

**Before:** No visibility into projects without "looking in folders"
- BOM inventory scattered across files
- Test URLs hidden in README files
- Project status unclear
- Domain confusion (oaudrey? freedom angel? soup2bowl?)
- Handoff docs hard to find

**After:** Centralized dashboard with all project data
- Single HTML page with everything
- CLI tool for terminal access
- Auto-updates every 4 hours
- Live search across all data
- Beautiful UI

## Quick Access

### View in Browser
```bash
npm run dashboard open
```

### CLI Commands
```bash
npm run dashboard                     # Show summary
npm run dashboard projects            # List all projects
npm run dashboard urls                # List all test URLs
npm run dashboard domains             # List all domains
npm run dashboard search <term>       # Search everything
```

### Direct Files
- **HTML:** `dashboard.html` (open in browser)
- **JSON:** `dashboard-data.json` (for programmatic access)

### Agent Creator (Agent Hunter)

Don't know what kind of agent you need? Open `agent-creator.html`: describe
what you need in plain words, paste any raw research (LinkedIn dumps, job
posts, tool lists), and Agent Hunter asks the questions it can't infer,
matches against the skills vault, proposes new skills for the gaps, and
generates the agent prompt, a draft `.skill.yml` for skill-forge, and a
prefilled Work Request.

```bash
npm run agent-creator:data            # Rebuild catalog from the registries
```

- **HTML:** `agent-creator.html`
- **Data:** `agent-creator-data.json` / `agent-creator-data.js` (generated;
  auto-refreshed by `.github/workflows/update-agent-creator-data.yml`)

## What's Tracked

| Category | Count | Source |
|---|---|---|
| Projects | 33 | PROJECTS_TO_SHIP.md, PROJECT_CATALOG.md |
| Active Services | 124 | _MASTER_INVENTORY.md |
| Test URLs | 29 | **/README.md files |
| Domains | 12 | oaudrey/index.html, hardcoded list |
| BOM Items | — | _MASTER_BOM.md |

## Key Domains

| Domain | Status | Purpose |
|---|---|---|
| oaudrey.com | ✅ Active | Freedom Angel Hub |
| soup2bowl.com | 🔵 In Development | Catering platform |
| revvel.co | ✅ Active | Portfolio site |
| freedomangel.org | 🟡 Research | Nonprofit |
| sam.gov | 🌐 External | Gov registration |
| grants.gov | 🌐 External | Grant search |

## Examples

### Find All Projects
```bash
$ npm run dashboard projects

📦 All Projects
Found 33 projects

1. Vine review optimization
   Status: Existing
   Description: $5K/month
   Source: PROJECTS_TO_SHIP.md

2. Soul2Bowl
   Status: In Development
   Description: Premium online ordering and catering platform...
   Link: https://github.com/MIDNGHTSAPPHIRE/Soul2Bowl
   Source: PROJECT_CATALOG.md
...
```

### Search for oaudrey
```bash
$ npm run dashboard search oaudrey

🔍 Search Results for "oaudrey"

Domains (7):
1. oaudrey.com - Active (Freedom Angel Hub)
2. fieldwork.oaudrey.com - Active (oAudrey Subdomain)
3. growlingeyes.oaudrey.com - Active (oAudrey Subdomain)
...
```

### Find Test URLs
```bash
$ npm run dashboard urls vercel

🔗 Test URLs
Found 15 URLs

1. https://soul2bowl-staging.vercel.app
   Project: Soul2Bowl
   Type: vercel
   Source: /Soul2Bowl/README.md
...
```

## Auto-Updates

Dashboard updates automatically:
- **Every 4 hours** via GitHub Actions cron
- **On file changes** to inventory, BOM, README files
- **Manual:** `npm run dashboard:generate`

## Architecture

```text
Data Sources               Aggregator                Output
─────────────             ────────────              ──────
├─ _MASTER_INVENTORY.md   
├─ _MASTER_BOM.md         
├─ PROJECTS_TO_SHIP.md     ──────►  aggregate-      ──────►  dashboard.html
├─ PROJECT_CATALOG.md              project-                  dashboard-data.json
├─ **/README.md                    dashboard.js              CLI (dashboard-cli.js)
└─ oaudrey/index.html     
```

## Troubleshooting

### Dashboard data is stale
```bash
npm run dashboard refresh
```

### CLI not working
```bash
npm install
chmod +x scripts/dashboard-cli.js
```

### Can't open browser
```bash
# Manual paths:
# macOS:    open dashboard.html
# Windows:  start dashboard.html
# Linux:    xdg-open dashboard.html
```

## Files

| File | Purpose | Auto-Generated |
|---|---|---|
| `dashboard.html` | Visual dashboard | ✅ Yes |
| `dashboard-data.json` | Raw data | ✅ Yes |
| `scripts/aggregate-project-dashboard.js` | Generator script | ❌ No |
| `scripts/dashboard-cli.js` | CLI tool | ❌ No |
| `.github/workflows/update-project-dashboard.yml` | Auto-update workflow | ❌ No |
| `docs/PROJECT_DASHBOARD.md` | Full docs | ❌ No |

## Full Documentation

See [docs/PROJECT_DASHBOARD.md](../docs/PROJECT_DASHBOARD.md) for complete documentation.

---

**Last Updated:** 2026-05-03  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
