# Testing Stack — what we use, what we paused, why

Per revvel-standards convention: every testing tool we evaluated gets a record
here — what it does, what we liked, what we didn't, and (if paused) the
replacement. Nothing is dropped — everything is recoverable in one edit.

---

## ✅ Active

### Keploy (GitHub App + Chrome extension + CLI)
**What it does**
- **Keploy GitHub App** (`https://github.com/apps/keploy`) — auto-generates **validated unit + API tests** in PRs.
- **Keploy API Test Recorder** (Chrome extension) — captures real API traffic from a browser session and converts it into API tests via Keploy.
- **Keploy Navigator** (separate GitHub bot) — broader test-automation companion. Optional; install if you want continuous coverage beyond per-PR generation.
- **Keploy CLI** (`keploy record` / `keploy test`) — local capture + replay of real traffic; useful when you want to author tests outside the browser.

**Feature inventory — exploit these where they fit**
- Unit test generation in PRs (Java, Go, Node, Python).
- API test generation from recorded HTTP traffic (no manual stub-writing).
- Mocked dependency calls in replay (no need to spin up real backends in CI).
- Mutation testing on generated tests (catches false-confidence coverage).
- Diff-based test impact (only run affected tests on a PR — faster CI).
- Code coverage reporting integrated with the generator.
- Dashboard at app.keploy.io for run history (optional; primary value is in-repo tests).

**Pricing (free → paid tiers — verify at keploy.io/pricing before relying on numbers)**
- **Free** — covers low-volume repos: limited test generations/month and a cap on concurrent runs. Sufficient for a single dev / small product cluster.
- **Pro/Team** — per-seat monthly tier (estimated **$20–$40/seat/mo** range as of 2026; treat as estimate until verified). Lifts the generation cap + adds team features.
- **Enterprise** — custom; SSO, audit logs, SOC2, dedicated support. Custom quote.

> **Verify before sharing as policy.** Keploy adjusts tiers frequently. The
> `docs/API_LIMIT_AUTO_UPGRADE.md` decision standard governs *when* an upgrade
> auto-fires vs requires research, regardless of current price.

**What we like**
- Tests land **in the repo**, visible to the pipeline + agents + code review (unlike Mabl, where tests lived in a cloud dashboard).
- No paid key for the basic tier — real value before you ever pay.
- The Chrome extension closes the loop between a browser session and committed test code — record once, replay in CI forever.
- Pairs naturally with the **Completeness Gate** (`docs/DEFINITION_OF_DONE.md`): a deliverable that ships with auto-generated tests is more credibly "done."

**What we don't (caveats)**
- Doesn't replace true browser **E2E** (multi-page user journeys, visual regression). For those, add **Playwright** per app.
- AI-generated tests still need a human/agent skim — bad input → bad tests. Treat them as a *floor*, not a ceiling.
- Free-tier rate limits are real — see auto-upgrade decision standard.

**How to use the Chrome extension**
1. Install from the Chrome Web Store: *Keploy API Test Recorder*.
2. Open the deployed app you want to capture (e.g. the lead-engine Vercel preview).
3. Click record, exercise the flow (capture leads, dedupe, etc.).
4. Export the capture → Keploy turns it into API tests committed via PR.

**Error-handling + auto-upgrade on rate limit**
When a Keploy run fails with a rate-limit / quota-exceeded error, the standard in
`docs/API_LIMIT_AUTO_UPGRADE.md` decides what happens (auto-upgrade vs research-
first). This is a general standard — applies to any SaaS we hit a limit on.

### WCAG_PR_Checker — `eco-github-extensions.yml`
Runs on every PR; uses Playwright + axe-core to scan the deployed Vercel preview for a11y violations (alt text, contrast, ARIA). See workflow file for details.

### SEO + A11y Guard — `scripts/seo-a11y-guard.js` + `seo-a11y-guard.yml`
Source-level scanner that fails a PR for missing alt, junk image filenames, or pages missing a meta description. Pre-merge, before WCAG_PR_Checker runs.

### ImgBot (GitHub App)
Opens a follow-up PR after images are committed, with compressed versions. Saves bytes; no manual config.

---

## ⏸ Paused (kept commented, restorable in one edit)

