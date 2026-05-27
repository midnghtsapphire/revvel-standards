# Tooling & Testing BOM — Universal Revvel Standards

**Version:** 1.0.0  
**Date:** April 14, 2026  
**Status:** Living Document  
**Scope:** All Revvel Projects  

> This document catalogues every testing, quality, monitoring, security, and auto-healing tool available to the Revvel ecosystem. Items are organized by category, with FOSS availability, free tiers, paid plans, and priority clearly marked. Use this as a shopping list and decision log.

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ FOSS | Fully open-source / free to self-host |
| 🆓 Free Tier | Has a free plan (usage-limited) |
| 💰 Paid | Paid only or free tier is insufficient |
| 🟢 In Use | Currently active in Revvel stack |
| 🔵 Recommended | Recommended — not yet adopted |
| 🟡 Evaluate | Worth evaluating for a specific need |
| 🔴 Research | Needs research before decision |
| 🗑️ Skip | Not a fit for Revvel's current stack |

---

## 1. Unit & Integration Testing

**Current Standard:** Vitest + Supertest (see `TESTING_STANDARD.md`)

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **Vitest** | MIT ✅ FOSS | ✅ Free | $0 | P0 | 🟢 In Use | Native ESM, Vite-powered, blazing fast. Standard for all Revvel apps |
| **Jest** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Legacy fallback; prefer Vitest for new projects |
| **Mocha** | MIT ✅ FOSS | ✅ Free | $0 | P3 | 🟡 Evaluate | Good for Node-only projects; Vitest preferred |
| **Supertest** | MIT ✅ FOSS | ✅ Free | $0 | P0 | 🟢 In Use | HTTP integration testing for Express/Hono APIs |
| **node:test** | Node.js built-in ✅ | ✅ Free | $0 | P3 | 🟡 Evaluate | Node.js 22+ built-in test runner; no dependencies |

---

## 2. End-to-End (E2E) Testing

**Current Standard:** Playwright (see `TESTING_STANDARD.md`)

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **Playwright** | Apache 2.0 ✅ FOSS | ✅ Free | $0 | P0 | 🟢 In Use | Microsoft; cross-browser; built-in trace viewer. Standard for all Revvel apps |
| **Playwright Test (Cloud)** | Proprietary | 🆓 Free Tier | $0–$499/mo | P2 | 🔵 Recommended | Microsoft Playwright Service — parallel cloud runs; free tier available |
| **Cypress** | MIT (runner) / Proprietary (cloud) | 🆓 Free Tier | $0 / $67+/mo | P2 | 🟡 Evaluate | Excellent DX; cloud dashboard free for public repos; slower than Playwright |
| **Cypress Cloud** | Proprietary | 🆓 Free Tier | Free (public repos) / $67+/mo | P2 | 🟡 Evaluate | Parallel runs, video recording, flake detection |
| **WebdriverIO** | MIT ✅ FOSS | ✅ Free | $0 | P3 | 🟡 Evaluate | Good for mobile/native app testing via Appium |
| **Puppeteer** | Apache 2.0 ✅ FOSS | ✅ Free | $0 | P3 | 🗑️ Skip | Chrome-only; Playwright supersedes for all new projects |
| **Nightwatch.js** | MIT ✅ FOSS | ✅ Free | $0 | P4 | 🔴 Research | Alternative E2E; Playwright preferred |

---

## 3. Component Testing (React/UI)

**Current Standard:** Vitest + React Testing Library (see `TESTING_STANDARD.md`)

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **React Testing Library** | MIT ✅ FOSS | ✅ Free | $0 | P0 | 🟢 In Use | Accessibility-first component tests. Standard for all Revvel React apps |
| **Storybook** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Component development & visual testing in isolation; pairs with Chromatic |
| **Chromatic** | Proprietary | 🆓 Free Tier | Free (5k snapshots/mo) / $149+/mo | P2 | 🟡 Evaluate | Visual regression testing via Storybook; catches UI changes automatically |
| **Percy** | Proprietary | 🆓 Free Tier | Free (5k snapshots/mo) / $599+/mo | P2 | 🟡 Evaluate | Visual regression testing; integrates with many test runners |
| **Loki** | MIT ✅ FOSS | ✅ Free | $0 | P3 | 🟡 Evaluate | FOSS visual regression testing with Storybook; self-hosted |

