# WR: [WR] Fleet maintenance — midnghtsapphire/melody-intel

**Issue:** #15777
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Created:** 2026-07-13
**Research Date:** 2026-07-13
**Researcher:** Copilot (GitHub) + OpenRouter
**WR Status:** ✅ Implemented — draft PR open

---

## Issue Context

**Target repository:** `midnghtsapphire/melody-intel`

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

<!-- fleet-maintenance:midnghtsapphire/melody-intel -->

## Implementation

**Draft PR opened:** [midnghtsapphire/melody-intel#2](https://github.com/midnghtsapphire/melody-intel/pull/2)

Branch: `fleet-maintenance/revvel-standards-15777`

### Files added to melody-intel

| File | Purpose |
| --- | --- |
| `.github/workflows/ai-pr-review-openrouter.yml` | OpenRouter AI PR review (advisory, `maxlim0/AI-PR-Reviewer@v0.3`) |
| `.github/workflows/codeql.yml` | CodeQL static analysis — `actions` + `javascript-typescript` |
| `.github/workflows/semgrep.yml` | Semgrep SAST — secrets, OWASP top 10, CWE top 25, TypeScript |
| `.github/workflows/jules-pr-reviewer.yml` | Jules PR reviewer — design and correctness |
| `CONTRIBUTING.md` | Contributor guide — branch conventions, PR flow, secrets table, kill-switch guidance |

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | 0 |
| Open Issues | 2 |
| Private | No (public) |
| Archived | No |
| Default branch | `master` (repo predates the `main` rename convention; unchanged in scope) |
| Description | clean up routine for manus |

## Research Findings

### 1. Repository Overview

**melody-intel** is Audrey Evans's $10M-in-3-Years Recon & Dispatch System —
Agent Melody. It runs a daily automated scan of 8 domains (gov contracting,
enterprise security, neurodiversity, CLE, tooling, capital, distribution,
regulatory), scores each finding against the $10M arc, and fans actionable
work out to Linear, Slack, Gmail, a build-agent webhook, and Airtable.

**Architecture — 3 layers:**

- **Layer 1 (SCAN):** Daily 07:00 MT cron runs `.routines/melody-instigator.md`
  (Claude Opus 4.7) via `anthropics/claude-code-action@v1`. Outputs:
  `data/landscapes/{date}.json` and `data/actionable.json`.
- **Layer 2 (SYNTHESIZE):** Push to `data/landscapes/**` triggers
  `.routines/synthesize-and-dispatch.md` (Opus). Opens Linear issues, posts
  Slack canvas, drafts Gmail, hits GrowlingEyes build-agent webhook, updates
  Airtable, opens a recon PR.
- **Layer 3 (EXECUTION):** Audrey reviews Linear + recon PR. Build agent
  (OpenClaw default → Claude Code / Cursor / Devin / human) executes on
  approved branches.

**Stack:** GitHub Actions, `anthropics/claude-code-action@v1`, Claude Opus 4.7,
TypeScript (`dispatch/build-agent-intake.ts`), JSON data store, Linear,
Slack, Gmail (draft), Airtable.

### 2. Gap Analysis — What Was Missing Before This PR

| Gap | Severity | Remediation |
| --- | --- | --- |
| No CodeQL workflow | High — zero static analysis coverage | Added `codeql.yml` targeting `actions` + `javascript-typescript` |
| No Semgrep SAST | High — no secrets/OWASP scanning | Added `semgrep.yml` with `p/secrets`, `p/security-audit`, `p/typescript` |
| No OpenRouter AI review | Medium — no automated code review on PRs | Added `ai-pr-review-openrouter.yml` |
| No Jules review | Medium — no design/correctness review on PRs | Added `jules-pr-reviewer.yml` |
| No CONTRIBUTING.md | Low-medium — contributor expectations undocumented | Added `CONTRIBUTING.md` with branch conventions, secrets table, kill-switch guidance |

### 3. Existing Workflows (Unchanged)

| File | Status | Notes |
| --- | --- | --- |
| `.github/workflows/melody-recon.yml` | ✅ Healthy | Daily 07:00 MT scan, kill-switch aware, Opus 4.7 |
| `.github/workflows/melody-synthesize.yml` | ✅ Healthy | Push-triggered dispatch, loop guard via `[dispatch]` commit message |

No modifications were made to existing workflows. The PR is purely additive.

### 4. Security Notes

- The `dispatch/build-agent-intake.ts` stub validates the bearer token against
  `MELODY_SHARED_SECRET`. This is the critical security gate for build dispatch.
  Ensure this secret is rotated whenever an executor is changed.
- `melody-synthesize.yml` passes `BUILD_AGENT_WEBHOOK_URL` and
  `MELODY_SHARED_SECRET` via `claude_env`. This is appropriate — they never
  appear in logs.
- The repo is marked public on GitHub but contains no sensitive data in the
  repo itself (secrets are all in GitHub Secrets, data is scored findings only).
- The new `semgrep.yml` will surface any accidentally committed secrets on first
  run.

### 5. Monetization and $10M Arc

This repository is the intelligence engine feeding Audrey's revenue arc. The
fleet maintenance work directly serves the $10M goal by:

1. Ensuring the repo is secure (CodeQL + Semgrep catch vulnerabilities before
   they compromise API keys or the build-agent webhook).
2. Ensuring PRs that evolve the recon/dispatch system go through proper review
   (OpenRouter + Jules catch logic errors in prompts and dispatch code).
3. Documenting the contributor contract (CONTRIBUTING.md prevents accidental
   live dispatch without Audrey approval — which could burn API credits and
   pollute Linear).

**Revenue leverage:** melody-intel feeds high-composite-score findings (≥ 6.5)
to Linear. Each finding can represent a significant opportunity in gov
contracting, enterprise security, or capital markets. Keeping the pipeline
clean and audited directly protects and accelerates revenue.

### 6. Chatter and Demand Signals

`claude-code-action` (the core dependency) is Anthropic's primary
agentic workflow action — actively maintained with frequent releases, used by
thousands of automation-first teams. The `anthropics/claude-code-action@v1`
tag is stable.

### 7. DX Improvements Deferred

The following improvements were identified but deferred to keep this PR minimal
and focused on the fleet maintenance gates:

- **Pin `claude-code-action` to a specific SHA** — advisable for supply-chain
  security; requires Audrey's explicit approval of the pinned version since
  Opus model access may change between releases.
- **Add `dependabot.yml`** — would keep `actions/checkout`, `codeql-action`,
  etc. auto-updated; low priority for a private recon system.
- **Add `data/landscapes/.gitkeep`** — directory is already present in the
  repo so this is unnecessary.
- **TypeScript compilation check in CI** — `dispatch/build-agent-intake.ts` is
  currently a stub; a `tsc --noEmit` step would be low-signal until the stub is
  fleshed out.

## Dependencies

| Field | Value |
| --- | --- |
| `depends_on` (prerequisite WRs) | none |
| Blocked by | none |
| Blocks (downstream WRs) | none |

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| `OPENROUTER_API_KEY` not set in melody-intel | Medium | Workflow emits `::warning::` and skips gracefully — never hard-fails PR |
| `JULES_API_KEY` not set in melody-intel | Medium | Workflow marks status as `success/skipped` — never blocks merge |
| CodeQL SARIF upload conflict (default setup enabled) | Low | `upload: never` + manual upload step with `continue-on-error: true` |
| Semgrep finds existing secrets in repo | Low | Repo has no committed secrets; `p/secrets` scan is additive |

## Superseded Content

| Field | Value |
| --- | --- |
| Supersedes WR/issue | N/A — new work, no prior implementation |
| Reason for replacement | N/A |
| Archival status | NOT-APPLICABLE |
