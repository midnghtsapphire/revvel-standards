# Self-Healing BOM Template

**Version:** 1.0.0  
**Date:** April 14, 2026  
**Template For:** Every Revvel Project  
**Usage:** Copy this file to `docs/<project-name>/BOM.md` and fill in all sections during Phase 0 (Inception).

> **How to use:** Replace all `[PLACEHOLDER]` values. Run the Self-Healing Checklist at the bottom at every phase transition and after every production incident.

---

## Bill of Materials — [PROJECT NAME]

**Last Updated:** [DATE]  
**Phase:** [Phase 0: Inception | Phase 1: Planning | Phase 2: Development | Phase 3: Testing | Phase 4: Deployment | Phase 5: Maintenance]  
**Status:** [Planned | Active | Stable | Deprecated]  
**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Stack Declaration

> Lock this in during Phase 0. Do not change without updating this BOM and running the Self-Healing Checklist.

| Layer | Technology | License | Notes |
|---|---|---|---|
| Frontend | [e.g. Next.js 15, React 19, Tailwind CSS] | MIT | |
| Backend | [e.g. Express, Hono, tRPC] | MIT | |
| Database | [e.g. MySQL / Drizzle ORM] | MIT | |
| Auth | [e.g. Clerk / Google OAuth / Better Auth] | | |
| Payments | [e.g. Stripe] | | |
| Email | [e.g. Resend] | | |
| Hosting | [e.g. DigitalOcean Droplet / Vercel] | | |
| CI/CD | GitHub Actions | MIT | |
| Testing | [e.g. Vitest + Playwright + RTL] | MIT | |
| Error Monitoring | [e.g. GlitchTip / Sentry] | | |
| Analytics | [e.g. PostHog / Plausible] | | |

---

## 2. Infrastructure Already Covered by Revvel Stack

> Items here cost nothing extra — already provisioned at the account level.

| Service | Provider | Cost | Notes |
|---|---|---|---|
| Hosting | DigitalOcean Droplet (shared) | $0 (shared) | Shared `164.90.148.7` — PM2 process: `[project-slug]` |
| Database | DigitalOcean Managed MySQL (shared) | $0 (shared) | DB: `[project-slug]_prod` |
| Email delivery | Resend | $0 (free tier) | Free tier: 3,000 emails/mo |
| CI/CD | GitHub Actions | $0 | |
| DNS | Namecheap | [Already purchased / Needed] | `[domain.com]` |

---

## 3. APIs Required

> Every API this project calls. Provision all keys in Vault before Phase 2 begins.

| API | Provider | Vault Path | Free Tier | Monthly Cost | Priority | Status |
|---|---|---|---|---|---|---|
| [e.g. Anthropic Claude] | Anthropic | `/revvel/[project]/llm/anthropic` | No | ~$20–100 | P0 | ❌ Not Provisioned |
| [e.g. Google Maps] | Google | `/revvel/[project]/maps/google` | $200 credit | ~$0–50 | P0 | ❌ Not Provisioned |
| [e.g. Firebase FCM] | Google | `/revvel/[project]/notifications/firebase` | Yes | $0 | P0 | ❌ Not Provisioned |
| [e.g. Stripe] | Stripe | `/revvel/[project]/payments/stripe-secret` | N/A (transaction %) | Transaction % | P0 | ❌ Not Provisioned |

---

## 4. Purchases Needed

> Items that require spending money. Use priority levels from the Universal BOM Standard.

| Item | Purpose | Provider | Est. Cost | Priority | Status | Purchased Date |
|---|---|---|---|---|---|---|
| Domain registration | Public URL | Namecheap | ~$15/yr | P1 | ❌ Not purchased | — |
| Apple Developer Program | iOS App Store | Apple | $99/year | P2 | ❌ Not purchased | — |
| Google Play Developer | Android Store | Google | $25 one-time | P2 | ❌ Not purchased | — |
| [Add others...] | | | | | | |

---

## 5. Testing Infrastructure

> Testing tools active for this project. Reference `TESTING_STANDARD.md` for setup.

