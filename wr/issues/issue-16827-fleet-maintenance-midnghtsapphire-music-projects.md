# WR: [WR] Fleet maintenance — midnghtsapphire/music-projects

**Issue:** #16827  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Target repository:** [midnghtsapphire/music-projects](https://github.com/midnghtsapphire/music-projects)  
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
      (portable package under `wr/fleet-maintenance/music-projects/` + APPLY.md).

<!-- fleet-maintenance:midnghtsapphire/music-projects -->

## Repository Metadata

| Property | Value |
| --- | --- |
| Visibility | Private |
| Default branch | `main` |
| Language | Docs-first (no app language detected pre-maintenance) |
| Last push (pre-WR) | 2026-03-05 |
| Description | Music production, songwriting, stem separation, and distribution tools |
| Stars | N/A (private) |
| Archived | No |

## Research Checklist

- [x] Deep market research (tool landscape + citations)
- [x] BOM (docs + jury workflows + baseline tests; no paid deps)
- [x] Community chatter (OSS stem-separation demand via GitHub stars)
- [x] Competitor analysis (table lists prices or pending label)
- [x] Domain strategy (hub + linked Music Video Creator product)
- [x] Monetization (Polar/Gumroad paths; Music Video Creator P0)
- [x] Every statistic/percentage cited with a source link or labeled as an estimate

## Research Findings

### 1. Executive decision

**SHIP the fleet baseline.** `music-projects` was a five-file docs shell with:

1. No `.github/workflows` (no OpenRouter / Jules / Semgrep / CodeQL jury).
2. No `CONTRIBUTING.md` or product overview.
3. `AGENTS.md` project context incorrectly describing a Sessiono Expo marketplace.
4. No `package.json` / tests — agents had no local gate.

The portable package in `wr/fleet-maintenance/music-projects/` remediates all four
gaps without inventing a fake app runtime.

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
| No live URL pointer | Low | README links Music Video Creator live deploy |

### 3. Competitor / tool table

| Tool | Role | Stars (approx.) | Pricing | Source |
| --- | --- | --- | --- | --- |
| deezer/spleeter | Stem separation | ~28,359 | OSS Apache-2.0 | GitHub API 2026-08-08 |
| facebookresearch/demucs | Stem separation | ~10,356 | OSS MIT | GitHub API 2026-08-08 |
| nomadkaraoke/python-audio-separator | CLI wrappers | ~1,306 | OSS | GitHub API 2026-08-08 |
| DistroKid / TuneCore / CD Baby | Distribution | N/A | Pricing data pending — competitive benchmark research required. | Vendor sites |
| Suno / Udio | Generative music | N/A | Freemium SaaS (estimate: crowded consumer market) | Vendor sites |

### 4. Marketing / SEO keywords

stem separation, AI songwriting, music distribution checklist, vocal remover,
demucs alternative, ISRC workflow, music production tools, Content ID prep.

### 5. Monetization path

1. **P0** — Drive traffic/upsell to Music Video Creator (live in revvel-standards /
   Vercel) and Polar.sh funding.
2. **P1** — Stem-separation SaaS or CLI pack (FOSS core + paid hosted GPU).
3. **P2** — Distribution checklist digital download (Gumroad/Polar).

### 6. BOM (this maintenance)

| Item | Cost | Notes |
| --- | --- | --- |
| GitHub Actions minutes | Existing plan | Four jury workflows |
| OpenRouter API | Existing org key | Advisory review only |
| Jules API | Existing org key | Skip path if unset |
| npm dependencies | $0 | No runtime deps added |

## Implementation

**Package path:** `wr/fleet-maintenance/music-projects/`  
**Apply guide:** `wr/fleet-maintenance/music-projects/APPLY.md`  
**Regression test (hub):** `tests/music-projects-fleet-package.test.js`

### Files in the package

| File | Purpose |
| --- | --- |
| `README.md` | Hub entry, jury table, live product link |
| `CONTRIBUTING.md` | Branches, secrets, kill switches |
| `AGENTS.md` | Correct music-projects agent context |
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

- **URL:** <https://github.com/midnghtsapphire/music-projects/pull/1>
- **Branch:** `fleet/music-projects-baseline`
- **Title:** `chore(fleet): docs refresh + full review jury`
- **Body:** references `Closes midnghtsapphire/revvel-standards#16827`

Portable package remains in this hub for provenance and re-apply via APPLY.md.

## Acceptance (hub contract)

- [x] Package `npm test` passes 100%
- [x] Hub regression test covers package presence and jury filenames
- [x] Conventional commit PR title on hub
- [x] No TODO/FIXME scaffolding in package files
