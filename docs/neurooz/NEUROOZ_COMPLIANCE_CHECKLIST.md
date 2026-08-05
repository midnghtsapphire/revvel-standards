# Neurooz — Revvel Standards Compliance Checklist

**Date:** April 6, 2026  
**Author:** MIDNGHTSAPPHIRE / GlowStarLabs  
**App:** Neurooz — AI-Powered ADHD Productivity & Financial Guardian  
**Repo:** `midnghtsapphire/neurooz`  
**Status:** Compliance Audit — Pre-Production Review  

---

## 1. EXRUP 8-Phase Lifecycle Compliance

| Phase | Required | Status | Action Needed |
|-------|----------|--------|---------------|
| **0 — Inception** | Entity registration, EIN linkage | [ ] | Link to Freedom Angel Corp (EIN: 86-1209156) in all legal docs |
| **1 — Planning** | Roadmap, Technical Architecture | [ ] | Create `ROADMAP.md` and `BLUEPRINT.md` |
| **2 — Design** | Wireframes, Mockups, Prototypes | [ ] | Create Figma mockups with Urban Oz theme |
| **3 — Development** | Functional MVP, GitHub Repo | [x] | Repo exists, TypeScript, active development |
| **4 — Testing** | Unit/E2E Tests, Security Scan | [ ] | Add Vitest unit tests, Playwright E2E tests |
| **5 — Deployment** | App Store/Web Deployment | [ ] | Configure DigitalOcean droplet + CI/CD pipeline |
| **6 — Compliance** | Privacy Policy, SOC2/HIPAA | [ ] | Create privacy policy, GDPR compliance, HIPAA review (health data) |
| **7 — Maintenance** | Monitoring, Patches, Updates | [ ] | Set up PM2 + SHIFT self-healing monitor |

---

## 2. Required Repository Artifacts

| Artifact | Required By | Present | Action |
|----------|-------------|---------|--------|
| `README.md` | MASTER_APP_TEMPLATE | [ ] | Update with standard sections, badges, and infra map |
| `BLUEPRINT.md` | MASTER_APP_TEMPLATE | [ ] | Create: technical architecture, data flow diagrams |
| `ROADMAP.md` | MASTER_APP_TEMPLATE | [ ] | Create: 12-month strategic timeline |
| `KANBAN_CARDS.md` | MASTER_APP_TEMPLATE | [ ] | Create: initial task list (see this document set) |
| `INVESTORS_PACK.md` | MASTER_APP_TEMPLATE | [ ] | Create: business case, budget, ROI analysis |
| `CHANGELOG.md` | AUTO_DOCUMENTATION_STANDARD | [ ] | Create: Keep a Changelog format, auto-update via GH Actions |
| `LICENSE` | MASTER_APP_TEMPLATE | [ ] | Add: Proprietary — All Rights Reserved, Audrey Evans / GlowStarLabs |
| `HANDOFF.md` | INFRASTRUCTURE_MAP | [ ] | Create: deployment architecture, URLs, credentials list |
| `DEPLOYMENT.md` | DEPLOYMENT_STANDARD | [ ] | Create: droplet config, Nginx, PM2, deploy script |
| `DARE_LOG.md` | DARE_LOG_STANDARD | [ ] | Create: active DARE log (see this document set) |
| `RAID_LOG.md` | MASTER_APP_TEMPLATE | [ ] | Create: traditional RAID alongside DARE |
| `.github/workflows/deploy.yml` | CI/CD Standard | [ ] | Copy from `templates/cicd/deploy.yml`, configure |
| `deploy.sh` | CI/CD Standard | [ ] | Copy from `templates/cicd/deploy.sh`, configure |

---

## 3. Technology Stack Compliance

| Layer | Standard Requires | Neurooz Current | Compliant | Action |
|-------|-------------------|-----------------|-----------|--------|
| **Frontend** | React / Next.js | React + TypeScript | [x] | Verify version is current |
| **Styling** | Tailwind CSS + Glassmorphism | TBD | [ ] | Apply Urban Oz glassmorphism theme |
| **Backend** | Node.js / Express or tRPC | Node.js | [x] | Verify tRPC or Express API structure |
| **Database** | PostgreSQL (Drizzle) or SQLite | TBD | [ ] | Verify ORM and schema setup |
| **Authentication** | Clerk or Custom JWT | TBD | [ ] | Implement Clerk or JWT auth |
| **Deployment** | DigitalOcean / CodeMagic | TBD | [ ] | Configure DO droplet or App Platform |
| **Testing** | Vitest + Playwright | TBD | [ ] | Add test suites |
| **ORM** | Drizzle ORM | TBD | [ ] | Verify Drizzle integration |

---

## 4. Required Features Compliance