| Category | Tool | Config File | Status |
|---|---|---|---|
| Unit / Integration | Vitest | `vitest.config.ts` | [✅ Configured / ❌ Needed] |
| E2E | Playwright | `playwright.config.ts` | [✅ Configured / ❌ Needed] |
| Component | React Testing Library | (via Vitest) | [✅ Configured / ❌ Needed] |
| API Mocking | MSW | `tests/mocks/` | [✅ Configured / ❌ Needed] |
| Error Monitoring | GlitchTip / Sentry | `.env`: `SENTRY_DSN` | [✅ Configured / ❌ Needed] |
| Uptime Monitoring | UptimeRobot | External | [✅ Configured / ❌ Needed] |
| Performance | Lighthouse CI | `.lighthouserc.json` | [✅ Configured / ❌ Needed] |
| Accessibility | @axe-core/playwright | (via Playwright tests) | [✅ Configured / ❌ Needed] |
| Secret Scanning | Gitleaks | `.gitleaks.toml` | [✅ Configured / ❌ Needed] |

---

## 6. Agent & Skill Testing

> For any project that includes skills or agents. Reference `skills/testing-agent/SKILL.md`.

| Skill / Agent | Test Method | Test File | Last Tested | Status |
|---|---|---|---|---|
| [e.g. vault-agent] | PromptFoo | `tests/skills/vault-agent.yml` | [DATE] | [✅ Pass / ❌ Fail / ⚠️ Skipped] |
| [Add others...] | | | | |

---

## 7. Monthly Cost Summary

| Category | Provider | Monthly Cost | Notes |
|---|---|---|---|
| Hosting (shared pro-rated) | DigitalOcean | ~$5/mo | |
| Database (shared pro-rated) | DigitalOcean | Included | |
| Email | Resend | $0 | Free tier |
| Error monitoring | GlitchTip | $0 | Self-hosted |
| Analytics | PostHog | $0 | Free tier |
| [API 1] | [Provider] | ~$X/mo | |
| [API 2] | [Provider] | ~$X/mo | |
| **Total Fixed Monthly** | | **~$X/mo** | |
| **Variable (payments)** | Stripe | Transaction % | |

---

## 8. One-Time Purchases Summary

| Item | Cost | Status |
|---|---|---|
| Domain registration | ~$15/yr | [✅ Purchased / ❌ Not purchased] |
| Apple Developer Program | $99/yr | [✅ Purchased / ❌ Not purchased] |
| Google Play Developer | $25 | [✅ Purchased / ❌ Not purchased] |

---

## 9. What Was Removed / Decided Against

> Document every technology or service evaluated and rejected. This prevents re-evaluating the same options.

| Item | Reason Removed | Date | Phase | Alternative Used |
|---|---|---|---|---|
| [e.g. PlanetScale] | Removed free tier; too expensive | April 2026 | Phase 0 | DigitalOcean MySQL |
| [Add others...] | | | | |

---

## 10. Future Evaluations (Backlog)

> Items to research when P0–P1 work is complete.

| Item | Category | Why | Priority | Target Phase |
|---|---|---|---|---|
| [e.g. Turso edge SQLite] | Database | Reduce latency for mobile | P3 | Phase 5 |
| [Add others...] | | | | |

---

---

## Self-Healing BOM Checklist

> Run this checklist at **every phase transition** and after every production incident. The coding agent runs this automatically; owners should review the output.

## Instructions

Answer each question. For each "❌ No" or "⚠️ Partial":
1. Identify the gap
2. Assign a priority (P0–P4)
3. Open a GitHub Issue with label `bom-purchase` or `enhancement` + `copilot`
4. Update this BOM's sections 3–10 accordingly

---

## Phase Transition Checklist

### 🔍 Phase 0 → 1: Inception to Planning

- [ ] Stack fully declared in Section 1?
- [ ] All required APIs identified in Section 3?
- [ ] No API keys hardcoded anywhere in the repo?
- [ ] Domain name decision made?
- [ ] Testing infrastructure plan documented in Section 5?
- [ ] Error monitoring tool selected?

