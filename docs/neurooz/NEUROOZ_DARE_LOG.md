# Neurooz — D.A.R.E. Log

**Date:** April 6, 2026  
**Author:** MIDNGHTSAPPHIRE / GlowStarLabs  
**Framework:** D.A.R.E. (Define → Assess → Respond → Evaluate)  
**App:** Neurooz — AI-Powered ADHD Productivity & Financial Guardian  

---

## Active DARE Items

### DARE-001: Architecture Decision — Monolith vs. Modular

| Phase | Detail |
|-------|--------|
| **Define** | Neurooz has three major feature pillars (Cognitive Mode Engine, Financial Guardian, Productivity System). Should these be a single monolith, microservices, or a modular monolith? |
| **Assess** | **Option A: Monolith** — Fastest to ship, simplest deployment, matches GrowlingEyes reference pattern. Risk: becomes unwieldy at scale. **Option B: Microservices** — Best separation of concerns, independent scaling. Risk: massive overhead for solo dev + AI agents, deployment complexity kills velocity. **Option C: Modular Monolith** — Single deployable unit with clear internal module boundaries. Modules can be extracted to services later. Best balance. |
| **Respond** | **Chose Option C: Modular Monolith.** Directory structure separates concerns (`/modules/cognitive/`, `/modules/financial/`, `/modules/productivity/`) but compiles and deploys as one app. Follows EXRUP "one-iteration delivery" principle. |
| **Evaluate** | TBD — Evaluate after v1.0 launch. If any module needs independent scaling, extract it. |

---

### DARE-002: Financial Data Security — Plaid Token Storage

| Phase | Detail |
|-------|--------|
| **Define** | Plaid access tokens grant read access to users' bank accounts. Where and how should these tokens be stored? Breach = catastrophic. |
| **Assess** | **Option A: Database (encrypted at rest)** — Simple, fast queries. Risk: database breach exposes all tokens even if encrypted. **Option B: HashiCorp Vault** — Industry standard for secrets. Risk: adds infrastructure complexity, single point of failure if Vault goes down. **Option C: Vault + Database hybrid** — Vault stores encryption keys, database stores encrypted tokens. Vault key rotation without re-encrypting all rows. |
| **Respond** | **Chose Option C: Hybrid.** Plaid tokens encrypted with AES-256-GCM before database storage. Encryption key managed by HashiCorp Vault with automatic rotation every 90 days. In case of Vault outage, app operates in read-only financial mode using cached data. |
| **Evaluate** | TBD — Penetration test required before launch. |

---

### DARE-003: Cognitive Mode Detection — Rule-Based vs. ML

| Phase | Detail |
|-------|--------|
| **Define** | The Oz Engine needs to detect which cognitive mode the user is in (Focus, Creative, Executive Function, Rest). How should mode detection work? |
| **Assess** | **Option A: User self-reports** — Button press to switch modes. Simplest. Risk: ADHD users won't remember to switch. **Option B: Rule-based heuristics** — Time-of-day, calendar events, app usage patterns. Medium complexity. Risk: inaccurate for individual variation. **Option C: On-device ML** — Train a lightweight model on user behavior patterns. Most accurate over time. Risk: cold start problem, privacy concerns if data leaves device. **Option D: Hybrid (B+C)** — Start with rules, collect data, train personalized model after 2 weeks of usage. |
| **Respond** | **Chose Option D: Hybrid.** Launch with rule-based detection (time, calendar, last task type). After 14 days of user data, offer opt-in personalized ML model trained on-device using TensorFlow Lite / CoreML. No raw behavioral data ever leaves the device. |
| **Evaluate** | TBD — Measure mode detection accuracy after beta launch. Target: 80%+ accuracy within 30 days of use. |

---

### DARE-004: Oz Theme — Classic Fantasy vs. Urban Reimagining

| Phase | Detail |
|-------|--------|
| **Define** | The Wizard of Oz theme is core to Neurooz's identity (Scarecrow agent, Emerald City dashboard, Yellow Brick Road progress). Should the visual treatment be classic fantasy or urban/modern? |
| **Assess** | **Option A: Classic Fantasy** — Storybook illustrations, warm earth tones, whimsical. Risk: may feel juvenile for adult ADHD users (18-45 target). **Option B: Urban Reimagining** — Cyberpunk Oz, neon emerald city, graffiti typography, dark mode cityscape. Risk: may alienate users who love classic Oz. **Option C: Adaptive Theme** — Default to urban, offer "Classic" mode toggle. Both share the same Oz metaphors but different visual treatments. |
| **Respond** | **Chose Option C: Adaptive Theme.** Urban Oz is the default (dark glassmorphism, neon emerald accents, street art elements). Classic Oz is available as a theme toggle. All Oz character metaphors (Scarecrow, Tin Man, Lion, Dorothy) remain consistent across both themes. |
| **Evaluate** | TBD — A/B test both themes in beta. Track engagement metrics per theme. |

---

### DARE-005: Agent Shipping Reliability — Preventing Incomplete Builds

