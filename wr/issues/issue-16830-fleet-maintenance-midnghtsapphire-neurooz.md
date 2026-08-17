# WR: [WR] Fleet maintenance — midnghtsapphire/neurooz

**Issue:** #16830
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Target:** [midnghtsapphire/neurooz](https://github.com/midnghtsapphire/neurooz)
**Research Date:** 2026-08-08
**Researcher:** Copilot Coding Agent
**WR Status:** ✅ Complete

---

## Issue Context

Filed automatically by the fleet-maintenance sweep so this repo flows through
the revvel-standards pipeline (research-engine → coder → full review jury).

## Tasks

- [x] Update / refresh the docs (README, overview, contributing).
- [x] Research concrete improvements (deps, security, tests, DX, performance).
- [x] Ensure the target repo has the standard review workflows (OpenRouter code
      review, Jules, Semgrep, CodeQL) so the PR gets the full jury; add them if missing.
- [x] Implement the agreed improvements as a **draft PR** on the target repo.

<!-- fleet-maintenance:midnghtsapphire/neurooz -->

## Implementation

**PR opened:** https://github.com/midnghtsapphire/neurooz/pull/25

Branch: `fleet-maintenance/revvel-standards-16830`

### Files added/changed on neurooz

| File | Purpose |
| --- | --- |
| `.github/workflows/ai-pr-review-openrouter.yml` | OpenRouter AI PR review (advisory, `maxlim0/AI-PR-Reviewer@v0.3`) |
| `.github/workflows/codeql.yml` | CodeQL — `actions` + `javascript-typescript` |
| `.github/workflows/semgrep.yml` | Semgrep SAST — secrets, OWASP, CWE, TypeScript |
| `.github/workflows/jules-pr-reviewer.yml` | Jules PR reviewer — design and correctness |
| `.github/dependabot.yml` | Weekly npm + GitHub Actions updates |
| `CONTRIBUTING.md` | Branch conventions, PR flow, secrets table, kill-switch |
| `OVERVIEW.md` | Product pillars, stack, monetization path |
| `README.md` | Removed Lovable boilerplate; scripts + Test matrix |
| `src/utils/__tests__/impulseDetection.test.ts` | 15 unit tests for Financial Guardian impulse scoring |
| `package.json` / lockfile | `vite@6`, `react-router-dom@7` — `npm audit` → 0 vulns |
| `CHANGELOG.md`, `SHIP_STATUS.md` | NZ-109 completion record |

## Research Findings

### Repository overview

**neurooz** is an ADHD-specific productivity and financial guardian platform powered by the Oz Engine™ (Vite, TypeScript, React, shadcn-ui, Tailwind, Supabase).

### Gap analysis (pre-PR)

| Gap | Severity | Remediation |
| --- | --- | --- |
| No CodeQL workflow | High | Added `codeql.yml` |
| No Semgrep SAST | High | Added `semgrep.yml` |
| No OpenRouter AI review | Medium | Added `ai-pr-review-openrouter.yml` |
| No Jules review | Medium | Added `jules-pr-reviewer.yml` |
| No CONTRIBUTING.md | Low-medium | Added |
| README still Lovable boilerplate | Medium | Rewrote |
| No impulseDetection unit tests | Medium | Added 15 tests |
| 18 npm audit findings | High | Cleared to 0 |

### Marketing / SEO keywords

- ADHD productivity app
- ADHD financial management / impulse spending help
- AI ADHD tools / cognitive mode adaptation

### Monetization path

Freemium SaaS (Stripe Starter/Pro/Business/Enterprise) + ADHD-adjacent affiliates (therapy, budgeting). Aligns with prime directive $10k/mo → $10M/3yr.

### Citations

- Target PR: https://github.com/midnghtsapphire/neurooz/pull/25
- Prior simulated WR (did not land on target): `wr/issues/issue-15777-fleet-maintenance-midnghtsapphire-neurooz.md`
- Review workflow templates: `midnghtsapphire/revvel-standards/.github/workflows/`
