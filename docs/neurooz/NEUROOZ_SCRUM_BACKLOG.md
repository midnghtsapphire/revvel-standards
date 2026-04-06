# Neurooz — SCRUM Product Backlog & Sprint Planning

**Date:** April 6, 2026  
**Author:** MIDNGHTSAPPHIRE / GlowStarLabs  
**Product Owner:** Audrey Evans  
**Methodology:** EXRUP (Extreme Rapid Programming) + Agile SCRUM  
**Sprint Length:** 1 week (5 working days)  

---

## Product Vision

**Neurooz** is the first ADHD-specific productivity platform that combines real-time cognitive mode adaptation with financial guardianship. Built on the Oz Engine, it uses AI to detect, adapt to, and support neurodivergent cognitive states — turning the chaos of ADHD into a superpower.

**Target Users:** Adults (18-45) with ADHD who struggle with productivity, impulse spending, and executive function.

**Key Differentiators:**
1. Oz Engine — real-time cognitive mode detection and adaptive UI
2. Financial Guardian — Plaid-powered impulse spending prevention
3. Urban Oz Theme — cyberpunk reimagining of Wizard of Oz
4. S.H.I.F.T. Self-Healing — app adapts to user patterns over time

---

## Epic Structure

| Epic ID | Epic Name | Priority | Description |
|---------|-----------|----------|-------------|
| E-001 | Foundation & Compliance | P0 — Critical | Repo artifacts, CI/CD, testing, infra docs |
| E-002 | Oz Engine — Cognitive Modes | P0 — Critical | Core cognitive mode detection and adaptive UI |
| E-003 | Financial Guardian | P0 — Critical | Plaid integration, impulse spending alerts, financial dashboard |
| E-004 | Productivity System | P1 — High | Task management, Pomodoro, focus sessions |
| E-005 | Authentication & Billing | P1 — High | Clerk/JWT auth, Stripe subscriptions |
| E-006 | Accessibility Modes | P1 — High | All 7 mandatory accessibility modes |
| E-007 | Urban Oz Theme & UI | P1 — High | Glassmorphism, Oz characters, neon aesthetic |
| E-008 | SEO & Marketing | P2 — Medium | Schema.org, blog, FAQ, affiliate engine |
| E-009 | Email & Newsletter | P2 — Medium | Subscriber system, auto-newsletters |
| E-010 | Admin Panel | P2 — Medium | Feature flags, UI customization, user management |
| E-011 | Mobile (PWA → Native) | P3 — Future | PWA first, React Native Phase 2 |
| E-012 | Blue Ocean Features | P3 — Future | Biometrics, AR, spatial computing, social features |

---

## Sprint 0: Foundation (Week 1)

**Goal:** Get the repo fully compliant with revvel-standards. Zero code — all documentation, CI/CD, and infrastructure.

| Ticket | Task | Story Points | Acceptance Criteria |
|--------|------|-------------|---------------------|
| S0-001 | Create/update README.md with standard sections | 2 | README has: description, tech stack, setup instructions, infra map table, badges |
| S0-002 | Create BLUEPRINT.md — technical architecture | 3 | Includes: system diagram, data flow, module boundaries, API structure |
| S0-003 | Create ROADMAP.md — 12-month strategic timeline | 2 | Includes: quarterly milestones, feature targets, scaling plan |
| S0-004 | Create CHANGELOG.md | 1 | Keep a Changelog format, all historical changes documented |
| S0-005 | Add LICENSE file | 1 | Proprietary — All Rights Reserved, Audrey Evans / GlowStarLabs |
| S0-006 | Copy and configure deploy.yml from templates/cicd/ | 3 | GH Actions pipeline: build → test → deploy on push to main |
| S0-007 | Copy and configure deploy.sh | 2 | Manual fallback deploy script working |
| S0-008 | Create HANDOFF.md with infrastructure details | 2 | Droplet IP, directory, port, PM2 process, env vars list |
| S0-009 | Enable branch protection rules on GitHub | 1 | No direct push to main, require PR review |
| S0-010 | Create initial Vitest config + first test | 2 | `vitest.config.ts` present, at least 1 passing test |
| S0-011 | Create Playwright config + first E2E test | 3 | `playwright.config.ts` present, happy path test passing |
| S0-012 | Add Schema.org JSON-LD to app layout | 2 | Freedom Angel Corp parent org + Neurooz WebApplication schema |
| S0-013 | Add privacy policy page | 2 | Covers: cognitive data, financial data, Plaid, GDPR, CCPA |
| S0-014 | Add .env.example with all required variables | 1 | All env vars documented (no actual values) |
| **Total** | | **27 SP** | |

