# Revvel Runbook Standard

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Status:** Mandatory Policy  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Introduction

A runbook is the on-call survival guide for every deployed service. When something breaks at 2 AM, the runbook tells you exactly what to do without having to dig through code or ask anyone. Every deployed Revvel application must have a runbook at `docs/runbooks/APP_NAME.md`.

---

## 2. Runbook Template

Copy this template for every deployed service. Fill in all sections before the first production deployment.

---

```markdown
# Runbook: [APP_NAME]

**Service:** [App name and brief description]  
**Owner:** Audrey Evans (@midnghtsapphire)  
**Live URL:** https://[your-domain].com  
**Droplet IP:** [x.x.x.x]  
**PM2 Process Name:** [pm2-process-name]  
**App Directory:** /var/www/[app-name]/  
**Last Updated:** [YYYY-MM-DD]

---

## Health Check

The fastest way to check if the app is alive:

```bash
# Check if the process is running
ssh root@[DROPLET_IP] "pm2 status"

# Check app health endpoint
curl -s https://[your-domain].com/api/health

# Check Nginx is serving traffic
curl -I https://[your-domain].com
```

Expected healthy state:
- PM2 shows `online` status for `[pm2-process-name]`
- `/api/health` returns `{ "status": "ok" }` with HTTP 200
- Nginx returns HTTP 200 or 301 (not 502 Bad Gateway)

---

## Restart the Application

**When to use:** App is running but returning errors. Process crashed and didn't auto-restart.

```bash
ssh root@[DROPLET_IP]
pm2 restart [pm2-process-name] --update-env
pm2 status
pm2 logs [pm2-process-name] --lines 50
```

---

## View Live Logs

```bash
# Stream live logs
ssh root@[DROPLET_IP] "pm2 logs [pm2-process-name]"

# Last 100 lines
ssh root@[DROPLET_IP] "pm2 logs [pm2-process-name] --lines 100"

# Error logs only
ssh root@[DROPLET_IP] "pm2 logs [pm2-process-name] --err --lines 100"

# Nginx access log
ssh root@[DROPLET_IP] "tail -f /var/log/nginx/access.log"

# Nginx error log
ssh root@[DROPLET_IP] "tail -f /var/log/nginx/error.log"
```

---

## Rollback to Previous Version

**When to use:** New deployment broke the app and you need to revert immediately.

```bash
# 1. Find the last working commit
git log --oneline -10

# 2. On the droplet, pull the previous commit
ssh root@[DROPLET_IP] "
  cd /var/www/[app-name]
  git fetch origin
  git checkout [LAST_GOOD_COMMIT_SHA]
  pnpm install --frozen-lockfile
  pnpm build
  pm2 restart [pm2-process-name] --update-env
"

# 3. Verify
curl -s https://[your-domain].com/api/health
```

---

## Manual Deployment (Emergency Only)

Use only if GitHub Actions CI/CD is down. Normal deployments always go through CI.

```bash
# 1. On your local machine, build the app
pnpm install --frozen-lockfile && pnpm build

# 2. Upload to droplet
rsync -az dist/ root@[DROPLET_IP]:/var/www/[app-name]/dist/
rsync -az package.json pnpm-lock.yaml root@[DROPLET_IP]:/var/www/[app-name]/

# 3. Restart on droplet
ssh root@[DROPLET_IP] "
  cd /var/www/[app-name]
  pnpm install --frozen-lockfile --prod
  pm2 restart [pm2-process-name] --update-env
"
```

---

## Scale Horizontally

**When to use:** High traffic causing slow responses. CPU or memory consistently above 80%.

```bash
# Check current resource usage
ssh root@[DROPLET_IP] "pm2 monit"

# Scale to 2 instances (cluster mode)
ssh root@[DROPLET_IP] "pm2 scale [pm2-process-name] 2"

# Or update ecosystem config and reload
ssh root@[DROPLET_IP] "pm2 reload ecosystem.config.js"
```

For sustained load, upgrade the DigitalOcean Droplet plan via the DO control panel.

---

## Database Operations

```bash
# Connect to PostgreSQL
ssh root@[DROPLET_IP] "psql [DATABASE_URL]"

# Check table sizes
psql [DATABASE_URL] -c "
  SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
  FROM pg_catalog.pg_statio_user_tables
  ORDER BY pg_total_relation_size(relid) DESC;
"

# Backup database
pg_dump [DATABASE_URL] > backup_$(date +%Y%m%d_%H%M%S).sql

# Run pending migrations
ssh root@[DROPLET_IP] "
  cd /var/www/[app-name]
  npx drizzle-kit migrate
"
```

---

## SSL Certificate Renewal

Let's Encrypt certificates renew automatically via certbot. If renewal fails:

```bash
ssh root@[DROPLET_IP]
certbot renew --dry-run   # Test renewal
certbot renew             # Force renewal
nginx -t && systemctl reload nginx
```

---

## Common Error Patterns

| Error | Likely Cause | Fix |
|---|---|---|
| `502 Bad Gateway` | PM2 process crashed or not running | `pm2 restart [name]` |
| `ERR_CONNECTION_REFUSED` | Nginx not running | `systemctl restart nginx` |
| `ECONNREFUSED` in logs | Database connection failed | Check `DATABASE_URL` env var, verify DB is running |
| `Module not found` | Dependencies not installed after deploy | `cd /app && pnpm install` |
| `Port already in use` | Old process still running | `pm2 delete [name] && pm2 start` |
| High memory usage | Memory leak | `pm2 restart [name]` + investigate recent code changes |

---

## Incident Response Checklist

When something is broken, follow this order:

1. [ ] Check PM2 status: `pm2 status`
2. [ ] Check app logs: `pm2 logs [name] --lines 100`
3. [ ] Check health endpoint: `curl https://[domain]/api/health`
4. [ ] Check Nginx: `nginx -t && systemctl status nginx`
5. [ ] Check disk space: `df -h`
6. [ ] Check memory: `free -h && pm2 monit`
7. [ ] If deployment-related: check GitHub Actions run for the last deploy
8. [ ] If DB-related: test DB connection manually
9. [ ] If still broken: rollback to last good commit (see Rollback section)
10. [ ] Document the incident in CHANGELOG.md and create a GitHub issue

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NODE_ENV` | `production` | Yes |
| `PORT` | App port (default: 3000) | No |
| `JWT_SECRET` | JWT signing secret (32+ chars) | Yes |
| `STRIPE_SECRET_KEY` | Stripe live secret key | If using Stripe |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | If using Stripe |
| [Add app-specific vars here] | | |

```text

---

## 3. Runbook Location

```
your-app-repo/
└── docs/
    └── runbooks/
        └── [app-name].md    # The runbook for this app
```text

---

## 4. When to Update a Runbook

A runbook must be updated whenever:
- The app's domain or IP address changes
- A new required environment variable is added
- The deployment process changes
- A recurring incident reveals a new common error pattern
- The database or PM2 process name changes

Runbooks are committed to the repo alongside code changes. A PR that changes infrastructure without updating the runbook will be flagged in code review.
