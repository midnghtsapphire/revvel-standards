# Neurooz — Detailed Change Plan

**Date:** April 6, 2026  
**Author:** MIDNGHTSAPPHIRE / GlowStarLabs  
**Principle:** Updates and additions ONLY — No deletion of existing code unless:  
  1. Recursive coding optimization (replacing verbose code with efficient patterns)  
  2. Green coding energy savings (removing wasteful computations)  
**Green Coding:** All changes prioritize energy efficiency, reduced bundle size, and minimal resource consumption  

---

## 1. Change Philosophy

This plan follows three rules:

1. **EXTEND, don't replace.** If a feature exists, build on it. Don't rewrite it.
2. **ADD, don't delete.** New files, new modules, new routes — alongside existing ones.
3. **OPTIMIZE, don't rebuild.** Performance improvements happen to existing code through refactoring, not replacement.

**Exceptions (allowed deletions):**
- Dead imports (e.g., `import { unused } from 'package'`) — removing unused imports saves parse time
- Duplicate code — consolidating identical code into shared utilities saves energy
- Console.log statements in production paths — removing debug logging saves I/O
- Unused dependencies in `package.json` — smaller `node_modules` = faster installs = less energy

---

## 2. Phase 1: Compliance & Documentation (Week 1)

**Goal:** Zero code changes. Only add documentation and configuration files.

### Changes (All Additions)

| # | Change | Type | File(s) | Impact |
|---|--------|------|---------|--------|
| 1.1 | Create README.md (or update existing) | Add/Update | `README.md` | Standard project overview with infra map |
| 1.2 | Create BLUEPRINT.md | Add | `BLUEPRINT.md` | Technical architecture documentation |
| 1.3 | Create ROADMAP.md | Add | `ROADMAP.md` | 12-month strategic plan |
| 1.4 | Create CHANGELOG.md | Add | `CHANGELOG.md` | Historical change tracking |
| 1.5 | Add LICENSE file | Add | `LICENSE` | Proprietary license |
| 1.6 | Create HANDOFF.md | Add | `HANDOFF.md` | Agent handoff documentation |
| 1.7 | Create .env.example | Add | `.env.example` | Environment variable documentation |
| 1.8 | Create deploy.yml | Add | `.github/workflows/deploy.yml` | CI/CD pipeline |
| 1.9 | Create deploy.sh | Add | `deploy.sh` | Manual deploy fallback |
| 1.10 | Create privacy policy page | Add | `src/app/privacy/page.tsx` | Legal compliance |
| 1.11 | Create terms of service page | Add | `src/app/terms/page.tsx` | Legal compliance |
| 1.12 | Create DARE_LOG.md | Add | `DARE_LOG.md` | Decision tracking |
| 1.13 | Add .gitignore entries | Update | `.gitignore` | Exclude .env, node_modules, dist |

**Deletions: NONE**  
**Green Coding Impact:** `.github/workflows/deploy.yml` enables automated deploys — eliminates manual SSH sessions (saves developer energy + reduces idle server connections)

---

## 3. Phase 2: Module Structure & Foundation (Week 2)

**Goal:** Reorganize code into modular structure. Move files — don't delete them.

### Changes

| # | Change | Type | File(s) | Impact |
|---|--------|------|---------|--------|
| 2.1 | Create module directories | Add | `src/modules/{cognitive,financial,productivity,auth,accessibility,marketing}/` | Modular organization |
| 2.2 | Move existing cognitive code to module | Move | Existing files → `src/modules/cognitive/` | No deletion — files move |
| 2.3 | Move existing financial code to module | Move | Existing files → `src/modules/financial/` | No deletion — files move |
| 2.4 | Create shared utilities directory | Add | `src/shared/{ui,api,db,config,types}/` | Cross-module utilities |
| 2.5 | Create theme directory | Add | `src/theme/{urban,classic,tokens}/` | Design system |
| 2.6 | Add Vitest configuration | Add | `vitest.config.ts` | Testing infrastructure |
| 2.7 | Add Playwright configuration | Add | `playwright.config.ts` | E2E testing |
| 2.8 | Create first unit test | Add | `src/modules/cognitive/tests/mode-detection.test.ts` | Testing baseline |
| 2.9 | Create first E2E test | Add | `tests/e2e/happy-path.spec.ts` | E2E testing baseline |
| 2.10 | Add tsconfig paths for modules | Update | `tsconfig.json` | `@/modules/*` path aliases |
| 2.11 | Add test scripts to package.json | Update | `package.json` | `test`, `test:e2e`, `test:coverage` scripts |