---

## Sprint 1: Oz Engine — Core (Week 2)

**Goal:** Ship the cognitive mode engine with rule-based detection and adaptive UI.

| Ticket | Task | Story Points | Acceptance Criteria |
|--------|------|-------------|---------------------|
| S1-001 | Create `/modules/cognitive/` module structure | 2 | Module has: types, hooks, components, tests directories |
| S1-002 | Implement cognitive mode types (Focus, Creative, Executive, Rest) | 2 | TypeScript interfaces defined, Zod schemas for validation |
| S1-003 | Build rule-based mode detection engine | 5 | Detects mode based on: time-of-day, last task type, calendar events, user activity |
| S1-004 | Create mode-aware UI wrapper component | 3 | Component adapts layout, colors, and information density per mode |
| S1-005 | Build Cognitive Growth Dashboard | 5 | Shows: mode history, time-in-mode charts, cognitive pattern insights |
| S1-006 | Implement Memory Anchoring test module | 3 | Interactive memory tests adapted to current cognitive mode |
| S1-007 | Implement Pattern Recognition test module | 3 | Visual pattern tests with ADHD-appropriate timing |
| S1-008 | Create mode transition animations (with disable toggle) | 2 | Smooth transitions between modes, respects prefers-reduced-motion |
| S1-009 | Write Vitest unit tests for mode detection | 3 | 90%+ coverage on detection logic |
| S1-010 | Write WoZ behavioral test scenarios | 2 | 5 scenarios testing mode detection accuracy |
| **Total** | | **30 SP** | |

---

## Sprint 2: Financial Guardian (Week 3)

**Goal:** Ship Plaid integration and impulse spending prevention.

| Ticket | Task | Story Points | Acceptance Criteria |
|--------|------|-------------|---------------------|
| S2-001 | Create `/modules/financial/` module structure | 2 | Module has: types, hooks, components, api, tests |
| S2-002 | Implement Plaid Link integration | 5 | Users can connect bank accounts via Plaid Link |
| S2-003 | Build transaction sync and categorization | 5 | Transactions pulled, categorized by type, stored in DB |
| S2-004 | Implement impulse spending detection algorithm | 5 | Flags transactions matching impulse patterns (time, amount, category) |
| S2-005 | Build "Tin Man" financial health dashboard | 5 | Shows: spending by category, impulse score, financial stress level |
| S2-006 | Create spending alert notification system | 3 | Push alerts when impulse spending detected; calming, non-judgmental tone |
| S2-007 | Implement "Emerald City" savings goals | 3 | Users set savings goals; progress tracked with Oz metaphors |
| S2-008 | Build bill reminder with priority detection | 3 | Past-due bills surfaced as "Critical Dependencies" (SHIFT standard) |
| S2-009 | Encrypt Plaid tokens (AES-256-GCM) | 3 | Tokens encrypted at rest, key in HashiCorp Vault or env var |
| S2-010 | Write Vitest + Playwright tests for financial module | 3 | Unit tests for detection algorithm; E2E test for Plaid Link flow |
| **Total** | | **37 SP** | |

---

## Sprint 3: Productivity System (Week 4)

**Goal:** Ship task management, Pomodoro, and focus sessions.