### Mabl — `mabl.yml` (PAUSED 2026-05-27)
**Why paused:** test plans lived in the Mabl dashboard (not in this repo) so the pipeline + agents couldn't see them; required a paid `MABL_API_KEY` that kept going missing → Sentinel spam; in practice it no-op'd silently most of the time.

**Replaced by:** Keploy (above).

**Full evaluation:** see the header of `.github/workflows/mabl.yml`. To re-enable: uncomment the `push:` / `pull_request:` blocks in `mabl.yml`, set `MABL_API_KEY`, and configure plans in the Mabl dashboard. Companion comment-outs in `secrets-health-check.yml`, `secret-persistence-guard.yml`, and `credential-gatekeeper.yml` also need to be uncommented.

---

## 📋 Recommended additions (when needed)

- **Playwright in-app** — for real browser E2E (login flows, multi-step user journeys). Add per-app rather than a paid cloud runner. No standing license cost.
- **Lighthouse CI** — performance + Core Web Vitals budgets on the deployed preview. Pairs with SEO standards (`docs/SEO_STANDARDS.md`).

Add these only when a specific product needs them — don't pre-install paid tools.

---

## 🔍 Evaluated alternatives (and why we said yes / no)

Per the standards convention, every tool we considered gets a record. Cost
decisions follow `docs/API_LIMIT_AUTO_UPGRADE.md`.

| Tool | What it does | Verdict | Why |
| --- | --- | --- | --- |
| **Test.ai** | AI-driven cross-platform test automation | ❌ **Skip — redundant** | Overlaps Keploy's AI test generation. Adding it = two AI testers competing for the same job. Re-evaluate only if Keploy can't keep up. |
| **BrowserStack** | Cloud cross-browser device farm | ⏸ **Defer — expensive** | ~$29/seat/mo starting tier. Genuine value only if we ship multiple browser-critical apps. Today's Next.js products work in modern evergreen browsers. Add when a real cross-browser requirement appears. |
| **Jenkins** | Self-hosted CI/CD | ❌ **Skip — redundant** | We already have GitHub Actions (free for public, generous for private). Jenkins adds ops burden (a server to maintain) for nothing we don't already have. |
| **Cypress** | E2E browser testing | ✅ **Add per-app when E2E is needed** | Free for OSS, excellent DX, what most teams reach for. Don't install repo-wide; add `cypress/` per product app that needs E2E. See template below. |
| **Applitools** | Visual regression / AI-eye diff | ✅ **Add when visual fidelity matters** | Free tier = 100 checkpoints/mo (often enough for one product). Catches UI regressions Keploy can't see. Integrates with Cypress/Playwright. |
| **Postman** | Manual API exploration + collection sharing | ✅ **Install as dev tool, not pipeline-wired** | Free tier strong; great for poking APIs by hand, building collections to share, generating curl snippets. Keploy covers automated API testing; Postman covers the human side. |

### Pattern: which tool to reach for, by need

| Need | Reach for |
| --- | --- |
| Unit tests for a product's logic | **Keploy** (auto-generates in PRs) |
| API tests for a product's endpoints | **Keploy** (record traffic via Chrome extension or CLI, replay in CI) |
| Manual API exploration / shareable collections | **Postman** (dev's laptop, not CI) |
| End-to-end browser flows (login, multi-page) | **Cypress** per app |
| Pixel-level UI regression / visual diff | **Applitools** alongside Cypress |
| Cross-browser smoke tests | **BrowserStack** (only when needed; expensive) |
| Performance / Core Web Vitals | **Lighthouse CI** per app |
| A11y violations (deployed page) | **WCAG_PR_Checker** (already wired) |
| A11y violations (source code) | **SEO + A11y Guard** (already wired) |

### Per-app Cypress setup template
When a product genuinely needs E2E, add to the app:
```bash
npm i -D cypress @testing-library/cypress
npx cypress open   # interactive
npx cypress run    # CI
```
Then wire a per-app workflow that runs `npx cypress run` on PRs, against the
Vercel preview URL. Don't pre-install in revvel-standards itself.

---

## 🔐 Manus-style auto-credential management — roadmap

What we want (per owner): the pipeline can **generate a new API token from a
provider** (e.g., mint a fresh Jules key) **and automatically store it as a
GitHub secret** — no manual UI clicks. See **`docs/CREDENTIAL_AUTOMATION_ROADMAP.md`**
for the phased plan, what's already wired (the backup/restore half), and what's
missing (the auto-generate half).
