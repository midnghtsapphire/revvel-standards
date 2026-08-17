# Neurooz — Kanban Cards: Use Cases & Requirements

**Date:** April 6, 2026  
**Author:** MIDNGHTSAPPHIRE / GlowStarLabs  
**Board:** Neurooz Development Kanban  
**Flow:** Backlog → To-Do → In Progress → Review → Done  

---

## Legend

- **Priority:** P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Future)
- **Size:** XS (< 2hr) | S (2-4hr) | M (4-8hr) | L (1-2 days) | XL (3-5 days)
- **Module:** CORE | COG (Cognitive) | FIN (Financial) | PROD (Productivity) | UI | SEO | INFRA | TEST

---

## BACKLOG

### INFRA — Infrastructure & Compliance

| Card ID | Title | Module | Priority | Size | Use Case | Requirements |
|---------|-------|--------|----------|------|----------|--------------|
| K-001 | Configure CI/CD Pipeline | INFRA | P0 | M | DevOps needs automated build/test/deploy on push to main | Copy `deploy.yml` from templates; configure GH secrets; verify first auto-deploy |
| K-002 | Create deploy.sh Manual Fallback | INFRA | P0 | S | DevOps needs emergency deploy option | Copy from templates; replace placeholders; test on droplet |
| K-003 | Provision DigitalOcean Droplet | INFRA | P0 | M | App needs production server | Ubuntu 22.04, Node 20, Nginx, PM2, SSL via Certbot |
| K-004 | Configure Nginx Reverse Proxy | INFRA | P0 | S | Web traffic needs HTTPS termination | Neurooz domain → localhost:PORT, SSL certs |
| K-005 | Set Up PM2 Process Manager | INFRA | P0 | XS | App needs auto-restart on crash | PM2 ecosystem file, startup script |
| K-006 | Enable Branch Protection Rules | INFRA | P0 | XS | Prevent direct pushes to main | Require PR review, block force-push |
| K-007 | Create .env.example | INFRA | P0 | XS | New agents need to know required env vars | List all vars with descriptions, no real values |
| K-008 | Add Neurooz to INFRASTRUCTURE_MAP.md | INFRA | P1 | XS | Master infra map must track all apps | IP, directory, port, domain, env vars |
| K-009 | Configure Sentry Error Tracking | INFRA | P1 | S | Errors need centralized tracking | Sentry DSN in env, global error boundary |
| K-010 | Set Up Automated Backups | INFRA | P2 | M | Database and config need backup | Daily DB dump, config backup, retention 30 days |

### CORE — Repository Artifacts & Documentation

| Card ID | Title | Module | Priority | Size | Use Case | Requirements |
|---------|-------|--------|----------|------|----------|--------------|
| K-011 | Create/Update README.md | CORE | P0 | S | Agents and users need project overview | Description, stack, setup, infra map, badges, screenshot |
| K-012 | Create BLUEPRINT.md | CORE | P0 | M | Architecture needs documentation | System diagram, data flow, module boundaries, API structure |
| K-013 | Create ROADMAP.md | CORE | P1 | S | 12-month plan needs documentation | Quarterly milestones, feature targets, scaling plan |
| K-014 | Create CHANGELOG.md | CORE | P0 | XS | Changes need tracking | Keep a Changelog format, initial history |
| K-015 | Add LICENSE File | CORE | P0 | XS | Legal protection | Proprietary — All Rights Reserved |
| K-016 | Create HANDOFF.md | CORE | P0 | S | Agent handoff needs context | Infra details, current state, open issues, next steps |
| K-017 | Create INVESTORS_PACK.md | CORE | P2 | L | Business case needs documentation | Market size, TAM/SAM/SOM, budget, ROI, competitive analysis |
| K-018 | Create Privacy Policy Page | CORE | P0 | M | Legal compliance for health+financial data | GDPR, CCPA, HIPAA considerations, Plaid data handling |
| K-019 | Create Terms of Service Page | CORE | P1 | M | Legal compliance | Standard ToS with AI/wellness disclaimers |