---

## 4. API Testing

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **Postman** | Proprietary | 🆓 Free Tier | Free (basic) / $14+/user/mo | P1 | 🔵 Recommended | Industry standard; automated collection runs via Newman; free plan generous |
| **Newman** | Apache 2.0 ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | CLI runner for Postman collections; use in CI |
| **Insomnia** | Apache 2.0 ✅ FOSS | ✅ Free | $0 / $16+/user/mo (cloud) | P2 | 🟡 Evaluate | FOSS alternative to Postman; local-first |
| **Hoppscotch** | MIT ✅ FOSS | ✅ Free | $0 (self-hosted) / $12+/user/mo | P2 | 🟡 Evaluate | Web-based, self-hostable Postman alternative; excellent FOSS choice |
| **REST Client (VS Code)** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | `.http` files in repo; runs directly in VS Code; zero overhead |
| **Dredd** | MIT ✅ FOSS | ✅ Free | $0 | P2 | 🟡 Evaluate | API contract testing against OpenAPI specs |
| **Schemathesis** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Automated property-based API testing from OpenAPI schemas; catches edge cases |

---

## 5. Contract Testing

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **Pact** | MIT ✅ FOSS | ✅ Free | $0 (self-hosted) | P1 | 🔵 Recommended | Consumer-driven contract testing; standard for multi-service apps. Cited in TESTING_STANDARD |
| **Pact Broker** | MIT ✅ FOSS | ✅ Free | $0 (self-hosted) / $559+/mo (hosted) | P2 | 🟡 Evaluate | Central storage for Pact contracts; self-host on DigitalOcean droplet |
| **PactFlow** | Proprietary | 🆓 Free Tier | Free (1 team) / $559+/mo | P2 | 🟡 Evaluate | Hosted Pact Broker with SmartTesting; free plan for open-source |

---

## 6. Error Monitoring & Alerting

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **Sentry** | Fair Source (FOSS self-host) | 🆓 Free Tier | Free (5k errors/mo) / $26+/mo | P0 | 🔴 Research | Industry standard error tracking; self-hostable via Docker; **Revvel needs this now** |
| **Highlight.io** | Apache 2.0 ✅ FOSS | 🆓 Free Tier | Free (500 sessions/mo) / $50+/mo | P1 | 🔵 Recommended | FOSS Sentry alternative with session replay; excellent for UI debugging |
| **GlitchTip** | MIT ✅ FOSS | ✅ Free | $0 (self-hosted) / $9+/mo | P1 | 🔵 Recommended | FOSS Sentry-compatible drop-in replacement; self-host on DigitalOcean |
| **Rollbar** | Proprietary | 🆓 Free Tier | Free (5k items/mo) / $12+/mo | P2 | 🟡 Evaluate | Error monitoring with deploy tracking |
| **Bugsnag** | Proprietary | 🆓 Free Tier | Free (7.5k events/mo) / $59+/mo | P2 | 🟡 Evaluate | Production error monitoring |
| **LogRocket** | Proprietary | 🆓 Free Tier | Free (1k sessions/mo) / $99+/mo | P2 | 🟡 Evaluate | Session replay + error monitoring; strong UI bug catching |
| **Axiom** | Proprietary | 🆓 Free Tier | Free (500 GB/mo ingest free) / $25+/mo | P1 | 🔵 Recommended | Log management + query; generous free tier; GitHub Actions native integration |

---

