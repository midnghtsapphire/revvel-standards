# WR: [WR] Fleet maintenance — midnghtsapphire/neuro-adaptive-app

**Issue:** #16829
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Research Date:** 2026-08-08
**Researcher:** Copilot (GitHub)
**WR Status:** ✅ Complete

---

## Issue Context

**Target repository:** `midnghtsapphire/neuro-adaptive-app`

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
- [x] Implement the agreed improvements as a **draft PR** on the target repo.

<!-- fleet-maintenance:midnghtsapphire/neuro-adaptive-app -->

## Implementation

**PR opened on target:** https://github.com/midnghtsapphire/neuro-adaptive-app/pull/1

Branch: `fleet-maintenance/revvel-standards-update`

### Files added / updated on neuro-adaptive-app

| File | Purpose |
| --- | --- |
| `app/data/tracker.ts` | Pure domain logic (XP, streaks, energy match, suggestions) |
| `app/page.tsx` | Interactive ADHD-friendly tracker UI |
| `app/layout.tsx` / `app/globals.css` | App shell + styles |
| `tests/tracker.test.ts` | Unit tests for domain logic |
| `package.json` / lockfile | Next.js 16.3.0, React 19 — **0 npm audit vulns** |
| `.github/workflows/ci.yml` | Typecheck + tests + build |
| `.github/workflows/ai-pr-review-openrouter.yml` | OpenRouter AI PR review (advisory) |
| `.github/workflows/codeql.yml` | CodeQL — `actions` + `javascript-typescript` |
| `.github/workflows/semgrep.yml` | Semgrep SAST — secrets, OWASP, CWE, TypeScript |
| `.github/workflows/jules-pr-reviewer.yml` | Jules PR reviewer — design and correctness |
| `.github/dependabot.yml` | Weekly npm + github-actions updates |
| `CONTRIBUTING.md` | Contributor guide — branches, jury, secrets, kill switch |
| `OVERVIEW.md` | Product pillars, stack, monetization, research |
| `README.md` | Scripts, test matrix, live deployment section |
| `CHANGELOG.md` | 0.2.0 release notes |

## Repository Metadata

| Property | Value |
| --- | --- |
| Description | Gamified neurodivergent life tracking app with ADHD-friendly features |
| Stars | 0 (private) |
| Default branch | main |
| Prior state | Docs-only skeleton (README, LICENSE, CHANGELOG, AGENTS, docs/) |

## Research Findings

### 1. Repository Overview

Before this sweep, `neuro-adaptive-app` was a documentation skeleton with no
application code, no `package.json`, and no GitHub Actions workflows. Product
intent: gamified neurodivergent / ADHD-friendly life tracking.

### 2. Gap Analysis — What Was Missing Before This PR

| Gap | Severity | Remediation |
| --- | --- | --- |
| No application code / UI | Critical | Shipped Next.js tracker with energy-aware board |
| No tests | High | `tests/tracker.test.ts` covering XP, streaks, grace, suggestions |
| No CodeQL workflow | High | Added `codeql.yml` (`actions` + `javascript-typescript`) |
| No Semgrep SAST | High | Added `semgrep.yml` with secrets + security-audit ERROR gate |
| No OpenRouter AI review | Medium | Added `ai-pr-review-openrouter.yml` |
| No Jules review | Medium | Added `jules-pr-reviewer.yml` |
| No CI | High | Added `ci.yml` (typecheck, test, build) |
| No CONTRIBUTING.md / OVERVIEW.md | Low-medium | Added both |
| Thin README | Low | Refreshed with scripts, test matrix, live deployment |

### 3. Competitive / market notes (citations)

| Product | Traction signal | Gap we fill |
| --- | --- | --- |
| Habitica | Large consumer RPG habit base | Heavier UX; less energy-aware routing |
| Tiimo | Strong visual planning for ND users | Less gamified XP / streak grace |
| Finch | Self-care pet gamification | Less task-energy matching |
| Structured | Calendar-first day planning | Not XP/streak oriented |

Positioning based on public product pages as of 2026-08 (**estimate** — not paid market-share data).

### SEO / marketing keywords

- ADHD life tracker
- neurodivergent productivity
- energy-aware tasks
- body doubling timer
- gamified habit streak grace

### Monetization path

1. Freemium core board → premium themes / body-double rooms / multi-device sync
2. B2B white-label ADHD-friendly standup boards
3. Polar.sh / GitHub sponsors for research notes under `docs/`

### 4. Security notes

- Client-only tracker — no backend secrets required for core loop
- `npm audit` clean at ship (`next@16.3.0`)
- Semgrep + CodeQL jury wired for ongoing PRs

## Verification

```bash
cd /tmp/neuro-adaptive-app   # or clone the PR branch
npm ci
npm run check
npm run build
npm audit   # 0 vulnerabilities
```

## Acceptance (host contract)

- [x] tests: domain unit tests pass
- [x] workflows: standard review jury present on target
- [x] scaffolding: complete working UI + logic (no TODO stubs)
- [x] conventional-commits: `chore(fleet): …` PR title
