# Consolidated Secrets Matrix — SSOT

> **ALWAYS LOOK HERE FIRST** for the complete list of all API keys and secrets used across MIDNGHTSAPPHIRE projects.

## Sources

| Source Repo | Secret Count | Location |
|------------|------------|----------|
| revvel-standards | 32 | docs/SECRETS_MANAGEMENT.md |
| growlingeyes | TBD | .env.example |
| reesereviews | TBD | .env.example |

## Complete Secrets List (SSOT)

### AI / LLM Providers

| Secret | Used By | Critical | Vault Path |
|--------|--------|----------|-----------|
| `OPENROUTER_API_KEY` | AI routing, triage, coding | YES | revvel/shared/llm/openrouter |
| `OPENAI_API_KEY` | GPT models | YES | revvel/shared/llm/openai |
| `ANTHROPIC_API_KEY` | Claude models | YES | revvel/shared/llm/anthropic |
| `GROQ_API_KEY` | Fast inference | NO | revvel/shared/llm/groq |
| `JULES_API_KEY` | Google Jules agent | NO | revvel/shared/llm/jules |
| `RECURSE_ML_API_KEY` | RecurseML code review | NO | revvel/shared/llm/recurse |

### Image & Media Generation

| Secret | Used By | Critical | Where to Get |
|--------|--------|----------|------------|
| `LEONARDO_API_KEY` | Leonardo.ai food images | NO | leonardo.ai/api |
| `HEYGEN_API_KEY` | HeyGen videos/avatars | NO | heygen.com |
| `ELEVEN_API_KEY` | Eleven Labs voice | NO | elevenlabs.io |
| `MIDJOURNEY_DISCORD_BOT_TOKEN` | Midjourney images | NO | Discord bot |

### Deployment & Infrastructure

| Secret | Used By | Critical | Where to Get |
|--------|--------|----------|------------|
| `VERCEL_TOKEN` | Vercel deployments | YES | vercel.com/account/tokens |
| `VERCEL_ORG_ID` | Vercel org | YES | Project settings |
| `VERCEL_PROJECT_ID` | Vercel project | YES | Project settings |
| `DIGITALOCEAN_API_TOKEN` | DO App Platform | NO | do.com/api/tokens |

### GitHub & Automation

| Secret | Used By | Critical | Where to Get |
|--------|--------|----------|------------|
| `GITHUB_TOKEN` | Auto-provided | YES | (built-in) |
| `GH_PAT` | Fine-grained PAT | YES | GitHub settings |
| `ADMIN_GITHUB_TOKEN` | Elevated permissions | YES | GitHub settings |
| `APP_ID` | GitHub App | NO | App settings |
| `APP_PRIVATE_KEY` | GitHub App auth | NO | App settings |

### Social & Marketing

| Secret | Used By | Critical | Where to Get |
|--------|--------|----------|------------|
| `GOOGLE_SEARCH_CONSOLE_KEY` | Search Console | NO | search.google.com |
| `GOOGLE_BUSINESS_PROFILE_KEY` | Business Profile | NO | Google Cloud |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn API | NO | developer.linkedin.com |
| `ORCID_API_KEY` | Publications | NO | orcid.org |
| `META_PAGE_ACCESS_TOKEN` | Facebook/Instagram | NO | Meta for Developers |
| `META_PAGE_ID` | Facebook Page | NO | Meta Business |
| `META_CATALOG_ID` | Meta Commerce | NO | Commerce Manager |

### Email & Communications

| Secret | Used By | Critical | Where to Get |
|--------|--------|----------|------------|
| `GMAIL_APP_PASSWORD` | Gmail SMTP | NO | myaccount.google.com/apppasswords |

### Testing & QA

| Secret | Used By | Critical | Where to Get |
|--------|--------|----------|------------|
| `MABL_API_KEY` | mabl testing | NO | mabl.com |

### DNS & Domain

| Secret | Used By | Critical | Where to Get |
|--------|--------|----------|------------|
| `NAMECHEAP_API_KEY` | Namecheap DNS | NO | namecheap.com/profile/api |

### Payments (Future)

| Secret | Used By | Critical | Where to Get |
|--------|--------|----------|------------|
| `REVENUECAT_SECRET_API_KEY` | RevenueCat server | YES | revenuecat.com |
| `REVENUECAT_PUBLIC_API_KEY_WEB` | RevenueCat client | YES | revenuecat.com |
| `STRIPE_SECRET_KEY` | Stripe payments | YES | dashboard.stripe.com |

## Workflow Secret Requirements

### Required for ALL Projects
- `VERCEL_TOKEN` - for deployments
- `OPENROUTER_API_KEY` - for AI routing

### Required for Web Projects
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### Required for AI Projects
- `OPENAI_API_KEY` OR `ANTHROPIC_API_KEY`
- `OPENROUTER_API_KEY`

### Optional (depends on features)
- All others listed above

## How to Sync to a New Project

```bash
# Option 1: Use the sync workflow
gh workflow run sync-secrets-to-repos.yml -f target_repo=owner/repo

# Option 2: Manual
node scripts/sync-secrets.js --repo=owner/repo
```

## Verification

After syncing, verify all secrets are present:
```bash
gh secret list --repo owner/repo
```

---

*Location: ALWAYS CHECK THIS FILE FIRST*
*Updated: 2026-05-07*
*Part of revvel-standards SSOT*