**Deletions:** NONE (files are moved, not deleted)  
**Green Coding Impact:** Module boundaries enable tree-shaking — unused modules don't get bundled, reducing JavaScript payload by ~30-40%

### Update Patterns (Refactoring for efficiency)

| # | File | Current | Updated | Green Coding Benefit |
|---|------|---------|---------|---------------------|
| 2.12 | `package.json` | Missing test scripts | Add `"test": "vitest"`, `"test:e2e": "playwright test"` | Testing prevents buggy deploys (wasted compute) |
| 2.13 | `tsconfig.json` | Basic paths | Add module aliases (`@/modules/*`, `@/shared/*`) | Shorter imports = smaller bundle |

---

## 4. Phase 3: Core Feature Enhancements (Weeks 3-5)

**Goal:** Add new features on top of existing code. Enhance existing features.

### 3.1 Cognitive Engine Enhancements

| # | Change | Type | Details | Green Coding |
|---|--------|------|---------|-------------|
| 3.1.1 | Add mode detection hook | Add | `src/modules/cognitive/hooks/useCognitiveMode.ts` — rule-based detection | Memoized with `useMemo` to prevent re-computation |
| 3.1.2 | Add mode history storage | Add | New Drizzle table: `cognitive_mode_sessions` | Indexed columns for efficient queries |
| 3.1.3 | Add mode-aware UI wrapper | Add | `src/modules/cognitive/components/ModeAwareLayout.tsx` | CSS variables swap — no re-render of children |
| 3.1.4 | Add cognitive test components | Add | `src/modules/cognitive/components/MemoryTest.tsx`, `PatternTest.tsx` | Lazy-loaded — not in initial bundle |
| 3.1.5 | Add cognitive growth dashboard | Add | `src/modules/cognitive/components/GrowthDashboard.tsx` | Charts use `canvas` (GPU-accelerated) not SVG (CPU) |
| 3.1.6 | Add unit tests for mode detection | Add | `src/modules/cognitive/tests/*.test.ts` | — |

### 3.2 Financial Guardian Enhancements

| # | Change | Type | Details | Green Coding |
|---|--------|------|---------|-------------|
| 3.2.1 | Add Plaid Link integration | Add | `src/modules/financial/services/PlaidService.ts` | Lazy-load Plaid SDK only when user initiates |
| 3.2.2 | Add transaction sync service | Add | `src/modules/financial/services/TransactionSync.ts` | Incremental sync — only fetch new transactions |
| 3.2.3 | Add impulse detection algorithm | Add | `src/modules/financial/services/ImpulseDetector.ts` | Run in Web Worker — don't block UI thread |
| 3.2.4 | Add financial dashboard | Add | `src/modules/financial/components/TinManDashboard.tsx` | Virtualized list for long transaction history |
| 3.2.5 | Add impulse alert component | Add | `src/modules/financial/components/ImpulseAlert.tsx` | Notification API — no constant polling |
| 3.2.6 | Add Plaid token encryption | Add | `src/modules/financial/services/TokenEncryption.ts` | AES-256-GCM — secure and fast |
| 3.2.7 | Add financial Drizzle tables | Add | `src/shared/db/schema/financial.ts` | 4 new tables with proper indexes |
| 3.2.8 | Add financial tRPC router | Add | `server/routers/financial.ts` | Zod-validated inputs |
| 3.2.9 | Add unit tests | Add | `src/modules/financial/tests/*.test.ts` | — |

### 3.3 Productivity Enhancements

| # | Change | Type | Details | Green Coding |
|---|--------|------|---------|-------------|
| 3.3.1 | Add task management system | Add | `src/modules/productivity/components/TaskManager.tsx` | Optimistic updates — reduce API calls |
| 3.3.2 | Add Pomodoro timer | Add | `src/modules/productivity/components/PomodoroTimer.tsx` | `requestAnimationFrame` only when visible |
| 3.3.3 | Add Yellow Brick Road progress | Add | `src/modules/productivity/components/YellowBrickRoad.tsx` | SVG path — lighter than canvas for this use |
| 3.3.4 | Add Scarecrow AI chat | Add | `src/modules/productivity/components/ScarecrowChat.tsx` | Streaming responses via SSE (not polling) |
| 3.3.5 | Add focus session mode | Add | `src/modules/productivity/components/FocusSession.tsx` | Pause all non-essential background processes |
| 3.3.6 | Add Brain Dump Tornado | Add | `src/modules/productivity/components/BrainDump.tsx` | LocalStorage draft saving — no API on keystrokes |
| 3.3.7 | Add task Drizzle tables | Add | `src/shared/db/schema/tasks.ts` | Indexed by userId + dueDate |
| 3.3.8 | Add productivity tRPC router | Add | `server/routers/productivity.ts` | Batch mutations supported |
| 3.3.9 | Add unit tests | Add | `src/modules/productivity/tests/*.test.ts` | — |

