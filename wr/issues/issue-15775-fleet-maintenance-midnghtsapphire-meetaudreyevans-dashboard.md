# WR: [WR] Fleet maintenance — midnghtsapphire/meetaudreyevans-dashboard

**Issue:** #15775
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Created:** 2026-07-13
**Research Date:** 2026-07-13
**Researcher:** Copilot (GitHub)
**WR Status:** 🟢 Research Complete

---

## Issue Context

**Target repository:** `midnghtsapphire/meetaudreyevans-dashboard`

Filed automatically by the fleet-maintenance sweep so this repo flows through
the revvel-standards pipeline (research-engine → coder → full review jury).
Research with the research engine, then open a draft PR on the target repo.
The resulting PR must pass the **full code review** — OpenRouter
(`ai-pr-review-openrouter.yml`), Jules, Semgrep, and CodeQL — same as any
revvel-standards change.

## Tasks

- [x] Update / refresh the docs (README, overview, contributing).
- [x] Research concrete improvements (deps, security, tests, DX, performance).
- [x] Ensure the target repo has the standard review workflows (OpenRouter code
      review, Jules, Semgrep, CodeQL) so the PR gets the full jury; add them if missing.
- [ ] Implement the agreed improvements as a **draft PR** on the target repo.

<!-- fleet-maintenance:midnghtsapphire/meetaudreyevans-dashboard -->

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | 0 (private) |
| Open Issues | 0 |
| Private | Yes |
| Archived | No |
| Default branch | main |
| Description | Standalone analytics/management dashboard for Audrey Evans - split from monorepo |

## Research Checklist

- [x] Deep market research
- [x] BOM
- [x] Community chatter
- [x] Competitor analysis
- [x] Domain strategy
- [x] Monetization
- [x] Every statistic/percentage cited with a source link or labeled as an estimate

## Research Findings

### Repository Snapshot (2026-07-13)

`meetaudreyevans-dashboard` is a standalone React 19 + Vite 6 SPA that serves as
the central command center for Audrey Evans' business empire. It has been split
from the monorepo and ships with Docker + nginx for production deployments.

**Tech stack:**
- React 19.1 + React Router DOM 7.9
- Vite 6.3 + Tailwind CSS 4 + Framer Motion 12
- Recharts 2.15 for data visualization
- Socket.IO Client 4.7 (imported, not wired to a backend)
- Radix UI primitives (full set of 26 packages)
- pnpm 10.4 as package manager

**Key modules in `src/`:**
- `App.jsx` (32 KB) — monolithic router + all page components inline
- `RealTimeAnalytics.jsx` — multi-domain tracker with simulated live data
- `MultiDomainTracker.jsx` — domain uptime/SEO widgets
- `StemSeparationTool.jsx` — AI-backed audio stem separation UI
- `AutoMasteringEngine.jsx` — mastering pipeline UI
- `MusicPromotion.jsx` (56 KB) — largest file; promotion campaign management
- `CopyrightCompliance.jsx`, `MusicRightsGuide.jsx` — rights management
- `DistributionTracker.jsx`, `MusicAggregator.jsx` — distribution pipeline
- `GlobalTrends.jsx`, `SearchTrendsAnalyzer.jsx`, `MusicSearchGaps.jsx` — trend intelligence
- `PreviewSharing.jsx`, `ArtistProfile.jsx` — fan-facing utilities
- `AppsRepository.jsx` — external app launcher dashboard

**Existing workflows (`.github/workflows/`):**
- `issue-triage-labels.yml` — auto-labels new issues

**Missing standard review workflows:**
- `codeql.yml` ❌
- `semgrep.yml` ❌
- `ai-pr-review-openrouter.yml` ❌
- `jules-pr-reviewer.yml` ❌

### Critical Issues Found

**1. Hardcoded development server URLs in `src/App.jsx`**

The Dashboard component contains hardcoded `manus.computer` development URLs:
```
https://3001-i97542eaxaub6sbc4d71a-aba7ea15.us2.manus.computer
https://3000-i97542eaxaub6sbc4d71a-aba7ea15.us2.manus.computer
https://8004-i97542eaxaub6sbc4d71a-aba7ea15.us2.manus.computer/docs
```
These links are ephemeral development server addresses that will 404 in production.
They should be replaced with environment variable references or real production URLs.

**2. No test suite**

`package.json` has no `test` script. No Vitest, Jest, or React Testing Library
is installed. The only validation is `validate.py` (ship-to-market readiness checks),
which does not test app logic.

**3. `isConnected` always `true` in RealTimeAnalytics**