### 4.1 E-Commerce & Financial Integrations

| Feature | Required | Present | Priority | Notes |
|---------|----------|---------|----------|-------|
| Shopping Cart System | Yes | [ ] | Medium | Token/subscription purchases |
| Stripe Integration | Yes | [ ] | High | Subscription billing for Pro tiers |
| Subscription Management | Yes | [ ] | High | Free/Starter/Pro/Business/Enterprise tiers |
| Plaid Integration | Yes | [ ] | **Critical** | Core feature — ADHD financial guardian |

### 4.2 Administration & Control

| Feature | Required | Present | Priority | Notes |
|---------|----------|---------|----------|-------|
| Admin Panel | Yes | [ ] | High | UI customization, feature toggles |
| Dynamic Feature Flags | Yes | [ ] | Medium | Per-user and global toggles |
| Branding Controls | Yes | [ ] | Medium | Colors, fonts, layouts |

### 4.3 Marketing, SEO & Analytics

| Feature | Required | Present | Priority | Notes |
|---------|----------|---------|----------|-------|
| Schema.org JSON-LD | Yes | [ ] | High | Freedom Angel Corp parent org markup |
| WebApplication Schema | Yes | [ ] | High | Neurooz-specific app schema |
| Open Graph / Twitter Cards | Yes | [ ] | Medium | Social sharing optimization |
| Sitemap.xml | Yes | [ ] | Medium | Auto-generated |
| Robots.txt | Yes | [ ] | Medium | Configured |
| Meta Data Management | Yes | [ ] | Medium | Per-page title/description/keywords |
| Alt Text Auto-Generation | Yes | [ ] | Medium | AI/LLM integration |
| Auto Marketing via Meta | Yes | [ ] | Low | Facebook/Instagram Business APIs |
| SEM Hooks | Yes | [ ] | Low | Google Ads, conversion pixels, UTM |
| Backlinking Dashboard | Yes | [ ] | Low | OpenLinkProfiler integration |

### 4.4 Affiliate Marketing (MANDATORY)

| Feature | Required | Present | Priority | Notes |
|---------|----------|---------|----------|-------|
| Affiliate Auto-Linker | Yes | [ ] | Medium | Amazon tag: `meetaudreyeva-20` |
| Auto-Campaign Generator | Yes | [ ] | Low | 20/50/100/200/500 campaign tiers |
| Social Media Distribution | Yes | [ ] | Low | All-platform posting |
| Email Campaign Automation | Yes | [ ] | Low | Template generation via OpenRouter |

### 4.5 Email & Newsletter (MANDATORY)

| Feature | Required | Present | Priority | Notes |
|---------|----------|---------|----------|-------|
| Subscribe Form | Yes | [ ] | Medium | Footer/popup/dedicated page |
| Double Opt-In | Yes | [ ] | Medium | GDPR/CAN-SPAM compliance |
| Centralized Subscriber DB | Yes | [ ] | Medium | Feed into master email list |
| Auto-Newsletter on Launch | Yes | [ ] | Low | OpenRouter LLM templates |
| Subscriber Dashboard | Yes | [ ] | Low | Growth charts, segmentation |

### 4.6 SEO Infrastructure (MANDATORY)

| Feature | Required | Present | Priority | Notes |
|---------|----------|---------|----------|-------|
| About Section (Multi-Page) | Yes | [ ] | Medium | 10 sub-pages minimum |
| Blog System (20+ posts) | Yes | [ ] | Medium | Auto-generated via OpenRouter |
| FAQ System (50+ questions) | Yes | [ ] | Medium | Schema markup, searchable |
| Backlink Strategy (1000+) | Yes | [ ] | Low | Internal + cross-app + directory |
| SEO Landing Pages (15-50) | Yes | [ ] | Low | City/industry/niche-specific |

### 4.7 Accessibility Modes (MANDATORY)

| Mode | Required | Present | Priority | Notes |
|------|----------|---------|----------|-------|
| **WCAG AAA** | Yes | [ ] | High | High contrast, 18px+, focus indicators |
| **ADHD Mode** | Yes | [ ] | **Critical** | Core value prop — simplified layout, Pomodoro, sensory-safe |
| **Dyslexic Mode** | Yes | [ ] | High | OpenDyslexic font, line height 1.9, letter spacing 0.2em |
| **Neuro Mode** | Yes | [ ] | High | No animations, no transitions, simplified nav |
| **ECO CODE Mode** | Yes | [ ] | Medium | Low-power, minimal animations, battery-optimized |
| **No Blue Light Mode** | Yes | [ ] | Medium | Warm amber/sepia palette |
| **Menstrual UI** | Yes | [ ] | Low | Soft pastels, cycle tracker, affirmations |

