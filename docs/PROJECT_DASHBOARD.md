# Project Dashboard System

**Centralized visibility into all MIDNGHTSAPPHIRE projects, BOM, inventory, test URLs, and status**

## Problem Statement

No visibility into:
- BOM (Bill of Materials) inventory across projects
- Handoff documents and project status
- Test URLs scattered in folders
- Domain implementations and status
- Project confusion (which projects exist, where they are, what status)
- Overall project tracking without "looking in folders"

## Solution

A comprehensive **Project Dashboard System** that:

1. **Aggregates** all project data from multiple sources
2. **Generates** a centralized HTML dashboard and JSON data file
3. **Automates** updates via GitHub Actions cron job (hourly)
4. **Provides** CLI tool for quick access without opening files
5. **Tracks** projects, URLs, domains, inventory, and BOM in one place

---

## Quick Start

### View Dashboard (HTML)

```bash
npm run dashboard:generate  # Generate dashboard
open dashboard.html         # Open in browser
```

Or use the CLI:

```bash
npm run dashboard open      # Generate and open in browser
```

### Use CLI for Quick Lookups

```bash
npm run dashboard           # Show summary
npm run dashboard projects  # List all projects
npm run dashboard urls      # List all test URLs
npm run dashboard domains   # List all domains
npm run dashboard search oaudrey  # Search everything
```

### Automated Updates

The dashboard auto-updates hourly via GitHub Actions:
- Workflow: `.github/workflows/update-project-dashboard.yml`
- Runs on schedule (hourly) and on relevant file changes
- Commits updated `dashboard.html` and `dashboard-data.json`
- Deploys to GitHub Pages (optional)

**View Live Dashboard:**  
`https://midnghtsapphire.github.io/revvel-standards/dashboard.html`

---

## Dashboard Features

### 📊 Summary Card
- Total projects count
- Active services count
- Test URLs count
- Tracked domains count
- Last updated timestamp

### 📦 Projects Table
- All projects from `PROJECTS_TO_SHIP.md` and `PROJECT_CATALOG.md`
- Status badges (Active, Dev, Research, etc.)
- Descriptions and links
- Source tracking
- Search and filter functionality

### 🔗 Test URLs Table
- All test URLs extracted from README files
- Vercel URLs automatically detected
- Project association
- Source file tracking
- Direct links to test sites

### 🌐 Domains Table
- Key domains (oaudrey.com, soup2bowl.com, revvel.co, etc.)
- Domain status (Active, In Development, Research)
- Purpose and notes
- Subdomain tracking

### ⚙️ Active Services Table
- Services from `_MASTER_INVENTORY.md`
- Status, description, and usage
- Tracks APIs, subscriptions, tools

### 🔍 Live Search
- Search across all projects, URLs, domains, and services
- Real-time filtering
- Instant results

---

## Data Sources

The dashboard aggregates data from:

1. **`docs/_MASTER_INVENTORY.md`**  
   → Active services, APIs, subscriptions

2. **`docs/_MASTER_BOM.md`**  
   → Bill of materials, purchases, stack

3. **`docs/PROJECTS_TO_SHIP.md`**  
   → Active projects, revenue targets, status

4. **`docs/PROJECT_CATALOG.md`**  
   → All repositories and applications

5. **`**/README.md` files**  
   → Test URLs, deployment URLs, Vercel links

6. **`oaudrey/index.html`**  
   → Subdomain tracking (fieldwork.oaudrey.com, etc.)

7. **`**/SYSTEM_STATE.md` files**  
   → Project status and health

---

## CLI Commands

### `npm run dashboard` or `npm run dashboard summary`
Shows summary with counts, key domains, and recent projects.

**Example output:**
```text
============================================================
  📊 MIDNGHTSAPPHIRE Project Dashboard Summary
============================================================

Total Projects: 42
Active Services: 18
Test URLs: 27
Tracked Domains: 15
Last Updated: 5/3/2026, 2:05:29 AM

Key Domains:
  1. oaudrey.com - Active (Freedom Angel Hub)
  2. soup2bowl.com - In Development (Catering)
  3. revvel.co - Active (Portfolio)
  ...
```

### `npm run dashboard projects [filter]`
Lists all projects with status, description, and links.

**Examples:**
```bash
npm run dashboard projects           # All projects
npm run dashboard projects Active    # Filter by status
npm run dashboard projects soul      # Filter by name
```

### `npm run dashboard urls [filter]`
Lists all test URLs with project association and source.

**Examples:**
```bash
npm run dashboard urls               # All URLs
npm run dashboard urls vercel        # Filter Vercel URLs
npm run dashboard urls soul2bowl     # Filter by project
```

### `npm run dashboard domains [filter]`
Lists all tracked domains with status and purpose.

**Examples:**
```bash
npm run dashboard domains            # All domains
npm run dashboard domains Active     # Filter by status
npm run dashboard domains oaudrey    # Filter by name
```

### `npm run dashboard search <term>`
Searches across all data (projects, URLs, domains, services).

**Examples:**
```bash
npm run dashboard search oaudrey
npm run dashboard search vercel
npm run dashboard search soul2bowl
npm run dashboard search API
```

### `npm run dashboard refresh`
Regenerates dashboard data from all sources.

### `npm run dashboard open`
Generates dashboard and opens in browser.

---

## Files Created

### `dashboard.html`
- Centralized HTML dashboard
- Beautiful glassmorphism UI
- Live search functionality
- Responsive design
- Auto-generated, don't edit manually