## 7. Code Quality & Static Analysis

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **ESLint** | MIT ✅ FOSS | ✅ Free | $0 | P0 | 🟢 In Use | JavaScript/TypeScript linting. Already in Revvel stack |
| **Biome** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Rust-powered all-in-one linter + formatter; 50–100× faster than ESLint; replaces Prettier |
| **TypeScript** | Apache 2.0 ✅ FOSS | ✅ Free | $0 | P0 | 🟢 In Use | Static type checking |
| **SonarQube Community** | LGPL ✅ FOSS | ✅ Free | $0 (self-hosted) | P1 | 🔵 Recommended | Deep static analysis; FOSS community edition; self-host on droplet |
| **SonarCloud** | Proprietary | 🆓 Free Tier | Free (public repos) / $10+/mo | P1 | 🔵 Recommended | Hosted SonarQube; free for open-source; CI integration |
| **CodeClimate Quality** | Proprietary | 🆓 Free Tier | Free (public repos) / $16+/mo | P2 | 🟡 Evaluate | Automated code review + maintainability scores |
| **DeepSource** | Proprietary | 🆓 Free Tier | Free (public repos + 1 private) / $17+/mo | P2 | 🟡 Evaluate | Automated code review; catches bugs, anti-patterns, coverage gaps |
| **Knip** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Finds unused exports, dependencies, and files in TypeScript projects |
| **ts-prune** | MIT ✅ FOSS | ✅ Free | $0 | P2 | 🟡 Evaluate | Finds unused exports; simpler than Knip for small projects |

---

## 8. Security Testing & Scanning

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **CodeQL** | MIT ✅ FOSS | ✅ Free | $0 (GitHub Actions) | P0 | 🟢 In Use | GitHub's semantic code analysis; free on all repos |
| **Dependabot** | Proprietary (GitHub) | ✅ Free | $0 | P0 | 🔵 Recommended | Auto-creates PRs to update vulnerable dependencies; enable in every repo |
| **Snyk** | Proprietary | 🆓 Free Tier | Free (200 tests/mo) / $25+/mo | P1 | 🔵 Recommended | Dependency vulnerability scanning + fix PRs; better signal than Dependabot alone |
| **Trivy** | Apache 2.0 ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Container + filesystem + IaC vulnerability scanner; excellent for Docker images |
| **OWASP ZAP** | Apache 2.0 ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | DAST (dynamic app security testing); scan running apps for OWASP Top 10 |
| **Gitleaks** | MIT ✅ FOSS | ✅ Free | $0 | P0 | 🔵 Recommended | Scans git history for leaked secrets/API keys; run as pre-commit hook |
| **TruffleHog** | AGPL ✅ FOSS | ✅ Free | $0 | P1 | 🟡 Evaluate | Deep secret scanning with entropy detection; excellent in CI |
| **detect-secrets** | Apache 2.0 ✅ FOSS | ✅ Free | $0 | P2 | 🟡 Evaluate | Python-based secret scanning; good for polyglot repos |
| **npm audit** | Built-in | ✅ Free | $0 | P0 | 🟢 In Use | Built into npm; run in every CI pipeline |
| **Socket** | Proprietary | 🆓 Free Tier | Free (public repos) / $10+/mo | P1 | 🔵 Recommended | Detects malicious/compromised npm packages (supply-chain attacks) |

---

## 9. Performance Testing & Load Testing

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **Lighthouse CI** | Apache 2.0 ✅ FOSS | ✅ Free | $0 | P0 | 🟢 In Use | Performance budgets as CI gates. Standard for all Revvel web apps |
| **k6** | AGPL ✅ FOSS | ✅ Free | $0 (self-run) | P1 | 🔵 Recommended | Modern load testing tool; JavaScript API; excellent for API and WebSocket testing |
| **k6 Cloud** | Proprietary | 🆓 Free Tier | Free (50 tests/mo) / $49+/mo | P2 | 🟡 Evaluate | Cloud-hosted k6 runs; distributed load testing |
| **Artillery** | MPL 2.0 ✅ FOSS | ✅ Free | $0 | P1 | 🟡 Evaluate | YAML/JS load testing; good for HTTP and WebSocket; easier than k6 for some |
| **Locust** | MIT ✅ FOSS | ✅ Free | $0 | P2 | 🟡 Evaluate | Python-based load testing; excellent web UI; good for non-JS shops |
| **JMeter** | Apache 2.0 ✅ FOSS | ✅ Free | $0 | P3 | 🗑️ Skip | Java-based; heavy; k6/Artillery preferred |
| **WebPageTest** | BSD ✅ FOSS | 🆓 Free Tier | Free (hosted) / $15+/mo (API) | P2 | 🟡 Evaluate | Deep performance analysis; filmstrip view; Core Web Vitals |
| **Clinic.js** | MIT ✅ FOSS | ✅ Free | $0 | P2 | 🟡 Evaluate | Node.js performance profiling; finds CPU/memory bottlenecks |

---

