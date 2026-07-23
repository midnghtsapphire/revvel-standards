# Neurooz — Codebase Analysis & Improvement Plan

**Date:** April 6, 2026  
**Author:** MIDNGHTSAPPHIRE / GlowStarLabs  
**App:** Neurooz — AI-Powered ADHD Productivity & Financial Guardian  
**Repo:** `midnghtsapphire/neurooz` (289MB, TypeScript, Active Development)  
**Principle:** Updates only — no deletions unless recursive coding or energy savings (green coding)  

---

## 1. Current State Analysis

### What Exists (from Blue Ocean Inventory)
Based on the revvel-standards repository inventory, Neurooz currently has:

- **Language:** TypeScript
- **Size:** 289MB (indicates substantial codebase with assets)
- **Status:** Fully implemented, active development
- **6 Open GitHub Issues**
- **Features Implemented:**
  - Cognitive load monitoring and adaptive UI
  - Multiple cognitive modes (Focus, Creative, Executive Function)
  - Cognitive growth dashboard with testing suite
  - Memory anchoring and pattern recognition tests
  - Financial guardian features for ADHD spending patterns
  - Oz Engine for cognitive accessibility

### What's Missing (from Compliance Checklist)
**85 of ~93 compliance items are gaps.** Key missing areas:

1. **No CI/CD pipeline** — manual deployment only
2. **No automated tests** — no Vitest, no Playwright
3. **No deployment documentation** — no HANDOFF.md, deploy.sh, or infra map entry
4. **No branch protection** — direct pushes to main possible
5. **No Schema.org SEO markup** — missing parent org linkage
6. **No privacy policy** — critical for health + financial data
7. **No accessibility modes beyond ADHD** — missing 6 of 7 required modes
8. **No authentication system** — no Clerk or JWT
9. **No billing system** — no Stripe subscriptions
10. **No affiliate/marketing engine** — no auto-linker, no email system
11. **Repository artifacts missing** — no BLUEPRINT, ROADMAP, CHANGELOG, LICENSE, etc.

---

## 2. Architecture Improvement Plan

### 2.1 Module Structure (Add — Do Not Delete Existing Code)

Refactor into a modular monolith structure. **Move existing files into modules without deleting any:**

```text
src/
├── modules/
│   ├── cognitive/          # Oz Engine — mode detection, tests, dashboard
│   │   ├── types/          # CognitiveMode, ModeDetectionResult
│   │   ├── engine/         # Rule-based detection, ML predictor (future)
│   │   ├── components/     # Dashboard, mode indicator, test UI
│   │   ├── hooks/          # useCognitiveMode, useModeHistory
│   │   └── tests/          # Unit + behavioral tests
│   │
│   ├── financial/          # Financial Guardian — Plaid, spending, alerts
│   │   ├── types/          # Transaction, ImpulseAlert, FinancialHealth
│   │   ├── services/       # PlaidService, ImpulseDetector, BillTracker
│   │   ├── components/     # TinManDashboard, SpendingChart, AlertCard
│   │   ├── hooks/          # useFinancialHealth, useImpulseAlerts
│   │   └── tests/
│   │
│   ├── productivity/       # Task management, Pomodoro, focus sessions
│   │   ├── types/          # Task, FocusSession, DailyPlan
│   │   ├── services/       # TaskManager, PomodoroEngine, ScarecrowAI
│   │   ├── components/     # TaskList, Pomodoro, YellowBrickRoad
│   │   ├── hooks/          # useTasks, useFocusSession
│   │   └── tests/
│   │
│   ├── auth/               # Authentication + billing
│   │   ├── services/       # ClerkProvider, StripeService, TokenTracker
│   │   ├── components/     # LoginForm, SubscriptionManager, UsageMeter
│   │   └── tests/
│   │
│   ├── accessibility/      # All 7 accessibility modes
│   │   ├── modes/          # WCAG, ADHD, Dyslexic, Neuro, ECO, BluLight, Menstrual
│   │   ├── components/     # ModeSwitcher, AccessibleWrapper
│   │   ├── hooks/          # useAccessibilityMode
│   │   └── tests/
│   │
│   └── marketing/          # SEO, affiliate, email, blog, FAQ
│       ├── seo/            # Schema.org, meta tags, sitemap
│       ├── affiliate/      # Auto-linker, campaign generator
│       ├── email/          # Subscriber system, newsletters
│       └── content/        # Blog, FAQ, About pages
│
├── shared/                 # Cross-module utilities
│   ├── ui/                 # Design system components (Urban Oz)
│   ├── api/                # tRPC router setup, API utilities
│   ├── db/                 # Drizzle schema, migrations
│   ├── config/             # Environment, feature flags
│   └── types/              # Shared TypeScript types
│
├── theme/                  # Urban Oz theme system
│   ├── urban/              # Default dark glassmorphism
│   ├── classic/            # Classic Oz theme (toggle)
│   └── tokens/             # Design tokens, CSS variables
│
└── app/                    # Next.js/React app shell
    ├── layout.tsx          # Root layout with Schema.org JSON-LD
    ├── page.tsx            # Emerald City dashboard
    └── ...routes
```

