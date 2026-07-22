# Premolt — Site Restructure & Launch Plan

**Last Updated:** April 2026
**Status:** Proposed — awaiting 👍 from @midnghtsapphire before implementation
**Tracking issue:** "Review premolt.com and get the site up and running"
**Owner:** Audrey Evans (@midnghtsapphire)
**Implementing repo:** [`midnghtsapphire/premolt`](https://github.com/midnghtsapphire/premolt) (this doc lives in `revvel-standards` because Premolt is tracked as a Revvel project; per-project docs follow the `docs/<project>/` convention used by GrowlingEyes, Neurooz, Revvel Music Studio, and Universal SAR App.)

---

## 1. What Premolt is (consolidated from this repo)

Sources searched: `docs/REPO_CATALOG.md`, `docs/_MASTER_INVENTORY.md`, `docs/_MASTER_BOM.md`, `docs/Walter-Evans-GitHub-Repo-Inventory.md`, `inventory/ideas-found.md`, `docs/premolt/BOM.md`, `README.md`.

| Fact | Source |
|---|---|
| Tagline: **"AI Agent Security Sandbox and Identity Verification Platform."** | `docs/REPO_CATALOG.md:155` |
| Status in catalog: `Active`, `PUBLIC`, classified as `Library/Other` | `docs/REPO_CATALOG.md:155` |
| Listed as a "big bet" alongside Universal-SAR, Mechatronopolis, Captivator | `inventory/ideas-found.md:26` |
| Billing model: Stripe subscriptions — currently `Expired / Lapsed` | `docs/_MASTER_INVENTORY.md:72,368` |
| Domain: `premolt.com` (or similar) — currently `Expired / Lapsed`, ~$15/yr at Namecheap | `docs/_MASTER_INVENTORY.md:158` |
| Infrastructure today: shared DigitalOcean droplet (`164.90.148.7`) + shared managed MySQL + Resend + GitHub Actions | `docs/premolt/BOM.md` |
| Outstanding purchases: domain, Stripe re-activation, Apple Dev ($99/yr), Google Play ($25 one-time) | `docs/premolt/BOM.md` |

**What is missing from this repo and is required input from Audrey before build:**

1. Definitive product elevator pitch (≤ 30 words) and target user(s).
2. The 3–5 features that constitute v1 of premolt.com.
3. Brand assets (logo, palette, type, voice) — no `BRAND.md` exists yet.
4. Social-media chatter / customer language — the agent cannot reach Twitter/X, Reddit, Bluesky, Threads, LinkedIn from the sandbox; raw quotes or links must be supplied.

These four items block coding. They do **not** block this plan.

---

## 2. Refined problem statement

> Premolt has a stake in the catalog ("AI Agent Security Sandbox and Identity Verification Platform"), a lapsed Stripe account, and a lapsed domain — but no live marketing site, no per-project source-of-truth doc set in `revvel-standards`, and no concrete launch checklist. We need to (a) consolidate what is known about Premolt into the standard `docs/premolt/` shape used by every other Revvel project, (b) decide the minimum viable site (what premolt.com renders to a first-time visitor on launch day), and (c) drive that MVI to "shipped + live" against `premolt.com`.

This document delivers (a) and (b). (c) is gated on Audrey's 👍 of the MVI in §4.

---

## 3. Proposed restructure of `docs/premolt/`

Bring Premolt up to parity with sibling projects. Net new files:

```text
docs/premolt/
├── README.md          # ← NEW — index of all premolt docs (mirrors growlingeyes/)
├── BOM.md             # exists — keep; refresh when Stripe/domain/Apple/Google purchases are made
├── PLAN.md            # ← THIS FILE
├── BRAND.md           # ← NEW (deferred; needs Audrey's brand inputs — see §1.3)
└── SPRINT_LOG.md      # ← NEW (created on first sprint; deferred)
```

Out of scope in *this* PR: `BRAND.md` and `SPRINT_LOG.md` — both require Audrey's input before they are useful. They are listed here so the next agent picks them up correctly.

---

## 4. MVI Contract — premolt.com v1

Following `skills/mvi-contract/SKILL.md`. **No coding permitted in `midnghtsapphire/premolt` until all 7 sections are accepted.** Open questions are tagged `[NEEDS AUDREY]`.

### Section 1 — Context Check
- Previous session completed: domain and Stripe lapsed; only `docs/premolt/BOM.md` exists in standards.
- Current production state: **nothing is live.** `premolt.com` does not resolve.
- Known bugs relevant to this MVI: none (greenfield).
- `SHIP_STATUS.md` last updated: 2026-04-26 — Premolt not currently tracked there. Add row when MVI is approved.

### Section 2 — Feature Definition
**Feature:** A first-time visitor to `https://premolt.com` sees a single-page marketing site that explains what Premolt is, captures their email for the waitlist, and confirms via Resend.

**User story:** As a prospective Premolt customer, I can land on premolt.com, understand in <10 seconds what the product does, and join the waitlist with my email, so that I am notified when the AI Agent Security Sandbox opens.

### Section 3 — Dependency Map
| Item | Status | Owner |
|---|---|---|
| Domain `premolt.com` registered + DNS pointed at DO droplet `164.90.148.7` | ❌ blocked on purchase ($15/yr Namecheap) | @midnghtsapphire |
| Resend domain verification for `premolt.com` | ❌ blocked on domain | agent |
| Waitlist table on shared managed MySQL (`premolt_waitlist(id, email, created_at, source, ip_hash)`) | ❌ not created | agent |
| TLS via Caddy/Let's Encrypt on droplet | ❌ not configured for premolt.com | agent |
| Env vars: `RESEND_API_KEY`, `DATABASE_URL`, `WAITLIST_TABLE` | ❌ to provision via vault-agent skill | agent |
| Repo: `midnghtsapphire/premolt` scaffolded with site code | ❌ to scaffold | agent |
| Other features that must be complete first: none | | |

### Section 4 — Acceptance Gates
- [ ] Site source is in `midnghtsapphire/premolt` and follows `revvel-standards` repo template (AGENTS.md symlinks, pre-commit, CI).
- [ ] CI passes on `main` (lint + type-check + unit tests for the email-capture endpoint).
- [ ] One Playwright E2E test: load `/`, submit valid email, see success state, confirm row in `premolt_waitlist` and a Resend confirmation send.
- [ ] Site deployed to droplet behind TLS at `https://premolt.com`.
- [ ] Live verification: `curl -I https://premolt.com` returns `200`; submitting `audrey+test@…` produces a real confirmation email and a row in the table.
- [ ] Lighthouse: Performance ≥ 90, Accessibility ≥ 95, SEO ≥ 90 (mobile, throttled).
- [ ] `skills/seo-metadata/SKILL.md` applied: title, description, OG image, canonical, robots.txt, sitemap.xml.
- [ ] `skills/accessibility/SKILL.md` applied: WCAG 2.1 AA on the form.
- [ ] `docs/premolt/BOM.md` updated: domain, Stripe (still pending), Resend → ✅ live.
- [ ] `SHIP_STATUS.md` updated: Premolt waitlist row → `shipped`.

### Section 5 — Out of Scope (explicitly deferred)
- Stripe checkout / paid plans.
- Authenticated dashboard, account creation, the actual sandbox/verification product.
- iOS / Android apps (Apple + Google developer accounts deferred per BOM).
- Blog, docs site, marketing CMS.
- Multi-page navigation. v1 is **one page**.
- Analytics beyond a privacy-respecting pageview counter (Plausible/Umami) — pick in the implementation PR, do not load Google Analytics.

### Section 6 — Files to Touch
**This PR (planning, in `revvel-standards`):**
- New: `docs/premolt/PLAN.md` — this file.
- New: `docs/premolt/README.md` — directory index.
- Modified: `README.md` — add PLAN link to the Premolt row in the Project Tracking table.

**Implementation PR (in `midnghtsapphire/premolt`, blocked on 👍):**
- New: `package.json`, `tsconfig.json`, `next.config.ts` (or Astro — `[NEEDS AUDREY]`: Next vs Astro for a static-leaning marketing page; recommend **Astro** for Lighthouse ≥ 95 with near-zero JS).
- New: `src/pages/index.astro` — hero, value prop, waitlist form.
- New: `src/pages/api/waitlist.ts` — POST handler: validate email, insert row, fire Resend confirmation.
- New: `tests/waitlist.test.ts` — unit; `tests/e2e/waitlist.spec.ts` — Playwright.
- New: `Caddyfile` or droplet nginx snippet for `premolt.com`.
- New: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`.
- New: `AGENTS.md` symlink chain per `revvel-standards` template.
- New: migration `0001_create_premolt_waitlist.sql`.

### Section 7 — Rollback Plan
- Revert deploy workflow → previous commit (site goes back to "coming soon" placeholder or 502 — acceptable for an unlaunched product).
- DNS A-record stays pointed at droplet; if the droplet is unhealthy, swap A-record to a static "we'll be right back" page on DigitalOcean Spaces.
- Drop `premolt_waitlist` rows only on Audrey's explicit instruction; emails are user data.

---

## 5. Standards to apply

Loaded from `skills/REGISTRY.md` and `docs/AGENTS.md`:

| Skill | Why it applies to this MVI |
|---|---|
| `skills/mvi-contract/` | This whole document. |
| `skills/system-state/` | Update `SHIP_STATUS.md` when shipped. |
| `skills/security/` | Email-capture endpoint must rate-limit, validate, and not log raw IPs (hash before storing). |
| `skills/vault-agent/` | `RESEND_API_KEY`, `DATABASE_URL` provisioned via vault, never committed. |
| `skills/accessibility/` | WCAG 2.1 AA on the form — required gate. |
| `skills/seo-metadata/` | Public marketing page — required gate. |
| `skills/error-reporting/` | Wire Sentry (or chosen alt) on the API route. |
| `skills/deployment/` | Droplet deploy workflow follows the standard template. |
| `skills/testing/` | One unit + one E2E, no more, before MVI ships. |

---

## 6. Inputs the agent cannot gather alone

The issue asks for "review chatter on social media." The sandboxed coding agent has no access to social platforms. **Audrey: please drop any of the following you have time for into a comment on this issue or a sibling file in `docs/premolt/`** — none of these block the plan, but each will sharpen the v1 hero copy:

1. 3–5 representative quotes from prospective customers (Twitter/X, Reddit, LinkedIn, Discord) about AI agent security or identity verification pain.
2. Names of 1–3 closest competitors and their hero one-liner.
3. Preferred vibe (technical-formal, dev-tool casual, enterprise serious, etc.).
4. Logo + 1 brand color, or permission for the agent to draft a placeholder mark.

---

## 7. Decision request

This plan changes only documentation in `revvel-standards`. **Per the issue's own instructions ("Wait for Audrey's 👍 before implementing, unless the change is clearly trivial"), implementation in `midnghtsapphire/premolt` is gated on a 👍 reaction or comment on the PR/issue from @midnghtsapphire.**

When approved, the next agent should:
1. Open the implementation PR in `midnghtsapphire/premolt` against §4 / §6 above.
2. Coordinate with Audrey on the §3 dependency purchases (domain, Resend, Stripe re-activation may be deferred to v2).
3. Update `docs/premolt/BOM.md` and `SHIP_STATUS.md` on ship.