## 10. Monitoring, Observability & APM

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **Prometheus** | Apache 2.0 ✅ FOSS | ✅ Free | $0 (self-hosted) | P1 | 🔵 Recommended | Metrics collection and alerting; standard with Grafana |
| **Grafana** | AGPL ✅ FOSS | 🆓 Free Tier | Free (self-hosted) / $0 (Grafana Cloud free tier) | P1 | 🔵 Recommended | Dashboards and visualization; pairs with Prometheus; Grafana Cloud free tier is generous |
| **OpenTelemetry** | Apache 2.0 ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Vendor-neutral observability standard; instrument once, ship to any backend |
| **Jaeger** | Apache 2.0 ✅ FOSS | ✅ Free | $0 (self-hosted) | P2 | 🟡 Evaluate | Distributed tracing; self-host; use with OpenTelemetry |
| **New Relic** | Proprietary | 🆓 Free Tier | Free (100 GB/mo ingest) / pay per GB | P2 | 🟡 Evaluate | Full-stack APM; generous free tier; good for smaller Revvel apps |
| **Datadog** | Proprietary | 💰 Paid | $15+/host/mo | P3 | 🟡 Evaluate | Gold standard APM; expensive; evaluate when revenue supports it |
| **Better Stack** | Proprietary | 🆓 Free Tier | Free (10 monitors) / $24+/mo | P1 | 🔵 Recommended | Uptime monitoring + on-call alerting + log management; very competitive free tier |
| **UptimeRobot** | Proprietary | 🆓 Free Tier | Free (50 monitors, 5 min intervals) / $7+/mo | P0 | 🔵 Recommended | Simple uptime monitoring; free tier covers all Revvel apps today |
| **Healthchecks.io** | BSD ✅ FOSS | 🆓 Free Tier | Free (20 checks) / $20+/mo (hosted) / Free (self-hosted) | P1 | 🔵 Recommended | Cron job monitoring; ping-based dead-man's switch; **critical for Revvel agents** |

---

## 11. Accessibility Testing

**Current Standard:** Lighthouse CI (covers basic a11y), target score ≥ 95 (see `TESTING_STANDARD.md`)

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **axe-core** | MPL 2.0 ✅ FOSS | ✅ Free | $0 | P0 | 🔵 Recommended | Industry standard a11y engine; integrates with Vitest, Playwright, browser extension |
| **@axe-core/playwright** | MPL 2.0 ✅ FOSS | ✅ Free | $0 | P0 | 🔵 Recommended | Run axe checks inside Playwright E2E tests; catches issues Lighthouse misses |
| **Pa11y** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | CLI a11y testing; runs against URLs; good for CI pipelines |
| **Pa11y CI** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Pa11y in CI; threshold-based pass/fail |
| **WAVE** | Proprietary (browser tool) | 🆓 Free Tier | Free (browser ext) / API paid | P2 | 🟡 Evaluate | Browser-based a11y checker; use during development |
| **Deque axe DevTools** | Proprietary | 🆓 Free Tier | Free (browser ext) / $36+/user/mo | P2 | 🟡 Evaluate | Pro version of axe with more rules and guided remediation |
| **Stark** | Proprietary | 🆓 Free Tier | Free (Figma plugin) / $60+/user/yr | P3 | 🟡 Evaluate | Design-time accessibility checks in Figma |

---

## 12. Visual Regression Testing

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **Playwright Screenshots** | Apache 2.0 ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Built-in visual comparison in Playwright; no extra service needed for basic use |
| **reg-suit** | MIT ✅ FOSS | ✅ Free | $0 (self-hosted with S3/GCS) | P2 | 🟡 Evaluate | FOSS visual regression; stores baseline images in cloud storage |
| **Chromatic** | Proprietary | 🆓 Free Tier | Free (5k snapshots/mo) / $149+/mo | P2 | 🟡 Evaluate | Storybook-native visual testing; CI integration |
| **Percy** | Proprietary | 🆓 Free Tier | Free (5k snapshots/mo) / $599+/mo | P3 | 🟡 Evaluate | Broad test runner integration; expensive at scale |
| **Lost Pixel** | MIT ✅ FOSS | ✅ Free | $0 | P2 | 🔵 Recommended | FOSS visual regression; works with Storybook, Next.js, more; GitHub Actions native |