### COG — Cognitive Mode Engine (Oz Engine)

| Card ID | Title | Module | Priority | Size | Use Case | Requirements |
|---------|-------|--------|----------|------|----------|--------------|
| K-020 | Define Cognitive Mode Types | COG | P0 | S | System needs mode definitions | TypeScript interfaces: Focus, Creative, Executive, Rest |
| K-021 | Build Rule-Based Mode Detection | COG | P0 | L | App needs to auto-detect user's cognitive state | Inputs: time, calendar, last task type, activity level |
| K-022 | Create Mode-Aware UI Wrapper | COG | P0 | L | UI must adapt per cognitive mode | Layout, density, color, animation level changes per mode |
| K-023 | Build Cognitive Growth Dashboard | COG | P0 | XL | Users need to see their cognitive patterns | Mode history chart, time-in-mode, pattern insights |
| K-024 | Implement Memory Anchoring Tests | COG | P1 | L | Users need cognitive exercises | Interactive tests adapted to current mode difficulty |
| K-025 | Implement Pattern Recognition Tests | COG | P1 | L | Cognitive assessment needs multiple test types | Visual pattern tests with ADHD-friendly timing |
| K-026 | Create Mode Transition System | COG | P1 | M | Transitions need to feel smooth and intentional | Animated (with disable), sound cues (optional), notification |
| K-027 | Build On-Device ML Mode Predictor | COG | P3 | XL | Mode detection accuracy improves over time | TF Lite/CoreML model trained on 14+ days of user data |

### FIN — Financial Guardian

| Card ID | Title | Module | Priority | Size | Use Case | Requirements |
|---------|-------|--------|----------|------|----------|--------------|
| K-028 | Integrate Plaid Link | FIN | P0 | L | Users connect bank accounts | Plaid Link SDK, access token storage (encrypted) |
| K-029 | Build Transaction Sync Engine | FIN | P0 | L | App needs real-time transaction data | Pull transactions, categorize, store in DB |
| K-030 | Implement Impulse Spending Detection | FIN | P0 | XL | Core value prop — catch impulse purchases | Algorithm: time patterns, category anomalies, amount thresholds |
| K-031 | Build "Tin Man" Financial Dashboard | FIN | P0 | XL | Users need financial health overview | Spending by category, impulse score, stress level, trends |
| K-032 | Create Spending Alert System | FIN | P0 | L | Users need real-time impulse alerts | Push notification with calming, non-judgmental language |
| K-033 | Build "Emerald City" Savings Goals | FIN | P1 | L | Users set and track savings goals | Goal creation, progress tracking with Oz metaphors |
| K-034 | Implement Bill Reminder Priority Detection | FIN | P1 | M | Past-due bills surface as critical dependencies | Plaid data → bill detection → priority ranking |
| K-035 | Encrypt Plaid Tokens (AES-256-GCM) | FIN | P0 | M | Financial tokens must be secure | Encrypted at rest, key rotation, audit logging |
| K-036 | Build Financial Stress Correlation View | FIN | P2 | L | Users see how finances affect cognitive state | Chart: spending stress vs cognitive mode patterns |

### PROD — Productivity System