### `dashboard-data.json`
- Raw aggregated data in JSON format
- Used by CLI and other tools
- Contains all projects, URLs, domains, inventory
- Auto-generated, don't edit manually

### `scripts/aggregate-project-dashboard.js`
- Main aggregation script
- Parses markdown files and extracts data
- Generates dashboard HTML and JSON
- Run via `npm run dashboard:generate`

### `scripts/dashboard-cli.js`
- Interactive CLI tool
- Quick access to project info
- Search functionality
- Run via `npm run dashboard`

### `.github/workflows/update-project-dashboard.yml`
- GitHub Actions workflow
- Runs hourly (cron: `0 * * * *`)
- Auto-commits updates
- Deploys to GitHub Pages (optional)

---

## Automation

### Hourly Updates (Cron)

The dashboard auto-updates every 4 hours via GitHub Actions:

```yaml
schedule:
  - cron: '0 */4 * * *'  # Every 4 hours
```

**What it does:**
1. Checks out repository
2. Runs aggregation script
3. Commits `dashboard.html` and `dashboard-data.json` if changed
4. (Optional) Deploys to GitHub Pages

**Manual trigger:**
```bash
# Via GitHub Actions UI
gh workflow run update-project-dashboard.yml

# Or locally
npm run dashboard:generate
```

### On File Changes

Dashboard also updates when relevant files change:

```yaml
on:
  push:
    paths:
      - 'docs/_MASTER_INVENTORY.md'
      - 'docs/_MASTER_BOM.md'
      - 'docs/PROJECTS_TO_SHIP.md'
      - 'docs/PROJECT_CATALOG.md'
      - '**/README.md'
```

---

## Adding New Projects

When you add a new project, the dashboard will automatically pick it up if:

1. **Added to `docs/PROJECTS_TO_SHIP.md`**  
   Add row to any project table

2. **Added to `docs/PROJECT_CATALOG.md`**  
   Add row to repository table

3. **Has a `README.md` with test URLs**  
   Add URLs in a "Test" section

4. **Has domain info in `oaudrey/index.html`**  
   Add subdomain references

Dashboard will auto-update within 1 hour, or run manually:

```bash
npm run dashboard:generate
```

---

## Key Domains Tracked

| Domain | Status | Purpose | Notes |
|---|---|---|---|
| oaudrey.com | Active | Freedom Angel Hub | Main automation hub |
| soup2bowl.com | In Development | Catering | St. Louis fusion cuisine |
| revvel.co | Active | Portfolio | Main portfolio site |
| freedomangel.org | Research | Nonprofit | Anti-trafficking initiative |
| sam.gov | External | Gov Registration | Federal contracting |
| grants.gov | External | Grant Search | Federal grants |

**Subdomains (oaudrey.com):**
- fieldwork.oaudrey.com
- growlingeyes.oaudrey.com
- penny.oaudrey.com
- [More tracked automatically from `oaudrey/index.html`]

---

## Troubleshooting

### Dashboard not showing latest data

```bash
npm run dashboard refresh
```

### CLI command not found

```bash
npm install
chmod +x scripts/dashboard-cli.js
```

### Can't open dashboard in browser

```bash
# Manual open
open dashboard.html  # macOS
start dashboard.html # Windows
xdg-open dashboard.html # Linux
```

### GitHub Actions workflow not running

Check workflow status:
```bash
gh workflow view update-project-dashboard.yml
```

Enable if disabled:
```bash
gh workflow enable update-project-dashboard.yml
```

---

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                    Data Sources                         │
├─────────────────────────────────────────────────────────┤
│  • docs/_MASTER_INVENTORY.md                           │
│  • docs/_MASTER_BOM.md                                 │
│  • docs/PROJECTS_TO_SHIP.md                            │
│  • docs/PROJECT_CATALOG.md                             │
│  • **/README.md (test URLs)                            │
│  • oaudrey/index.html (subdomains)                     │
│  • **/SYSTEM_STATE.md (status)                         │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│        scripts/aggregate-project-dashboard.js           │
│         (Aggregation & Generation Script)               │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
           ┌────────────┴────────────┐
           │                         │
           ▼                         ▼
┌────────────────────┐    ┌────────────────────┐
│  dashboard.html    │    │ dashboard-data.json│
│  (Visual Dashboard)│    │  (Raw Data)        │
└────────────────────┘    └────────────────────┘
           │                         │
           ▼                         ▼
┌────────────────────┐    ┌────────────────────┐
│  GitHub Pages      │    │ CLI Tool           │
│  (Public URL)      │    │ (Terminal Access)  │
└────────────────────┘    └────────────────────┘
```

---

## Future Enhancements

1. **Real-time status checks**  
   Ping URLs and check if they're up

2. **Integration with GitHub API**  
   Auto-discover repos and track commits, PRs, issues

3. **Cost tracking**  
   Visualize costs from `_MASTER_INVENTORY.md`

4. **Alert system**  
   Notify when services expire or URLs go down

5. **Mobile app**  
   Native mobile dashboard for on-the-go access

6. **API endpoint**  
   REST API for dashboard data

---

## Support

**Questions?** Open an issue in `midnghtsapphire/revvel-standards`.

**Bug reports:** Include CLI output and dashboard logs.

**Feature requests:** Describe use case and benefit.

---

## License

Part of the MIDNGHTSAPPHIRE revvel-standards repository.

---

**Last Updated:** 2026-05-03  
**Version:** 1.0.0  
**Maintained by:** MIDNGHTSAPPHIRE