---

## 13. Database Testing

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **better-sqlite3** (in-memory) | MIT ✅ FOSS | ✅ Free | $0 | P0 | 🟢 In Use | In-memory SQLite for fast integration tests; cited in `TESTING_STANDARD.md` |
| **Testcontainers** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Spin up real MySQL/Postgres in Docker for integration tests; disposable and reproducible |
| **PGlite** | Apache 2.0 ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | In-process Postgres via WASM; no Docker needed; ideal for unit tests against Drizzle |
| **db-migrate** | MIT ✅ FOSS | ✅ Free | $0 | P2 | 🟡 Evaluate | Database migration testing; validate migration scripts in CI |

---

## 14. Mutation Testing

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **Stryker Mutator** | Apache 2.0 ✅ FOSS | ✅ Free | $0 | P2 | 🔵 Recommended | JavaScript/TypeScript mutation testing; validates that your tests actually catch bugs |
| **Stryker Dashboard** | Proprietary | 🆓 Free Tier | Free (public repos) | P3 | 🟡 Evaluate | Hosted mutation score tracking |

---

## 15. Snapshot & Documentation Testing

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **TypeDoc** | Apache 2.0 ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Auto-generate API docs from TypeScript types and JSDoc; critical for Revvel standards |
| **Compodoc** | MIT ✅ FOSS | ✅ Free | $0 | P2 | 🟡 Evaluate | Documentation generator for Angular; not applicable for React |
| **doctest-ts** | MIT ✅ FOSS | ✅ Free | $0 | P3 | 🟡 Evaluate | Doctests in TypeScript comments |

---

## 16. CI/CD Infrastructure

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **GitHub Actions** | Proprietary (GitHub) | 🆓 Free Tier | Free (2,000 min/mo public / 2,000 min private) | P0 | 🟢 In Use | Standard Revvel CI/CD platform |
| **act** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Run GitHub Actions locally via Docker; critical for debugging workflows without pushing |
| **nektos/act** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Same as above — the GitHub CLI extension for local Actions |
| **Turborepo** | MIT ✅ FOSS | ✅ Free | $0 | P2 | 🟡 Evaluate | Monorepo build system; intelligent caching; evaluate if Revvel moves to monorepo |
| **Nx** | MIT ✅ FOSS | 🆓 Free Tier | Free (OSS) / $15+/user/mo (Nx Cloud) | P2 | 🟡 Evaluate | Monorepo tooling with affected-graph-based testing |
| **Earthly** | MPL 2.0 ✅ FOSS | 🆓 Free Tier | Free (self-run) / $50+/mo (cloud) | P2 | 🟡 Evaluate | Reproducible builds; Docker-native; works with GitHub Actions |

---

## 17. Self-Healing & Auto-Recovery Tools

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **Ralph Loop** (Revvel internal) | Internal | ✅ Free | $0 | P0 | 🟢 In Use | Revvel's own CI self-healing loop; see `AGENT_FACTORY_STANDARD.md` |
| **GitHub Copilot Autofix** | Proprietary | 🆓 Free Tier | Included with Copilot ($10+/mo) | P0 | 🔵 Recommended | Automatically suggests fixes for CodeQL findings |
| **Renovate** | MIT ✅ FOSS | ✅ Free | $0 | P0 | 🔵 Recommended | Automated dependency updates; more configurable than Dependabot; creates grouped PRs |
| **Mend Renovate** | Proprietary | 🆓 Free Tier | Free (open-source) / $free for GitHub App | P0 | 🔵 Recommended | Hosted Renovate — no self-hosting required; free GitHub App |
| **Restyled** | Proprietary | 🆓 Free Tier | Free (public repos) / $19+/mo | P2 | 🟡 Evaluate | Auto-formats code in PRs; reduces formatting noise |
| **Semantic Release** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Automated versioning and changelog generation from conventional commits |
| **Release Please** | Apache 2.0 ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Google's semantic versioning tool; creates release PRs automatically |

---

## 18. Agent & Skill Testing (Revvel-Specific)