### 3.4 Authentication & Billing

| # | Change | Type | Details | Green Coding |
|---|--------|------|---------|-------------|
| 3.4.1 | Add Clerk provider | Add | `src/modules/auth/providers/ClerkProvider.tsx` | Lazy-load auth UI components |
| 3.4.2 | Add Stripe subscription service | Add | `src/modules/auth/services/StripeService.ts` | Webhook-driven — no polling for status |
| 3.4.3 | Add token usage tracker | Add | `src/modules/auth/services/TokenTracker.ts` | Batched writes — accumulate then flush |
| 3.4.4 | Add billing portal page | Add | `src/app/billing/page.tsx` | Redirect to Stripe portal — minimal custom UI |
| 3.4.5 | Add auth middleware | Add | `server/middleware/auth.ts` | JWT validation with caching |
| 3.4.6 | Add auth Drizzle tables | Add | `src/shared/db/schema/users.ts` | User preferences + subscription state |

---

## 5. Phase 4: Accessibility & Theme (Week 5-6)

| # | Change | Type | Details | Green Coding |
|---|--------|------|---------|-------------|
| 4.1 | Add Urban Oz CSS design tokens | Add | `src/theme/tokens/variables.css` | CSS variables — no JS computation for theming |
| 4.2 | Add accessibility mode context | Add | `src/modules/accessibility/context/AccessibilityContext.tsx` | Context avoids prop drilling |
| 4.3 | Add WCAG AAA mode styles | Add | `src/modules/accessibility/modes/wcag-aaa.css` | Pure CSS — zero JS overhead |
| 4.4 | Add ADHD mode styles (enhanced) | Add | `src/modules/accessibility/modes/adhd.css` | Removes animations — saves GPU cycles |
| 4.5 | Add Dyslexic mode styles | Add | `src/modules/accessibility/modes/dyslexic.css` | Font swap only — minimal repaint |
| 4.6 | Add Neuro mode styles | Add | `src/modules/accessibility/modes/neuro.css` | Disables ALL animations — maximum energy savings |
| 4.7 | Add ECO CODE mode styles | Add | `src/modules/accessibility/modes/eco.css` | True OLED black, no blur/shadow/filter |
| 4.8 | Add No Blue Light mode styles | Add | `src/modules/accessibility/modes/no-blue-light.css` | CSS filter — single operation |
| 4.9 | Add Menstrual UI mode styles | Add | `src/modules/accessibility/modes/menstrual.css` | Soft color swap — CSS only |
| 4.10 | Add mode switcher component | Add | `src/modules/accessibility/components/ModeSwitcher.tsx` | LocalStorage persistence — no API call |
| 4.11 | Add Oz character Lottie files | Add | `public/animations/{scarecrow,tinman,lion,dorothy,toto}.json` | Max 50KB per animation |
| 4.12 | Add Emerald City parallax BG | Add | `src/theme/urban/EmeraldCitySkyline.tsx` | CSS-only parallax (no JS scroll listeners) |
| 4.13 | Add Schema.org JSON-LD | Add | `src/app/layout.tsx` (update) | Add `<script type="application/ld+json">` |
| 4.14 | Add accessibility E2E tests | Add | `tests/e2e/accessibility.spec.ts` | axe-core integration |

**ECO CODE Mode Savings Estimate:**
- No `backdrop-filter: blur()` → saves ~10% GPU per frame
- No `box-shadow` → saves ~5% GPU per frame
- No animations → saves ~15% GPU overall
- OLED black background → saves ~30% display power on OLED screens
- Total estimated battery saving: **~40-50% display power in ECO mode**

---

## 6. Phase 5: SEO & Marketing (Week 6)