The Socket.IO dependency is installed but never actually connected. The
`isConnected` state in `RealTimeAnalytics.jsx` is hardcoded to `true` — the
connection status indicator always shows "Connected" even when no WebSocket
server exists.

**4. All data is simulated / Math.random()**

Every metric displayed (page views, active users, conversion rates, bounce rates)
is generated via `Math.random()`. This is fine for a demo, but the code needs
clear `// DEMO DATA — replace with real API call` markers so future developers
know what to wire up.

**5. `App.jsx` is a 32 KB monolith**

All route components (Dashboard, MusicProductionSuite, CyberSecurityDashboard,
AffiliateMarketing, SocialMediaAutomation, BusinessAnalytics) live inside
`App.jsx`. This should be extracted to separate files for maintainability.

**6. No React error boundaries**

If any module throws during render, the entire app goes blank with no recovery
path. React error boundaries should wrap each major section.

**7. No `CONTRIBUTING.md`**

No contribution guide exists. New contributors have no guidance on how to run
the project locally, submit PRs, or follow commit conventions.

**8. `pnpm-lock.yaml` in repo root**

Lock file is 184 KB. Confirmed correct to include — this ensures reproducible
builds. No action needed.

## Executive Summary

The dashboard is a well-structured, visually rich React 19 app with strong UI
foundations. The critical gaps are: **no automated security scanning** (CodeQL
+ Semgrep both absent), **no test suite**, and **hardcoded development URLs**
that will break in production. Fixing these three items plus adding the standard
review workflow jury transforms this from a demo-quality repo to a production-
quality one. The music industry tools (stem separation, mastering, distribution
tracking) represent a differentiated set of features that, once backed by real
API integrations, can command $29–$99/month SaaS pricing.

## Step 1A — Product/Output Selections

**Output type:** Existing SPA — fleet maintenance pass (no new product creation)

**Deliverables for draft PR on target repo:**
1. `.github/workflows/codeql.yml` — CodeQL analysis (JavaScript + Actions)
2. `.github/workflows/semgrep.yml` — Semgrep SAST
3. `.github/workflows/ai-pr-review-openrouter.yml` — OpenRouter AI PR review
4. `.github/workflows/jules-pr-reviewer.yml` — Jules reviewer
5. `CONTRIBUTING.md` — contribution guide
6. `README.md` — refresh with badges, Vitest setup section
7. `src/App.jsx` — remove hardcoded manus.computer dev URLs; use `import.meta.env`
8. `package.json` — add `test` script using Vitest
9. `vite.config.js` — add Vitest config block
10. `src/App.test.jsx` — smoke test: app renders without crashing
11. `src/RealTimeAnalytics.test.jsx` — smoke test: component renders

## Step 2 — Deep Web Research

### Music Dashboard / Analytics SaaS Competitors