| Ticket | Task | Story Points | Acceptance Criteria |
|--------|------|-------------|---------------------|
| S3-001 | Create `/modules/productivity/` module structure | 2 | Module has: types, hooks, components, tests |
| S3-002 | Build task management system | 5 | CRUD tasks, priorities, due dates, cognitive mode tagging |
| S3-003 | Implement Pomodoro timer with ADHD adaptations | 3 | Configurable intervals, "10-3 Rule" breaks, "Brain Dump Tornado" mode |
| S3-004 | Build "Yellow Brick Road" progress visualization | 3 | Task completion visualized as journey along the yellow brick road |
| S3-005 | Implement "Scarecrow" AI assistant integration | 5 | AI agent that plans daily tasks, surfaces conflicts, suggests mode switches |
| S3-006 | Build focus session mode | 3 | Locks UI to single task, blocks distractions, ambient sound options |
| S3-007 | Implement task-to-cognitive-mode matching | 3 | Suggests best mode for each task type |
| S3-008 | Create daily planning workflow | 3 | Morning routine: review calendar, prioritize tasks, set intentions |
| S3-009 | Write comprehensive tests | 3 | Unit + E2E tests for all productivity features |
| **Total** | | **30 SP** | |

---

## Sprint 4: Auth, Billing & Accessibility (Week 5)

**Goal:** Ship authentication, Stripe subscriptions, and all 7 accessibility modes.

| Ticket | Task | Story Points | Acceptance Criteria |
|--------|------|-------------|---------------------|
| S4-001 | Implement Clerk authentication | 3 | Sign up, sign in, social login, password reset |
| S4-002 | Implement Stripe subscription billing | 5 | 5 tiers (Free/Starter/Pro/Business/Enterprise), billing portal |
| S4-003 | Build token usage tracking | 3 | Track token consumption per user, enforce tier limits |
| S4-004 | Implement WCAG AAA mode | 3 | High contrast, 18px+ text, focus indicators, reduced motion |
| S4-005 | Implement ADHD Mode (enhanced) | 2 | Simplified layout, Pomodoro integration, sensory-safe UI |
| S4-006 | Implement Dyslexic Mode | 2 | OpenDyslexic font, line height 1.9, letter spacing 0.2em |
| S4-007 | Implement Neuro Mode | 2 | No animations, no transitions, simplified navigation |
| S4-008 | Implement ECO CODE Mode | 2 | Minimal animations, no shadows/filters, battery-optimized |
| S4-009 | Implement No Blue Light Mode | 2 | Warm amber/sepia palette, reduced blue emission |
| S4-010 | Implement Menstrual UI Mode | 2 | Soft pastels, cycle tracker hooks, affirmations |
| S4-011 | Build accessibility mode switcher component | 2 | Persistent toggle in settings + quick-access floating button |
| S4-012 | Write accessibility-specific E2E tests | 3 | Test each mode renders correctly, meets WCAG criteria |
| **Total** | | **31 SP** | |

---

## Sprint 5: SEO, Marketing & Admin (Week 6)

**Goal:** Ship all mandatory SEO/marketing features and admin panel.

| Ticket | Task | Story Points | Acceptance Criteria |
|--------|------|-------------|---------------------|
| S5-001 | Build About section (10 sub-pages) | 3 | All 10 required pages populated |
| S5-002 | Build blog system with auto-generation | 5 | 20+ launch posts via OpenRouter, SEO-optimized |
| S5-003 | Build FAQ system (50+ questions) | 3 | Categorized, Schema markup, searchable |
| S5-004 | Implement affiliate auto-linker | 2 | Amazon tag embedded in product mentions |
| S5-005 | Build email subscribe system | 3 | Form, double opt-in, centralized DB |
| S5-006 | Build admin panel — UI customization | 5 | Colors, fonts, layouts, branding controls |
| S5-007 | Build admin panel — feature flags | 3 | Per-user and global feature toggles |
| S5-008 | Implement sitemap.xml + robots.txt | 1 | Auto-generated, configured |
| S5-009 | Add Open Graph + Twitter Card meta tags | 2 | Per-page social sharing optimization |
| S5-010 | Implement internal backlinking system | 2 | Every page links to 5-10 other pages |
| S5-011 | Add cross-app backlinks to other Revvel apps | 1 | Footer links to all ecosystem apps |
| **Total** | | **30 SP** | |

---

## Sprint 6: Urban Oz Theme & Polish (Week 7)

**Goal:** Apply the full Urban Oz visual identity and polish for launch.

