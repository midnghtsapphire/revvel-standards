# WR: [WR] Fleet maintenance — midnghtsapphire/no-kill-shelter-business

**Issue:** #16831  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Target repository:** [midnghtsapphire/no-kill-shelter-business](https://github.com/midnghtsapphire/no-kill-shelter-business)  
**Created:** 2026-07-27  
**Research Date:** 2026-08-08  
**Researcher:** Copilot Coding Agent  
**WR Status:** ✅ Implemented — target draft PR open

---

## Issue Context

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
- [x] Implement the agreed improvements as a **draft PR** on the target repo
      (portable package under `wr/fleet-maintenance/no-kill-shelter-business/` + APPLY.md).

<!-- fleet-maintenance:midnghtsapphire/no-kill-shelter-business -->

## Repository Metadata

| Property | Value |
| --- | --- |
| Visibility | Private |
| Default branch | `main` |
| Language | Docs-first (no app language detected pre-maintenance) |
| Last push (pre-WR) | 2026-03-05 |
| Description | No-Kill Shelter Business — shelter model business docs |
| Stars | N/A (private) |
| Archived | No |

## Research Checklist

- [x] Deep market research (tool landscape + citations)
- [x] BOM (docs + jury workflows + baseline tests; no paid deps)
- [x] Community chatter (OSS adoption/rescue demand via GitHub stars)
- [x] Competitor analysis (table lists prices or pending label)
- [x] Domain strategy (ops hub + Polar/donor funding surface)
- [x] Monetization (Polar/Gumroad paths; donor portal P0)
- [x] Every statistic/percentage cited with a source link or labeled as an estimate

## Research Findings

### 1. Executive decision

**SHIP the fleet baseline.** `no-kill-shelter-business` was a thin docs shell with:

1. No `.github/workflows` (no OpenRouter / Jules / Semgrep / CodeQL jury).
2. No `CONTRIBUTING.md` or product overview.
3. `AGENTS.md` project context incorrectly describing a Sessiono Expo marketplace.
4. No `package.json` / tests — agents had no local gate.
5. A single binary `docs/Untitled document.docx` with no Markdown ops playbooks.

The portable package in `wr/fleet-maintenance/no-kill-shelter-business/` remediates
gaps 1–4 without inventing a fake app runtime. Gap 5 is documented for follow-up
Markdown migration (non-blocking).

### 2. Gap analysis

| Gap | Severity | Remediation in package |
| --- | --- | --- |
| No CodeQL | High | `.github/workflows/codeql.yml` |
| No Semgrep SAST | High | `.github/workflows/semgrep.yml` (ERROR gate) |
| No OpenRouter AI review | Medium | `.github/workflows/ai-pr-review-openrouter.yml` |
| No Jules review | Medium | `.github/workflows/jules-pr-reviewer.yml` |
| Stale / wrong AGENTS context | Medium | Rewritten Project-Specific Context |
| No CONTRIBUTING / OVERVIEW | Medium | Added |
| No npm test baseline | Low–medium | `package.json` + `tests/repo-baseline.test.js` |
| Binary-only business notes | Low | Documented; migrate to Markdown later |

### 3. Competitor / tool table

| Tool | Role | Stars (approx.) | Pricing | Source |
| --- | --- | --- | --- | --- |
| animavita/animavita | Mobile adoption + alerts | ~733 | OSS GPL-2.0 | GitHub API 2026-08-08 |
| jllorencetti/pets | Django missing/adoption board | ~102 | OSS MIT | GitHub API 2026-08-08 |
| aoda-zhang/PawHaven-FullStack-React-NodeJS | Stray rescue case tracker | ~91 | OSS MIT | GitHub API 2026-08-08 |
| ShelterTechSF/askdarcel-web | Human shelter resource finder (adjacent UX) | ~29 | OSS GPL-3.0 | GitHub API 2026-08-08 |
| Shelterluv / PetPoint / Shelter Buddy | Commercial shelter CMS | N/A | Pricing data pending — competitive benchmark research required. | Vendor sites |
| Petfinder / Adopt-a-Pet | Adoption marketplaces | N/A | Listing fees (estimate: dominant consumer discovery) | Vendor sites |

### 4. Marketing / SEO keywords

no-kill shelter, animal shelter business plan, foster network playbook,
pet adoption funnel, shelter volunteer scheduling, animal rescue CRM,
donor stewardship nonprofit, spay-neuter funding checklist, adopter screening.

### 5. Monetization path

1. **P0** — Donor / sponsor portal hooks via Polar.sh (prime-directive funding surface).
2. **P1** — Grant-ready ops pack digital download (Gumroad/Polar) + managed adoption board SaaS.
3. **P2** — White-label consulting playbooks for partner rescues.

### 6. BOM (this maintenance)

| Item | Cost | Notes |
| --- | --- | --- |
| GitHub Actions minutes | Existing plan | Four jury workflows |
| OpenRouter API | Existing org key | Advisory review only |
| Jules API | Existing org key | Skip path if unset |
| npm dependencies | $0 | No runtime deps added |

## Implementation

**Package path:** `wr/fleet-maintenance/no-kill-shelter-business/`  
**Apply guide:** `wr/fleet-maintenance/no-kill-shelter-business/APPLY.md`  
**Regression test (hub):** `tests/no-kill-shelter-business-fleet-package.test.js`

### Files in the package

| File | Purpose |
| --- | --- |
| `README.md` | Hub entry, jury table, live URL placeholder |
| `CONTRIBUTING.md` | Branches, secrets, kill switches, PII rules |
| `AGENTS.md` | Correct no-kill shelter agent context |
| `CHANGELOG.md` | 0.2.0 fleet baseline |
| `docs/OVERVIEW.md` | Research + monetization |
| `docs/README.md` | Doc index |
| `package.json` | `npm test` / `validate:workflows` |
| `tests/repo-baseline.test.js` | Structure + jury presence |
| `.github/workflows/ai-pr-review-openrouter.yml` | OpenRouter jury |
| `.github/workflows/jules-pr-reviewer.yml` | Jules jury |
| `.github/workflows/semgrep.yml` | Semgrep SAST |
| `.github/workflows/codeql.yml` | CodeQL |
| `.gitignore` | Node/env hygiene |
| `APPLY.md` | How to open the target draft PR |

### Target draft PR

- **URL:** <https://github.com/midnghtsapphire/no-kill-shelter-business/pull/1>
- **Branch:** `fleet/no-kill-shelter-business-baseline`
- **Title:** `chore(fleet): docs refresh + full review jury`
- **Body:** references `Closes midnghtsapphire/revvel-standards#16831`

Portable package remains in this hub for provenance and re-apply via APPLY.md.

## Acceptance (hub contract)

- [x] Package `npm test` passes 100%
- [x] Hub regression test covers package presence and jury filenames
- [x] Conventional commit PR title on hub
- [x] No TODO/FIXME scaffolding in package files
