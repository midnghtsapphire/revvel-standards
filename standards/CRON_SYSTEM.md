# Cron Monitoring System

Universal cron jobs that run across ALL repos in the MIDNGHTSAPPHIRE organization.

## Quick Setup

Copy the `.github/workflows/cron/` folder to any repo that needs monitoring.

---

## Available Cron Jobs

| Workflow | Frequency | Purpose | Creates Issue? |
|----------|-----------|---------|-----------------|
| `status-universal.yml` | Hourly | Check all sites | ✅ Yes |
| `health-check.yml` | Every 15min | Backend health | No |
| `link-checker.yml` | Daily 6am | Outbound links | ⚠️ Warning |
| `api-monitor.yml` | Every 30min | API endpoints | ⚠️ Timeout |

---

## status-universal.yml

Default check for ALL repos:

```yaml
# Default sites checked:
- meetaudreyevans.com
- github-pages (repo-specific)
```

### Usage

1. Copy `.github/workflows/cron/status-universal.yml` to your repo
2. Customize sites in the `DEFAULT_SITES` variable
3. Enable GitHub Actions

### Customization

```bash
# In repo, edit the workflow:
DEFAULT_SITES="
  my-site.com,https://my-site.com
  api,https://api.my-site.com/health
"
```

---

## health-check.yml

Checks backend `/health`, `/health/live`, `/health/ready` endpoints.

Requirements from MONITORING.md:
- `/health` - Basic health
- `/health/live` - Liveness probe
- `/health/ready` - Readiness probe

---

## link-checker.yml

Validates external links used in the site.

Default links:
- Spotify, LANDR, SoundCloud
- Make.com, GoHighLevel, DigitalOcean

---

## api-monitor.yml

Monitors API endpoints:
- GitHub API
- OpenRouter API

---

## Auto-Create Issues

| Cron Job | Trigger | Labels |
|---------|---------|---------|
| status-universal | Site down | `status`, `automated`, `monitor` |
| health-check | Endpoint fails | `health`, `automated` |
| link-checker | Link fails | `links`, `warning` |
| api-monitor | API timeout | `api`, `automated` |

---

## Organization-Wide Setup

To run cron jobs across ALL repos:

1. Add workflows to `midnghtsapphire/.github` (template repo)
2. New repos will inherit automatically
3. Or use Organization-wide Actions

### Per-Repo Setup

```bash
# Copy cron jobs to any repo:
cp -r .github/workflows/cron /path/to/repo/.github/
```

---

## Requirements

All repos MUST have:

- [ ] GitHub Actions enabled
- [ ] Health endpoints (if backend)
- [ ] At least one cron job monitoring
- [ ] Issue creation on failure

---

## Frequency Guide

| Interval | Use Case |
|----------|---------|
| `*/15 * * * *` | Critical backends |
| `*/30 * * * *` | APIs |
| `0 * * * *` | Standard websites |
| `0 6 * * *` | Daily link checks |

---

## Troubleshooting

### Issue not created
- Check workflow permissions: `contents: read, issues: write`

### Site shows as down but works
- Increase timeout in curl command
- Check if site blocks GitHub IPs

### Need to skip
- Use `workflow_dispatch` to run manually