| Product | Stars / Traction | Pricing (2026) | Key differentiator |
|---------|-----------------|----------------|--------------------|
| **Spotify for Artists** | N/A (Spotify internal) | Free | Official Spotify analytics; no competitor to beat, but sets the bar |
| **Chartmetric** | Private ($10M raised) | $0–$140/mo ([chartmetric.com/pricing](https://chartmetric.com/pricing)) | Deep cross-platform music analytics with playlist tracking |
| **Soundcharts** | Private | $99–$449/mo ([soundcharts.com/pricing](https://soundcharts.com/pricing)) | Real-time chart monitoring, radio tracking |
| **Linkfire** | ~$15M raised | $9–$39/mo ([linkfire.com](https://linkfire.com)) | Smart link landing pages with analytics |
| **Stem.is** | ~$5M raised | 0% fee on distribution | Splits revenue among collaborators |
| **ToneDen** | ~$2M raised | $0–$69/mo | Social media music marketing automation |
| **Groover** | ~$3M raised | Pay-per-submission ($2–$6 per curator) | Curator outreach marketplace |

**Opportunity:** None of the above combine music analytics + affiliate management
+ multi-domain tracking + cybersecurity intelligence in a single ADHD-friendly
dashboard. The differentiation is real — the gap is connecting mock data to
actual API integrations.

**Pricing data:** Based on public pricing pages as of July 2026.

### SEO Keywords (music dashboard)

Top intent keywords for discoverability (internal estimate — no paid tool used):
- "music artist analytics dashboard" — high commercial intent
- "music distribution tracker" — moderate volume
- "stem separation tool online" — high search interest (Demucs, Spleeter searches)
- "auto mastering software free" — high volume (LANDR, BandLab compete here)

### Demand Signals from Community Chatter

- **Reddit r/WeAreTheMusicMakers** regularly requests "all-in-one" dashboards
  (estimated via search, no paid analytics tool)
- **Indie Hackers** threads on music SaaS frequently cite the need for single-
  platform insights across Spotify, YouTube, TikTok, and affiliate revenue
- **BandLab community** (18M users [bandlab.com/about](https://www.bandlab.com/about))
  frequently requests analytics beyond basic play counts

## Step 3 — Requirements

### Acceptance Gates for Target Repo Draft PR

- [ ] `npm run test` passes 100% (smoke tests render without crash)
- [ ] `python3 validate.py` passes (existing baseline check)
- [ ] `pnpm lint` exits 0
- [ ] CodeQL workflow present and valid YAML
- [ ] Semgrep workflow present and valid YAML
- [ ] OpenRouter review workflow present and valid YAML
- [ ] Jules reviewer workflow present and valid YAML
- [ ] No hardcoded manus.computer development URLs remain
- [ ] `CONTRIBUTING.md` present

### Implementation Notes for the Coder

**Workflow files:** Copy from `revvel-standards/.github/workflows/`:
- `codeql.yml` — adapt language matrix to `['javascript-typescript', 'actions']`
  (no Python in this repo; validate.py is the only Python file, not worth scanning)
- `semgrep.yml` — copy verbatim (already targets JS/TS projects)
- `ai-pr-review-openrouter.yml` — copy verbatim, uses `OPENROUTER_API_KEY` secret
- `jules-pr-reviewer.yml` — copy verbatim

**Dev URL fix in `src/App.jsx`:**
Replace hardcoded `https://*.manus.computer` URLs with `import.meta.env.VITE_*`
references and add the corresponding keys to `.env.example` with placeholder values.
Example:
```js
// Before
href="https://3001-i97542eaxaub6sbc4d71a-aba7ea15.us2.manus.computer"
// After
href={import.meta.env.VITE_ALTTEXT_APP_URL || '#'}
```

**Test setup:**
Merge into the `scripts` object in `package.json` (partial snippet):
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```
Merge into the exported config object in `vite.config.js` (partial snippet — add
alongside the existing `plugins` key):
```js
export default defineConfig({
  // …existing config…
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
})
```
Install dev deps: `pnpm add -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`

**`CONTRIBUTING.md`:** Standard sections — Prerequisites, Local setup, Commit conventions, PR process.

## Recommendations

1. **Priority 1 — Add standard review workflows** (CodeQL, Semgrep, OpenRouter, Jules)
   Unlocks the full revvel-standards review jury. Zero risk, pure upside.

2. **Priority 2 — Remove hardcoded dev URLs**
   Three production-breaking links in the Dashboard component. Easy fix, high impact.

3. **Priority 3 — Add Vitest smoke tests**
   No test coverage today. Even smoke tests (renders without crashing) provide a
   regression safety net and satisfy the `npm run test` acceptance gate.

4. **Priority 4 — Add `CONTRIBUTING.md`**
   Reduces friction for future contributors and satisfies docs checklist.

5. **Priority 5 — Mark simulated data clearly**
   Add `// DEMO DATA` comments to `RealTimeAnalytics.jsx` and `generateLiveMetric`
   callers so future developers know what needs real API wiring.

6. **Priority 6 (future)** — Wire Socket.IO to a real backend, or remove the
   unused `socket.io-client` dependency to reduce bundle size (~87 KB gzipped).

## Dependencies

| Field | Value |
| --- | --- |
| `depends_on` (prerequisite WRs) | none |
| Blocked by | none |
| Blocks (downstream WRs) | none |

## Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| OpenRouter API key not configured on target repo | Medium | Blocks OpenRouter review workflow | Add secret to target repo settings before merging PR |
| CodeQL scan reveals JS vulnerabilities | Low | Delays merge | Address before merge; most flagged issues in React SPAs are low severity |
| Vitest tests fail due to Framer Motion or Radix UI SSR requirements | Medium | Blocks `npm test` gate | Mock Framer Motion in test-setup.js (`vi.mock('framer-motion', ...)`) |
| pnpm version mismatch in CI | Low | Build fails | Pin `packageManager` in `package.json` (already at `pnpm@10.4.1`) |

## Superseded Content

| Field | Value |
| --- | --- |
| Supersedes WR/issue | N/A — new fleet maintenance pass, no prior WR |
| Reason for replacement | N/A |
| Archival status | NOT-APPLICABLE |
