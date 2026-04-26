# Credentials Audit System Standard

> **Status:** Active
> **Last Updated:** 2026-04-25
> **Domain:** Credential Management / API Keys / Auth

---

## Domain Classification

| Category | Value |
|----------|-------|
| **Domain** | Operations |
| **Sub-domain** | Credential Management |
| **Use Case:** | BOM audit, credential tracking |
| **Complexity** | Low |

---

## Executive Summary

This standard defines the process for auditing all credentials, API keys, and services. It ensures we know what we have, what we need, and can identify gaps before they become problems.

---

## BOM Credentials List

### Research & AI

| Tool | Need | Have | Status | Cost | Action |
|------|------|------|--------|------|--------|
| Tavily | Yes | ✅ | Active | Free | Maintain |
| Perplexity | Maybe | ❌ | Missing | $20/mo | Try free first |
| ChatGPT | Maybe | ❌ | Missing | $20/mo | Free tier |
| Claude | Maybe | ❌ | Missing | $15/mo | Free tier |
| OpenRouter | Yes | ENV | Active | Usage | Monitor |

### Automation

| Tool | Need | Have | Status | Cost | Action |
|------|------|------|--------|------|--------|
| GitHub Actions | Yes | Org | Active | Free | Maintain |
| n8n | Evaluate | ❌ | Missing | FOSS | Test |
| Make | Maybe | ❌ | Missing | $9/mo | Consider |
| Zapier | Maybe | ❌ | Missing | $20/mo | Consider |

### Tracking & Docs

| Tool | Need | Have | Status | Cost | Action |
|------|------|------|--------|------|--------|
| Google Sheets | Yes | Account | Active | Free | Use |
| Notion | Maybe | ❌ | Missing | $10/mo | Consider |
| Obsidian | Maybe | No | Free | Try |
| Odoo | Evaluate | ❌ | Missing | Eval |

### Business

| Tool | Need | Have | Status | Cost | Action |
|------|------|------|--------|------|--------|
| SAM.gov | Yes | Need renewal | Urgent | Free | Renew May 2026 |
| UEI | Yes | ❌ | Missing | Free | Get |
| Grants.gov | Yes | ❌ | Missing | Free | Register |

---

## Audit Process

### Weekly Audit

```
┌─────────────────────────────────────────────────────────────┐
│              WEEKLY CREDENTIALS AUDIT                        │
├─────────────────────────────────────────────────────────────┤
│  1. Check API key expiration dates                        │
│  2. Verify services still active                       │
│  3. Check for new tools needed                       │
│  4. Update BOM list                                │
│  5. Alert on missing credentials                  │
└─────────────────────────────────────────────────────────────┘
```

### Monthly Audit

```
┌─────────────────────────────────────────────────────────────┐
│              MONTHLY CREDENTIALS AUDIT                       │
├─────────────────────────────────────────────────────────────┤
│  1. Full cost analysis                                │
│  2. Evaluate unused credentials                     │
│  3. Check FOSS alternatives                        │
│  4. Budget review                                   │
│  5. Renew expiring credentials                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Credential Categories

### Critical (Must Have)

- [ ] GitHub access (midnghtsapphire)
- [ ] OpenRouter API key
- [ ] SAM.gov + CAGE code
- [ ] UEI (to get)

### Important (Should Have)

- [ ] Gmail account
- [ ] Google Sheets
- [ ] Tavily (in use)

### Nice to Have (Evaluate)

- [ ] Perplexity (try first)
- [ ] Notion (consider)
- [ ] Obsidian (try first)

### For Evaluation (Wait)

- [ ] Odoo
- [ ] n8n
- [ ] Make

---

## Where to Get Credentials

### Free Tier Tools

| Tool | Signup | Free Tier |
|------|--------|----------|
| Tavily | tavily.ai | 1000 searches/mo |
| Brave Search | search.brave.com | Unlimited |
| GitHub | github.com | Unlimited |
| Google Sheets | sheets.google.com | Unlimited |
| Obsidian | obsidian.md | Unlimited |
| n8n | n8n.io | Self-host |

### Paid (Try Free First)

| Tool | Free Trial | Notes |
|----------|--------|
| Perplexity | Pro trial | Research |
| ChatGPT | Free tier | GPT-4o mini |
| Claude | Free tier | Haiku |
| Make | 500 ops/mo | Automation |
| Zapier | 100 tasks | Automation |

---

## Integration Points

| System | Process |
|--------|---------|
| GitHub Actions | Weekly audit workflow |
| Cron | Monthly reminder |
| Sheets | Credential tracker |

---

## Related Standards

- `BUSINESS_AUDIT_SYSTEM.md` - Business discovery
- `MONITORING.md` - Alerting
- `ERROR_REPORTING_STANDARD.md` - Error handling

---

*Standard maintained by revvel-standards*
*Last updated: 2026-04-25*