### 📐 Phase 1 → 2: Planning to Development

- [ ] All P0 API keys provisioned in Vault?
- [ ] `vitest.config.ts` created and coverage thresholds set?
- [ ] `playwright.config.ts` created?
- [ ] MSW handlers set up in `tests/mocks/`?
- [ ] Gitleaks pre-commit hook installed?
- [ ] CI pipeline includes: lint → test → coverage check → build?
- [ ] Any stack changes from Phase 0 reflected in Section 1?

### 🔨 Phase 2 → 3: Development to Testing

- [ ] Coverage meets minimums (statements ≥ 80%, branches ≥ 75%, functions ≥ 80%)?
- [ ] All mandatory E2E journeys have Playwright tests (see `TESTING_STANDARD.md` Section 3.3)?
- [ ] axe-core accessibility tests passing in Playwright?
- [ ] Lighthouse CI scores passing (Performance ≥ 90, A11y ≥ 95, SEO ≥ 95)?
- [ ] All agents/skills tested via PromptFoo (Section 6)?
- [ ] Any unused dependencies removed from `package.json`?
- [ ] Knip run to find unused exports?
- [ ] Sections 3 and 4 updated to reflect current state?

### 🚀 Phase 3 → 4: Testing to Deployment

- [ ] Domain registered and DNS configured?
- [ ] SSL certificate active (via Cloudflare or Let's Encrypt)?
- [ ] Error monitoring (GlitchTip/Sentry) DSN configured and receiving events?
- [ ] Uptime monitor configured in UptimeRobot?
- [ ] Healthcheck endpoint live at `/api/health`?
- [ ] Environment variables confirmed in DigitalOcean App Platform / PM2 ecosystem?
- [ ] All P0 and P1 purchases completed or clearly justified as deferred?
- [ ] Stripe in live mode (not test mode)?
- [ ] Rate limiting configured on all public API routes?
- [ ] `npm audit` clean (no critical vulnerabilities)?

### 🔧 Phase 4 → 5: Deployment to Maintenance

- [ ] Error monitoring alerting on new error spikes?
- [ ] Uptime alert sent to Slack/email on downtime?
- [ ] Renovate or Dependabot enabled for automated dependency updates?
- [ ] Section 7 (monthly costs) updated with actual costs?
- [ ] Section 9 (removed items) updated with any cleanup done post-launch?
- [ ] Any tech debt items added to Section 10 (backlog)?
- [ ] Lighthouse score still passing in production?

### 🔄 Phase 5: Maintenance → Continuous Improvement

Run monthly or after any production incident:

- [ ] Review Section 4 (purchases) — anything now needed that was deferred?
- [ ] Review Section 3 (APIs) — any API that had incidents or outages to replace?
- [ ] Check `docs/Universal-BOM_List/TOOLING_AND_TESTING_BOM.md` for new tools in each category
- [ ] Check `docs/Universal-BOM_List/API_REGISTRY_BOM.md` for new APIs or cost changes
- [ ] Run `npm audit` — any new vulnerabilities?
- [ ] Review `package.json` — any packages not updated in 6+ months?
- [ ] Is test coverage still above thresholds?
- [ ] Any new Lighthouse regressions?
- [ ] Any P3/P4 research items ready to promote based on product direction?
- [ ] Update `**Last Updated:**` at the top of this file

---

## What to Remove vs Keep — Decision Framework

When something is flagged for potential removal, use this matrix:

| Scenario | Action |
|---|---|
| Service used by < 1% of features and has a free FOSS alternative | Remove; add FOSS alternative |
| API with recurring cost, no active users | Cancel; document in Section 9 |
| Test that never fails and tests trivial code | Consider removing and relying on TypeScript types |
| Dependency with no npm downloads in 6 months | Evaluate replacement or fork |
| Tool added in Section 10 (backlog) for > 2 phases | Promote or permanently remove |
| Framework with breaking changes in major version | Schedule upgrade sprint |

---

*Self-Healing BOM Template v1.0.0 — Revvel Standards. Copy to every new project. Last updated: April 14, 2026.*