| Phase | Detail |
|-------|--------|
| **Define** | AI agents repeatedly fail to ship Neurooz to completion. Features are partially built, tests are missing, deployment configs are incomplete. The app never reaches "fully done." |
| **Assess** | **Root causes identified:** (1) Agents lose context between sessions — no persistent state. (2) Specs are too broad — agents try to build everything at once and run out of context window. (3) No acceptance criteria — agents declare "done" when code compiles, not when features work. (4) No automated gates — nothing stops a broken build from being called "complete." (5) Handoff documentation is missing — next agent starts from scratch. |
| **Respond** | **Implemented SHIFT framework:** (1) Break work into micro-tasks (max 2-hour agent sessions). (2) Every task has explicit acceptance criteria with Vitest/Playwright tests. (3) Deploy agent model — no agent deploys to production; a final deploy agent validates everything. (4) Mandatory HANDOFF.md updated after every session. (5) WoZ behavioral validation — test that features actually work for ADHD users, not just compile. (6) DARE log tracks every decision for continuity. |
| **Evaluate** | TBD — Track completion rate per sprint. Target: 90%+ tasks fully completed (including tests) per agent session. |

---

### DARE-006: Subscription Model — Token-Based vs. Feature-Gated

| Phase | Detail |
|-------|--------|
| **Define** | Should Neurooz use the Revvel token economy (each AI action costs tokens) or traditional feature-gating (free users get X features, paid get Y)? |
| **Assess** | **Option A: Token economy** — Matches Revvel standard. Users buy tokens, each AI action costs 2-5 tokens. Risk: ADHD users may feel anxious about "spending" tokens, creating a scarcity mindset that undermines the app's calming purpose. **Option B: Feature-gated** — Free tier gets core productivity + limited AI. Pro gets unlimited AI + financial guardian. Risk: doesn't match Revvel standard, harder to monetize power users. **Option C: Hybrid** — Feature-gated tiers with generous token allowances. Pro tier feels "unlimited" in practice. Overage billed per-token. |
| **Respond** | **Chose Option C: Hybrid.** Free = 50 tokens/month (basic productivity). Starter ($9) = 500 tokens (enough for daily use). Pro ($29) = 5000 tokens (effectively unlimited for individual). Overage: $0.01/token. Financial guardian requires Starter+. This respects the Revvel standard while protecting ADHD users from scarcity anxiety. |
| **Evaluate** | TBD — Monitor token usage patterns in beta. Adjust tier limits based on actual consumption data. |

---

### DARE-007: Mobile Strategy — React Native vs. PWA

| Phase | Detail |
|-------|--------|
| **Define** | ADHD users need the app on mobile (notifications, quick capture, Apple Watch). Should Neurooz launch as React Native (via CodeMagic) or as a Progressive Web App? |
| **Assess** | **Option A: React Native + Expo** — Matches Revvel mobile standard. Native notifications, HealthKit access, app store presence. Risk: doubles development effort, CodeMagic CI/CD setup time. **Option B: PWA** — Ship immediately from existing web app. Push notifications (limited iOS), offline support. Risk: no HealthKit, second-class app store experience. **Option C: PWA first, React Native second** — Launch web MVP as PWA. Build native app in Phase 2 once product-market fit is validated. |
| **Respond** | **Chose Option C: PWA first.** Ship web app as PWA for immediate mobile access. Implement service workers for offline. Plan React Native + Expo build for Q3 2026 once user base validates demand. Apple Watch integration requires native — this is a Phase 2 feature. |
| **Evaluate** | TBD — Track PWA install rates. If >30% of users install PWA, validates mobile demand for native app. |

---

### DARE-008: Green Coding — Energy Efficiency Strategy

| Phase | Detail |
|-------|--------|
| **Define** | Revvel standards require ECO CODE mode. Beyond a UI toggle, how should Neurooz implement genuine green coding practices? |
| **Assess** | **Option A: UI-only eco mode** — Disable animations, reduce repaints, dark mode saves OLED battery. Minimal effort, minimal impact. **Option B: Full-stack green** — UI eco mode + server-side: lazy-load modules, compress API payloads, implement request coalescing, use edge caching, minimize database queries. **Option C: Carbon-aware computing** — All of Option B + schedule heavy AI tasks during low-carbon-intensity grid hours, track and display carbon footprint per user session. |
| **Respond** | **Chose Option B for v1, plan Option C for v2.** v1 implements: dark mode default (OLED savings), `prefers-reduced-motion` respect, lazy-loaded routes, compressed API responses (gzip/brotli), database query optimization, image optimization (WebP/AVIF). v2 adds carbon-aware scheduling via WattTime or Electricity Maps API. |
| **Evaluate** | TBD — Measure Lighthouse performance score (target 90+). Track average page weight and API response sizes. |

---

## Resolved DARE Items

_None yet — project is in pre-production._

---

**Review Cadence:** Update this log after every major decision or agent session. Every DARE item must reach the Evaluate phase within 30 days of creation.