| Card ID | Title | Module | Priority | Size | Use Case | Requirements |
|---------|-------|--------|----------|------|----------|--------------|
| K-037 | Build Task Management System | PROD | P0 | XL | Users manage daily tasks | CRUD, priorities, due dates, mode tags, drag-and-drop |
| K-038 | Implement Adaptive Pomodoro Timer | PROD | P1 | L | Focus sessions adapt to cognitive mode | Configurable intervals, mode-aware defaults |
| K-039 | Build "Yellow Brick Road" Progress View | PROD | P1 | L | Visual task completion path | Milestone markers, celebration animations |
| K-040 | Implement "Scarecrow" AI Assistant | PROD | P1 | XL | AI plans daily tasks, surfaces conflicts | OpenRouter LLM with Oz persona, context-aware |
| K-041 | Build Focus Session Mode | PROD | P1 | L | Users need distraction-free single-task view | Lock UI, block navigation, ambient sounds |
| K-042 | Create "Brain Dump Tornado" Mode | PROD | P1 | M | Rapid thought capture without structure | Free-text input, AI organizes afterward |
| K-043 | Build Daily Planning Workflow | PROD | P1 | L | Morning routine structures the day | Calendar review, task prioritize, intention setting |
| K-044 | Implement Task-to-Mode Matching | PROD | P2 | M | Suggest best cognitive mode per task type | ML-based recommendations after data collection |

### UI — Theme & Accessibility

| Card ID | Title | Module | Priority | Size | Use Case | Requirements |
|---------|-------|--------|----------|------|----------|--------------|
| K-045 | Implement Urban Oz Design System | UI | P1 | XL | App needs cohesive visual identity | Dark glassmorphism, neon emerald, component library |
| K-046 | Create Oz Character Avatars | UI | P1 | L | Characters personify app agents | Scarecrow, Tin Man, Lion, Dorothy, Toto — SVG/Lottie |
| K-047 | Build Emerald City Dashboard Layout | UI | P1 | XL | Main dashboard as cyberpunk panorama | Parallax layers, neon city silhouette, glassmorphic panels |
| K-048 | Implement WCAG AAA Mode | UI | P1 | M | Users with visual impairments need high contrast | 18px+ text, focus indicators, reduced motion |
| K-049 | Implement ADHD Mode (Enhanced) | UI | P0 | M | Core users need simplified, sensory-safe UI | Reduced elements, calm colors, focus timers |
| K-050 | Implement Dyslexic Mode | UI | P1 | M | Users with dyslexia need readable text | OpenDyslexic font, line height 1.9, letter spacing 0.2em |
| K-051 | Implement Neuro Mode | UI | P1 | S | Users need zero-animation environment | No transitions, no motion, simplified nav |
| K-052 | Implement ECO CODE Mode | UI | P2 | S | Battery-conscious users need low-power mode | No shadows, no filters, minimal repaints |
| K-053 | Implement No Blue Light Mode | UI | P2 | S | Users need reduced blue light | Amber/sepia palette, CSS filter |
| K-054 | Implement Menstrual UI Mode | UI | P3 | M | Hormone-aware users need soft, affirming UI | Soft pastels, affirmations, cycle tracker hooks |
| K-055 | Build Accessibility Mode Switcher | UI | P1 | M | Quick mode switching without deep navigation | Floating button + settings page, persistent preference |
| K-056 | Implement Ambient Sound System | UI | P2 | M | Focus sessions need audio environments | Emerald City ambience, rain, forest, lo-fi, white noise |

### AUTH — Authentication & Billing

| Card ID | Title | Module | Priority | Size | Use Case | Requirements |
|---------|-------|--------|----------|------|----------|--------------|
| K-057 | Implement Clerk Authentication | AUTH | P0 | L | Users need secure sign-up/sign-in | Email, social login, password reset, MFA optional |
| K-058 | Implement Stripe Subscription Billing | AUTH | P0 | XL | Revenue model needs billing | 5 tiers, billing portal, webhook handling |
| K-059 | Build Token Usage Tracking | AUTH | P1 | L | Enforce tier limits on AI usage | Per-user token counter, overage billing, usage dashboard |
| K-060 | Implement Role-Based Access Control | AUTH | P2 | M | Admin vs user permissions | Middleware guards, admin panel access control |

### SEO — Search & Marketing