### 4.8 Quality & Testing

| Feature | Required | Present | Priority | Notes |
|---------|----------|---------|----------|-------|
| Vitest Unit Tests | Yes | [ ] | High | Full coverage |
| Playwright E2E Tests | Yes | [ ] | High | Happy path + "Bad Day" tests |
| SHIFT Self-Healing Monitor | Yes | [ ] | Medium | Cron-based, LLM-diagnosed |
| WoZ Few-Shot Prompt Tests | Yes | [ ] | Medium | Behavioral validation |
| Error Boundaries | Yes | [ ] | High | Global error handling + Sentry |
| Analytics (FOSS) | Yes | [ ] | Medium | Plausible or Umami |

---

## 5. Code Review & Deployment Compliance

| Requirement | Standard | Status | Action |
|-------------|----------|--------|--------|
| Venice AI Primary Review | CODE_REVIEW_STANDARD | [ ] | Configure Venice AI as primary reviewer |
| Claude Sonnet 4.5 Fallback | CODE_REVIEW_STANDARD | [ ] | Set up fallback review chain |
| Coderabbit PR Reviews | CODE_REVIEW_STANDARD | [ ] | Integrate Coderabbit on repo |
| No Force Push Policy | CONCURRENT_DEVELOPMENT | [ ] | Enable branch protection rules |
| Feature Branch Workflow | CONCURRENT_DEVELOPMENT | [ ] | Enforce PR-based merges |
| Deploy Agent Model | DEPLOYMENT_STANDARD | [ ] | Single deploy agent for production |
| GitHub Actions CI/CD | CI/CD Standard | [ ] | Auto-deploy on push to main |
| SSH Key Convention | CI/CD Standard | [ ] | `neurooz_universal` key pair |

---

## 6. Security Compliance

| Requirement | Standard | Status | Action |
|-------------|----------|--------|--------|
| HashiCorp Vault | MASTER_APP_TEMPLATE | [ ] | AppRole + OIDC auth for secrets |
| Rate Limiting | MASTER_APP_TEMPLATE | [ ] | Implement on all API endpoints |
| CORS Configuration | MASTER_APP_TEMPLATE | [ ] | Whitelist production domains |
| Helmet.js | MASTER_APP_TEMPLATE | [ ] | Add security headers |
| Zod Validation | MASTER_APP_TEMPLATE | [ ] | All input validation |
| Parameterized Queries | MASTER_APP_TEMPLATE | [ ] | Via Drizzle ORM |
| No Hardcoded Secrets | CI/CD Standard | [ ] | .env only, GH Actions secrets |
| HIPAA Considerations | Compliance Phase | [ ] | Financial + cognitive health data |

---

## 7. Corporate Identity & SEO Authority

| Requirement | Standard | Status | Action |
|-------------|----------|--------|--------|
| Freedom Angel Corp JSON-LD | ENTITY_HIERARCHY | [ ] | Embed parent org schema in `<head>` |
| WebApplication Schema | ENTITY_HIERARCHY | [ ] | Neurooz-specific schema |
| Trust Signals in Footer | ENTITY_HIERARCHY | [ ] | EIN, SBA cert, affiliations |
| Cross-App Backlinking | README (SEO) | [ ] | Link to all other Revvel apps |

---

## 8. Infrastructure Documentation

| Requirement | Standard | Status | Action |
|-------------|----------|--------|--------|
| Infrastructure Map Entry | INFRASTRUCTURE_MAP | [ ] | Add Neurooz to master infra map |
| Droplet Documentation | INFRASTRUCTURE_MAP | [ ] | IP, directory, port, PM2 process |
| Domain/DNS Documentation | INFRASTRUCTURE_MAP | [ ] | Domain → IP mapping |
| Environment Variables List | INFRASTRUCTURE_MAP | [ ] | List all required .env vars (not values) |

---

## Summary: Compliance Score

| Category | Total Items | Compliant | Gap |
|----------|-------------|-----------|-----|
| EXRUP Lifecycle | 8 | 1 | 7 |
| Repository Artifacts | 13 | 0 | 13 |
| Tech Stack | 8 | 2 | 6 |
| Required Features | 40+ | ~5 (estimated) | 35+ |
| Code Review / Deploy | 8 | 0 | 8 |
| Security | 8 | 0 | 8 |
| Corporate Identity | 4 | 0 | 4 |
| Infrastructure Docs | 4 | 0 | 4 |
| **TOTAL** | **~93** | **~8** | **~85** |

**Current Compliance: ~9%**  
**Target: 100% before production launch**

---

**Next Steps:** Use the KANBAN_CARDS, SCRUM_BACKLOG, and IMPROVEMENT_PLAN documents in this set to systematically close all gaps.