| # | Change | Type | Details | Green Coding |
|---|--------|------|---------|-------------|
| 5.1 | Add sitemap.xml generation | Add | `scripts/generate-sitemap.ts` | Static generation at build — no runtime cost |
| 5.2 | Add robots.txt | Add | `public/robots.txt` | Static file |
| 5.3 | Add About section pages | Add | `src/app/about/{page,team,technology,mission,...}.tsx` | Static pages — no API calls |
| 5.4 | Add blog system | Add | `src/modules/marketing/content/Blog.tsx` + API | Markdown-based — lightweight |
| 5.5 | Add FAQ system | Add | `src/modules/marketing/content/FAQ.tsx` | Static JSON — no database queries |
| 5.6 | Add email subscribe form | Add | `src/modules/marketing/email/SubscribeForm.tsx` | Single API call on submit |
| 5.7 | Add affiliate auto-linker | Add | `src/modules/marketing/affiliate/AutoLinker.ts` | String replacement — O(n) |
| 5.8 | Add Open Graph meta tags | Update | `src/app/layout.tsx` | Static meta tags — zero runtime cost |

---

## 7. Phase 6: Performance Optimization (Green Coding Focus)

### Code-Level Optimizations (Update Existing Code)

| # | Change | Type | Current State | Optimized State | Energy Savings |
|---|--------|------|--------------|-----------------|----------------|
| 6.1 | Add route-level code splitting | Update | All routes bundled together | `React.lazy()` + `Suspense` per route | ~40% smaller initial bundle |
| 6.2 | Add image optimization | Update | PNG/JPEG images | WebP/AVIF with `<picture>` element | ~60% less bandwidth |
| 6.3 | Add API compression | Update | Uncompressed JSON | gzip/brotli middleware | ~70% less payload |
| 6.4 | Add database indexes | Update | Missing indexes | Add composite indexes | ~50% faster queries |
| 6.5 | Add service worker | Add | No offline support | Stale-while-revalidate caching | ~80% fewer repeat requests |
| 6.6 | Add `content-visibility: auto` | Update | All DOM rendered | Off-screen content deferred | ~30% faster initial paint |
| 6.7 | Add `loading="lazy"` to images | Update | Eager loading | Lazy loading below fold | ~50% fewer initial requests |
| 6.8 | Add `prefers-reduced-motion` | Update | Animations always run | Respect OS preference | ~15% GPU savings on opt-in |

### Allowed Deletions (Green Coding Exemptions)

| # | Deletion | Justification | Energy Savings |
|---|----------|---------------|----------------|
| D-1 | Remove `console.log` from production code | Debug logging wastes I/O cycles | ~2% fewer I/O operations |
| D-2 | Remove unused `import` statements | Unused imports may prevent tree-shaking | Enables better dead code elimination |
| D-3 | Remove duplicate utility functions | Consolidate into `src/shared/` | Smaller bundle size |
| D-4 | Remove unused CSS classes | Dead CSS adds parse time | ~5% faster stylesheet parsing |
| D-5 | Remove unused npm dependencies | Smaller `node_modules`, faster installs | ~20% faster CI/CD pipeline |

---

## 8. Change Tracking Requirements

Every change in this plan must be tracked:

1. **CHANGELOG.md** updated with every change
2. **DARE_LOG.md** updated for architectural decisions
3. **Git commits** follow format: `type(module): description`
   - `feat(cognitive): add mode detection hook`
   - `docs: create BLUEPRINT.md`
   - `perf(ui): add route-level code splitting`
   - `chore(infra): add CI/CD pipeline`
4. **PRs** required for all changes — no direct pushes to main
5. **HANDOFF.md** updated at end of every session

---

## Summary

| Phase | Week | Changes | Additions | Updates | Allowed Deletions |
|-------|------|---------|-----------|---------|------------------|
| Phase 1: Compliance | 1 | 13 | 13 | 0 | 0 |
| Phase 2: Foundation | 2 | 13 | 11 | 2 | 0 |
| Phase 3: Core Features | 3-5 | 33 | 33 | 0 | 0 |
| Phase 4: Theme + A11y | 5-6 | 14 | 14 | 0 | 0 |
| Phase 5: SEO | 6 | 8 | 7 | 1 | 0 |
| Phase 6: Optimization | 7 | 13 | 1 | 7 | 5 (green coding) |
| **TOTAL** | 7 weeks | **94** | **79** | **10** | **5** |

**Additions:** 79 (84%)  
**Updates:** 10 (11%)  
**Deletions:** 5 (5%) — all justified by green coding energy savings  