> This section addresses the need for **temporary testing agents especially for skills** mentioned in the issue.

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **Skill test harness** (Revvel internal) | Internal | ✅ Free | $0 | P0 | 🔴 Research | Needs to be built — see `skills/testing-agent/SKILL.md` for spec |
| **LangChain evaluators** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Evaluate LLM outputs for correctness, relevance, and hallucination |
| **PromptFoo** | MIT ✅ FOSS | 🆓 Free Tier | Free (self-run) / $free hosted | P0 | 🔵 Recommended | **Critical** — test LLM prompts and agent behaviors systematically; red-team your agents |
| **RAGAS** | Apache 2.0 ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | RAG pipeline evaluation metrics; for Revvel's RAG-based skills |
| **DeepEval** | Apache 2.0 ✅ FOSS | 🆓 Free Tier | Free (self-run) / $free hosted | P1 | 🔵 Recommended | LLM evaluation framework; hallucination detection, answer relevancy |
| **AgentBench** | MIT ✅ FOSS | ✅ Free | $0 | P2 | 🟡 Evaluate | Benchmarking agents on tasks; good for regression testing agent improvements |
| **Burr** | Apache 2.0 ✅ FOSS | ✅ Free | $0 | P2 | 🟡 Evaluate | State machine for AI agents; built-in testing and debugging |
| **Agentlabs** | Apache 2.0 ✅ FOSS | 🆓 Free Tier | Free (self-host) | P3 | 🟡 Evaluate | Agent UI and testing platform |

---

## 19. Mock & Test Data Generation

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **MSW (Mock Service Worker)** | MIT ✅ FOSS | ✅ Free | $0 | P0 | 🟢 In Use | Network-level HTTP mocking. Standard for Revvel (see `TESTING_STANDARD.md`) |
| **Faker.js** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Generate realistic fake data for tests |
| **Factory.ts** | MIT ✅ FOSS | ✅ Free | $0 | P2 | 🟡 Evaluate | TypeScript-typed test object factories; pairs with Drizzle schema |
| **Nock** | MIT ✅ FOSS | ✅ Free | $0 | P2 | 🟡 Evaluate | HTTP mocking for Node.js; MSW preferred for new projects |
| **WireMock** | Apache 2.0 ✅ FOSS | ✅ Free | $0 (Java) | P3 | 🗑️ Skip | Java-based; MSW preferred |

---

## 20. Spell Check & Documentation Quality

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **cspell** | MIT ✅ FOSS | ✅ Free | $0 | P2 | 🔵 Recommended | Code-aware spell checker; runs in CI; catches typos in docs and code |
| **Vale** | MIT ✅ FOSS | ✅ Free | $0 | P2 | 🟡 Evaluate | Prose linter; enforces writing style for docs |
| **markdownlint** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Lint Markdown files; enforces consistent doc formatting in this repo |
| **link-check** | MIT ✅ FOSS | ✅ Free | $0 | P2 | 🔵 Recommended | Check for broken links in Markdown docs; critical for Revvel's extensive doc suite |

---

## Summary: Recommended Immediate Additions (P0 & P1)

These are the highest-priority tools **not yet in the Revvel stack** that should be added:

| # | Tool | Category | Cost | Why Now |
|---|---|---|---|---|
| 1 | **Sentry (self-hosted / GlitchTip)** | Error Monitoring | $0 | No production error tracking exists today — this is a critical gap |
| 2 | **UptimeRobot** | Uptime Monitoring | $0 | Ensure apps are detected as down immediately |
| 3 | **Gitleaks** | Secret Scanning | $0 | Prevent API keys from leaking into git history |
| 4 | **Renovate (Mend)** | Dependency Updates | $0 | Automated dependency updates across all repos |
| 5 | **PromptFoo** | Agent/Skill Testing | $0 | Test agent/skill outputs systematically before shipping |
| 6 | **axe-core/playwright** | Accessibility | $0 | Strengthen a11y testing beyond Lighthouse CI |
| 7 | **Dependabot** | Security | $0 | Enable on all repos if not already active |
| 8 | **Socket** | Supply Chain Security | $0 | Detect malicious npm packages |
| 9 | **markdownlint** | Doc Quality | $0 | Enforce consistent Markdown formatting |
| 10 | **Schemathesis** | API Testing | $0 | Auto-test API edge cases from OpenAPI specs |

---

*Last updated: April 14, 2026. Run `scripts/sync-bom.sh` after updating any project BOM.*