| Card ID | Title | Module | Priority | Size | Use Case | Requirements |
|---------|-------|--------|----------|------|----------|--------------|
| K-061 | Add Schema.org JSON-LD | SEO | P1 | S | SEO authority from parent org | Freedom Angel Corp + Neurooz WebApplication schema |
| K-062 | Build About Section (10 pages) | SEO | P2 | L | SEO depth + user trust | All 10 required sub-pages |
| K-063 | Build Blog System | SEO | P2 | XL | Organic traffic growth | 20+ launch posts, auto-generated, RSS feed |
| K-064 | Build FAQ System (50+ questions) | SEO | P2 | L | SEO rich snippets + user support | FAQPage schema, categorized, searchable |
| K-065 | Implement Affiliate Auto-Linker | SEO | P2 | M | Revenue from affiliate links | Amazon tag: meetaudreyeva-20, auto-detect products |
| K-066 | Build Email Subscribe System | SEO | P2 | L | Build subscriber base | Form, double opt-in, centralized DB, export |
| K-067 | Generate Sitemap.xml + Robots.txt | SEO | P1 | XS | Search engine indexing | Auto-generated on build |
| K-068 | Add Open Graph + Twitter Card Tags | SEO | P1 | S | Social sharing optimization | Per-page meta tags |

### TEST — Quality Assurance

| Card ID | Title | Module | Priority | Size | Use Case | Requirements |
|---------|-------|--------|----------|------|----------|--------------|
| K-069 | Set Up Vitest Configuration | TEST | P0 | S | Unit testing infrastructure | vitest.config.ts, test utilities, mock helpers |
| K-070 | Set Up Playwright Configuration | TEST | P0 | S | E2E testing infrastructure | playwright.config.ts, base fixtures |
| K-071 | Write Cognitive Mode Unit Tests | TEST | P1 | L | Mode detection logic must be verified | 90%+ coverage, edge cases, mode transitions |
| K-072 | Write Financial Guardian Unit Tests | TEST | P1 | L | Impulse detection algorithm must be verified | Mock Plaid data, boundary tests, false positive checks |
| K-073 | Write Happy Path E2E Tests | TEST | P1 | L | Critical user flows must work end-to-end | Sign up → connect bank → view dashboard → create task |
| K-074 | Write "Bad Day" Simulation Tests | TEST | P1 | L | Graceful degradation under failure | Block APIs, throttle network, simulate mid-task navigation |
| K-075 | Set Up SHIFT Self-Healing Monitor | TEST | P2 | XL | Automated error detection and diagnosis | Cron-based Playwright runs, LLM diagnosis, alert system |
| K-076 | Write WoZ Behavioral Validation Tests | TEST | P1 | L | Agent behavior must be ADHD-appropriate | 5 scenarios from SHIFT_TESTING_STANDARD |
| K-077 | Run Security Audit (OWASP Top 10) | TEST | P1 | L | No security vulnerabilities in production | XSS, CSRF, SQLi, auth bypass, secret exposure checks |
| K-078 | Run Lighthouse Performance Audit | TEST | P1 | M | Performance score 90+ | Bundle analysis, image optimization, TTI < 3s |

---

## TO-DO (Sprint 0 — Immediate)

| Card ID | Title | Assigned To | Due Date |
|---------|-------|-------------|----------|
| K-011 | Create/Update README.md | Agent | Sprint 0 |
| K-014 | Create CHANGELOG.md | Agent | Sprint 0 |
| K-015 | Add LICENSE File | Agent | Sprint 0 |
| K-006 | Enable Branch Protection Rules | DevOps | Sprint 0 |
| K-007 | Create .env.example | Agent | Sprint 0 |
| K-001 | Configure CI/CD Pipeline | DevOps | Sprint 0 |
| K-069 | Set Up Vitest Configuration | Agent | Sprint 0 |
| K-070 | Set Up Playwright Configuration | Agent | Sprint 0 |

---

## IN PROGRESS

_No cards currently in progress._

---

## REVIEW

_No cards currently in review._

---

## DONE

_No cards completed yet._

---

**Total Cards:** 78  
**P0 (Critical):** 24  
**P1 (High):** 32  
**P2 (Medium):** 16  
**P3 (Future):** 6  
