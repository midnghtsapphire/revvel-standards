# WR: [WR] Fleet maintenance — midnghtsapphire/openaudrey

**Issue:** #16885
**Target repository:** [midnghtsapphire/openaudrey](https://github.com/midnghtsapphire/openaudrey)
**Research Date:** 2026-08-08
**Researcher:** Copilot Coding Agent
**WR Status:** ✅ Complete (draft PR opened on target)

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

<!-- fleet-maintenance:midnghtsapphire/openaudrey -->

## Implementation

**Draft PR opened:** <https://github.com/midnghtsapphire/openaudrey/pull/1>

Branch: `chore/fleet-maintenance-wr-16885`

### Files added/updated on openaudrey

| File | Purpose |
| --- | --- |
| `README.md` | Refresh — testing, review jury, `oaudrey.com` hub, docs index |
| `OVERVIEW.md` | System map, security posture, related surfaces |
| `CONTRIBUTING.md` | Branch/PR conventions, secrets table, jury checklist |
| `CHANGELOG.md` | `1.1.0` entry |
| `package.json` | `npm test`, version bump |
| `core/openaudrey.js` | Redact chat IDs / IPs from agent prompt summary |
| `core/orchestrator.js` | 256 KiB body cap; export pure helpers |
| `tests/*.test.js` | Unit tests (routing, redaction, parseBody) |
| `.github/workflows/ci.yml` | PR/push unit tests + syntax |
| `.github/workflows/ai-pr-review-openrouter.yml` | OpenRouter AI PR review |
| `.github/workflows/jules-pr-reviewer.yml` | Jules (skip-clean without key) |
| `.github/workflows/semgrep.yml` | SAST ERROR gate |
| `.github/workflows/codeql.yml` | JS/TS + Actions scanning |
| `.github/dependabot.yml` | github-actions weekly updates |

## Repository Metadata

| Property | Value |
| --- | --- |
| Description | OpenAudrey — Umbrella brand identity for Revvel's entire business portfolio |
| Language | JavaScript (Node ≥18) |
| Default branch | `main` |
| Pre-existing workflows | `deploy.yml` only |
| Secrets present | OPENROUTER_API_KEY, ANTHROPIC_API_KEY, DO_API_TOKEN, … (no JULES_API_KEY) |

## Research Findings

### 1. Repository overview

OpenAudrey is both a **brand SSOT** (logos, palette, typography, SEO) and a
**5-agent orchestration runtime** (Rex, Watcher, Scheduler, Processor,
Generator) with Vault AppRole auth and DigitalOcean deploy scripts.

Related public hub landing lives in this monorepo at `oaudrey/` (apex
`oaudrey.com`).

### 2. Gap analysis — before this PR

| Gap | Severity | Remediation |
| --- | --- | --- |
| No CodeQL workflow | High | Added `codeql.yml` (`actions` + `javascript-typescript`) |
| No Semgrep SAST | High | Added `semgrep.yml` with secrets + security-audit ERROR gate |
| No OpenRouter AI review | Medium | Added `ai-pr-review-openrouter.yml` |
| No Jules review | Medium | Added `jules-pr-reviewer.yml` (skip-clean without key) |
| No PR CI / unit tests | High | Added `ci.yml` + `tests/` + `npm test` |
| No CONTRIBUTING / OVERVIEW | Low-medium | Added both; refreshed README |
| Agent prompt summary leaked Telegram chatId + droplet IP | Medium | Redacted in `getRegistrySummary()` |
| Control-plane bodies uncapped | Medium | 256 KiB limit in `parseBody` |
| No Dependabot for Actions | Low | Added `.github/dependabot.yml` |

### 3. Existing workflows (unchanged)

- `.github/workflows/deploy.yml` — build/audit/deploy on push to `main` (deploy job still disabled pending SSH key)

### 4. Marketing / SEO / monetization (WR research checklist)

| Signal | Finding | Confidence |
| --- | --- | --- |
| Keywords | openaudrey, oaudrey, freedom angel corps, AI agent orchestration, umbrella brand | high (repo README + brand docs) |
| GitHub stars (referenced tools) | Node.js built-in test runner (stdlib); Semgrep OSS packs; CodeQL; maxlim0/AI-PR-Reviewer | n/a product stars — infra tools |
| Monetization path | Brand + orchestration quality → product portfolio (MindMappr, Reese Reviews, …) → Giving Pledge / Freedom Angel Fighters | medium (mission stated in brand docs; revenue not measured here) |
| Citations | Target README, `core/registry.json`, `BRAND_GUIDELINES.md`, revvel-standards `oaudrey/README.md` | high |

### 5. Security notes

- Control server already bound to `127.0.0.1` (kept; documented).
- `registry.json` still stores chatId/IPs as operational SSOT; prompt path no longer echoes them.
- Semgrep ERROR gate will fail PRs that introduce secrets or high-severity audit hits.
- Recommend adding org-level `JULES_API_KEY` when Jules coverage is desired; workflow is non-blocking without it.

### 6. Performance / DX

- Zero runtime deps in `package.json` — keep it that way unless a real need appears.
- `npm test` is keyless and offline — good DX for agents and humans.
- Dependabot will keep Actions SHAs/tags from rotting.

## Definition of Done mapping

| Rule | Status |
| --- | --- |
| No scaffolding / TODOs in shipped code | Pass |
| Tests for new behavior | Pass (`npm test`) |
| Conventional commit PR title | Pass (`chore(fleet): …`) |
| Draft PR on target | Pass (see link above) |
| Full review jury workflows present | Pass |

## Next human steps (click-by-click)

1. Open <https://github.com/midnghtsapphire/openaudrey/pull/1>
2. Wait for CI / Semgrep / CodeQL checks (Actions tab on the PR).
3. When green: click **Ready for review** (removes draft) if you want OpenRouter review to run (it skips drafts).
4. Click **Merge pull request** → **Confirm merge**.
5. Back on <https://github.com/midnghtsapphire/revvel-standards/issues/16885> add label `wr:complete` (or merge the coordination PR that closes #16885).
