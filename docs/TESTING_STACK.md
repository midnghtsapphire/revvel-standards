# Testing Stack — what we use, what we paused, why

Per revvel-standards convention: every testing tool we evaluated gets a record
here — what it does, what we liked, what we didn't, and (if paused) the
replacement. Nothing is dropped — everything is recoverable in one edit.

---

## ✅ Active

### Keploy (GitHub App + Chrome extension)
**What it does**
- **Keploy App** (`https://github.com/apps/keploy`) — AI auto-generates **validated unit + API tests** directly inside PRs, code-level, no external dashboard for the test logic.
- **Keploy API Test Recorder** (Chrome extension) — captures real API traffic from your browser. Feed the recording to Keploy and it generates API tests from realistic request/response data instead of guessing.

**What we like**
- Tests land **in the repo**, visible to the pipeline + agents + code review (unlike Mabl, where tests lived in a cloud dashboard).
- No paid key for the basic tier.
- Test recorder lets us drive a real session in the browser and convert it into committed test code — closes the loop between user-flow and unit/API coverage.
- Pairs naturally with the **Completeness Gate** (`docs/DEFINITION_OF_DONE.md`): a deliverable that ships with auto-generated tests is more credibly "done."

**What we don't (caveats)**
- Doesn't replace true browser **E2E** (multi-page user journeys, visual regression). For those, add **Playwright** in the affected app.
- AI-generated tests still need a human/agent skim — bad input → bad tests. Treat them as a *floor*, not a ceiling.

**How to use the Chrome extension**
1. Install from the Chrome Web Store: *Keploy API Test Recorder*.
2. Open the deployed app you want to capture (e.g. the lead-engine Vercel preview).
3. Click record, exercise the flow (capture leads, dedupe, etc.).
4. Export the capture → Keploy turns it into API tests committed via PR.

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