### 2.2 Database Schema Improvements (Add Tables — Do Not Delete Existing)

Add these tables via Drizzle ORM migrations:

```typescript
// New tables to ADD (existing tables remain unchanged)

// Cognitive mode tracking
export const cognitiveModeSessions = pgTable('cognitive_mode_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  mode: varchar('mode', { length: 50 }).notNull(), // focus, creative, executive, rest
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
  detectionMethod: varchar('detection_method', { length: 50 }), // rule, ml, manual
  confidence: decimal('confidence', { precision: 3, scale: 2 }),
});

// Financial transactions (from Plaid)
export const financialTransactions = pgTable('financial_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  plaidTransactionId: varchar('plaid_transaction_id', { length: 255 }),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  category: varchar('category', { length: 100 }),
  merchantName: varchar('merchant_name', { length: 255 }),
  date: date('date').notNull(),
  isImpulse: boolean('is_impulse').default(false),
  impulseScore: decimal('impulse_score', { precision: 3, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Impulse spending alerts
export const impulseAlerts = pgTable('impulse_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  transactionId: uuid('transaction_id').references(() => financialTransactions.id),
  alertType: varchar('alert_type', { length: 50 }), // warning, critical, pattern
  message: text('message'),
  dismissed: boolean('dismissed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tasks with cognitive mode tagging
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  priority: int('priority').default(3), // 1-5
  suggestedMode: varchar('suggested_mode', { length: 50 }),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  status: varchar('status', { length: 20 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Savings goals (Emerald City)
export const savingsGoals = pgTable('savings_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  targetAmount: decimal('target_amount', { precision: 12, scale: 2 }).notNull(),
  currentAmount: decimal('current_amount', { precision: 12, scale: 2 }).default('0'),
  targetDate: date('target_date'),
  ozMetaphor: varchar('oz_metaphor', { length: 100 }), // emerald_city, ruby_slippers, etc.
  createdAt: timestamp('created_at').defaultNow(),
});

// User accessibility preferences
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull().unique(),
  accessibilityMode: varchar('accessibility_mode', { length: 50 }).default('default'),
  theme: varchar('theme', { length: 50 }).default('urban_oz'),
  pomodoroFocusMinutes: int('pomodoro_focus_minutes').default(25),
  pomodoroBreakMinutes: int('pomodoro_break_minutes').default(5),
  ambientSound: varchar('ambient_sound', { length: 50 }),
  notificationChannel: varchar('notification_channel', { length: 50 }).default('push'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Email subscribers
export const emailSubscribers = pgTable('email_subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  confirmedAt: timestamp('confirmed_at'),
  source: varchar('source', { length: 50 }).default('neurooz'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 2.3 API Improvements (Add Routes — Do Not Remove Existing)

Add tRPC routers for each module:

```text
server/routers/
├── cognitive.ts      # Mode detection, mode history, cognitive tests
├── financial.ts      # Plaid link, transactions, impulse alerts, goals
├── productivity.ts   # Tasks CRUD, focus sessions, daily planning
├── auth.ts           # User profile, subscription status, token usage
├── accessibility.ts  # Preferences, mode switching
├── marketing.ts      # Blog posts, FAQ, subscribers, affiliate clicks
└── admin.ts          # Feature flags, UI config, user management
```

---

## 3. Performance Improvements (Green Coding)

These changes reduce energy consumption and improve performance:

| Improvement | Impact | Priority | Implementation |
|-------------|--------|----------|----------------|
| Lazy-load route modules | Reduce initial bundle by ~40% | High | `React.lazy()` + `Suspense` for each module |
| Image optimization | Reduce bandwidth by ~60% | High | WebP/AVIF with `<picture>` fallback, lazy loading |
| API response compression | Reduce payload size by ~70% | High | gzip/brotli middleware on Express/tRPC |
| Database query optimization | Reduce DB calls by ~30% | Medium | Add indexes, query batching, result caching |
| Reduce DOM repaints | Save CPU/battery | Medium | Use `will-change`, avoid layout thrash, virtualize lists |
| Tree-shake unused dependencies | Reduce bundle size | Medium | Audit with `npx depcheck`, remove unused imports |
| Service Worker caching | Reduce repeat load time by ~80% | Medium | Cache static assets, API responses (stale-while-revalidate) |
| Prefers-reduced-motion support | Save GPU/battery on mobile | High | Disable all animations when user preference set |
| Dark mode OLED optimization | Save battery on OLED screens | High | True black (#000) backgrounds in ECO mode |
| Request coalescing | Reduce API calls | Low | Batch concurrent requests to same endpoint |

---

## 4. Security Improvements

| Improvement | Priority | Implementation |
|-------------|----------|----------------|
| Add `helmet.js` for security headers | Critical | `app.use(helmet())` in Express setup |
| Implement CORS whitelist | Critical | Only allow production domain origins |
| Add rate limiting | Critical | `express-rate-limit` on all API routes |
| Encrypt Plaid tokens at rest | Critical | AES-256-GCM, key in env/Vault |
| Add Zod validation on all inputs | High | Validate all tRPC inputs with Zod schemas |
| Implement CSRF protection | High | `csurf` middleware or SameSite cookies |
| Add Content Security Policy | High | Strict CSP headers via helmet |
| Dependency vulnerability scan | High | `npm audit` in CI/CD pipeline |
| Secret scanning | High | Pre-commit hook to block secrets in code |
| Audit logging for financial actions | Medium | Log all Plaid/financial operations with timestamps |

---

## 5. Testing Improvements

| Area | Current | Target | Action |
|------|---------|--------|--------|
| Unit Test Coverage | 0% | 80%+ | Add Vitest, write tests for all modules |
| E2E Test Coverage | None | Critical paths | Add Playwright, test sign up → dashboard → task → financial |
| Behavioral Validation | None | 5+ scenarios | WoZ tests for ADHD-appropriate responses |
| "Bad Day" Tests | None | 3+ simulations | API failure, slow network, mid-task navigation |
| Performance Testing | None | Lighthouse 90+ | Automated Lighthouse CI check |
| Security Testing | None | OWASP Top 10 | Automated security scan in CI/CD |
| Accessibility Testing | None | WCAG AA/AAA | axe-core integration in Playwright tests |

---

## 6. Documentation Improvements

| Document | Status | Action |
|----------|--------|--------|
| README.md | Needs update | Add standard sections, infra table, badges |
| BLUEPRINT.md | Missing | Create with architecture diagrams |
| ROADMAP.md | Missing | Create 12-month plan |
| CHANGELOG.md | Missing | Create with full history |
| LICENSE | Missing | Add proprietary license |
| HANDOFF.md | Missing | Create with deployment details |
| INVESTORS_PACK.md | Missing | Create business case |
| Privacy Policy | Missing | Create for health + financial data |
| Terms of Service | Missing | Create with AI/wellness disclaimers |
| API Documentation | Missing | Auto-generate with TypeDoc/Swagger |
| .env.example | Missing | Create with all required vars |
| DEPLOYMENT.md | Missing | Create with full deploy instructions |

---

## 7. Prioritized Action Sequence

### Phase 1: Compliance (Week 1) — No Code Changes
1. Create all missing repository artifacts
2. Configure CI/CD pipeline
3. Enable branch protection
4. Add Schema.org JSON-LD
5. Create privacy policy

### Phase 2: Foundation (Week 2) — Structural Changes
1. Refactor into modular monolith structure (move files, don't delete)
2. Add Vitest + Playwright configurations
3. Add database schema migrations
4. Add `helmet.js`, CORS, rate limiting

### Phase 3: Core Features (Weeks 3-5) — Feature Development
1. Implement authentication (Clerk)
2. Implement Stripe subscriptions
3. Enhance Plaid integration with impulse detection
4. Build all 7 accessibility modes
5. Implement Urban Oz theme

### Phase 4: Growth Features (Week 6) — Marketing & SEO
1. Build blog + FAQ systems
2. Implement affiliate auto-linker
3. Build email subscriber system
4. Add About section pages

### Phase 5: Polish & Launch (Week 7) — Production Readiness
1. Full test suite (unit + E2E + security + performance)
2. Security audit
3. Performance audit (Lighthouse 90+)
4. Deploy to production
5. Update INFRASTRUCTURE_MAP.md

---

## 8. Metrics & Success Criteria

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Revvel Compliance Score | ~9% | 100% | Compliance checklist completion |
| Unit Test Coverage | 0% | 80%+ | Vitest coverage report |
| E2E Test Coverage | 0 tests | 20+ tests | Playwright test count |
| Lighthouse Performance | Unknown | 90+ | Lighthouse CI |
| Lighthouse Accessibility | Unknown | 95+ | Lighthouse CI |
| Bundle Size (gzipped) | Unknown | < 200KB initial | Bundle analyzer |
| API Response Time (p95) | Unknown | < 200ms | Server metrics |
| Uptime | Unknown | 99.5%+ | PM2 + external monitor |
| TypeScript Errors | Unknown | 0 | `npx tsc --noEmit` |
| Security Vulnerabilities | Unknown | 0 critical/high | `npm audit` + OWASP scan |
