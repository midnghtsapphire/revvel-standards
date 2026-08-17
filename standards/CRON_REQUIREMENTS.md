# Cron Monitoring Requirements

Requirements for ALL repositories in MIDNGHTSAPPHIRE organization.

---

## Requirements Checklist

### Level 1: Essential (All Repos)

| Requirement | Description | Frequency |
|-------------|-------------|------------|
| `status-universal.yml` | Check main site is up | Hourly |
| Issue Creation | Auto-create issue on failure | When down |

### Level 2: For Frontend Repos

| Requirement | Description | Frequency |
|-------------|-------------|------------|
| `link-checker.yml` | Validate external links | Daily |
| Portfolio Links | Verify all app links work | Hourly |

### Level 3: For Backend Repos

| Requirement | Description | Frequency |
|-------------|-------------|------------|
| `health-check.yml` | Check /health endpoints | 15 min |
| `api-monitor.yml` | Monitor API endpoints | 30 min |

---

## Repository Classification

### Frontend Only
- meetaudreyevans.com
- revvel-music-studio
- any static site

**Required:** Level 1 + Level 2

### Backend Only
- API services
- MCP servers

**Required:** Level 1 + Level 3

### Full Stack
- Both frontend + backend

**Required:** Level 1 + Level 2 + Level 3

---

## Template-Based Setup

### New Repo Template

When creating a new repo, include:

```text
.github/
└── workflows/
    └── cron/
        ├── status-universal.yml  # Always
        ├── health-check.yml     # If backend
        ├── link-checker.yml    # If frontend
        └── api-monitor.yml    # If API
```

### Quick Start

```bash
# Copy from revvel-standards
cp -r revvel-standards/.github/workflows/cron your-repo/.github/
```

---

## Auto-Generated Requirements

This document is auto-generated from:
- `standards/MONITORING.md`
- `standards/CRON_SYSTEM.md`
- `.github/workflows/cron/`

Last updated: 2026-04-25