| Ticket | Task | Story Points | Acceptance Criteria |
|--------|------|-------------|---------------------|
| S6-001 | Implement Urban Oz design system (see THEME_SPEC) | 5 | Dark glassmorphism, neon emerald, all components themed |
| S6-002 | Create Oz character avatar system | 3 | Scarecrow, Tin Man, Lion, Dorothy, Toto — animated SVG/Lottie |
| S6-003 | Build Emerald City dashboard layout | 5 | Main dashboard as cyberpunk Emerald City panorama |
| S6-004 | Implement Yellow Brick Road progress system | 3 | Visual progress path with milestone markers |
| S6-005 | Add ambient sound system | 2 | Emerald City ambience, nature sounds, focus sounds |
| S6-006 | Performance audit (Lighthouse 90+) | 3 | All metrics green, bundle size optimized |
| S6-007 | Security audit | 3 | OWASP Top 10 check, dependency scan, secret scan |
| S6-008 | Final E2E test suite | 5 | All critical paths tested, "Bad Day" simulations passing |
| S6-009 | Deploy to production | 3 | Live on DigitalOcean, Nginx configured, SSL active |
| S6-010 | Update INFRASTRUCTURE_MAP.md | 1 | Neurooz entry added to master infra map |
| **Total** | | **33 SP** | |

---

## Velocity Tracking

| Sprint | Planned SP | Completed SP | Velocity | Notes |
|--------|-----------|-------------|----------|-------|
| Sprint 0 | 27 | — | — | Foundation |
| Sprint 1 | 30 | — | — | Oz Engine |
| Sprint 2 | 37 | — | — | Financial Guardian |
| Sprint 3 | 30 | — | — | Productivity |
| Sprint 4 | 31 | — | — | Auth + Accessibility |
| Sprint 5 | 30 | — | — | SEO + Admin |
| Sprint 6 | 33 | — | — | Theme + Launch |

**Total Planned:** 218 Story Points across 7 sprints (7 weeks)

---

## User Stories (Priority Ordered)

### Critical (P0)

**US-001:** As an adult with ADHD, I need the app to detect my current cognitive mode so the UI adapts without me having to configure anything manually, because executive function tasks are exactly what I struggle with.

**US-002:** As a user with ADHD who impulse-spends, I need the app to alert me before I make a purchase that doesn't align with my budget, using a calming tone — not guilt or shame.

**US-003:** As a user, I need to sign up and manage my subscription so I can access premium features without a complicated billing process.

### High (P1)

**US-004:** As a user with ADHD, I need a Pomodoro timer that adapts to my current cognitive mode — shorter sessions during low-focus periods, longer during hyperfocus.

**US-005:** As a user with dyslexia and ADHD, I need to switch between accessibility modes with one click so the app is comfortable to use regardless of my current state.

**US-006:** As a user, I need a daily planning workflow that surfaces conflicts between personal obligations and work deadlines, so I don't hyperfocus on one while the other burns.

**US-007:** As a user, I need to see my cognitive growth over time through a dashboard that shows patterns and progress, reinforcing that ADHD management is a skill that improves.

### Medium (P2)

**US-008:** As a user, I need a "Brain Dump Tornado" mode where I can rapidly capture every thought without structure, and the AI organizes it for me afterward.

**US-009:** As a user, I need ambient sounds during focus sessions to create a sensory-safe environment.

**US-010:** As an admin, I need to customize the app's appearance and toggle features without deploying new code.

### Future (P3)

**US-011:** As a user, I want the app to use my Apple Watch heart rate to detect focus/distraction states and adjust the UI accordingly.

**US-012:** As a user, I want to connect with other ADHD users in a supportive community within the app.

---

## Definition of Done

A task is **Done** when:
1. Code is written and compiles with zero TypeScript errors
2. Unit tests are written and passing (90%+ coverage for critical modules)
3. E2E test covers the happy path
4. Code has passed Venice AI review (or fallback reviewer)
5. PR is approved and merged to main via feature branch
6. CHANGELOG.md is updated
7. HANDOFF.md is updated if infrastructure changed
8. Feature works as described in acceptance criteria (behavioral validation, not just compilation)
