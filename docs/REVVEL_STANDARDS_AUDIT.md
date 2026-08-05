# Revvel-Standards Audit & Remediation Roadmap

**Repository:** midnghtsapphire/revvel-standards
**Date:** 2026-05-21
**Status:** 🟡 Audit complete — remediation pending
**Scope:** End-to-end automation pipeline (research → docs → implement → ship-to-market), the engine/orchestrator layer, the research engine + swarms, the code-review "jury", product S2M readiness, and the per-repo SEO process.

---

## Bottom line

You have built a large amount of **real** machinery. The problem is not that the
agents are weak — and it is **not** that they fail to produce docs. The agents
**do** generate elaborate, useful design docs, often proposing a *better /
reimagined* app than what was there. The failure is downstream: **what they
design is never implemented.** The pieces are **not wired to each other**, the
orchestrator is **prose with no code behind it**, and the review "jury" is set up
to **never block**. Concretely, across four investigations:

1. Doc generation works and is elaborate (research packets + WR design docs).
   The **docs→implement handoff** is broken by **trigger-name mismatches** and a
   **stubbed coding agent**, so the one workflow that can actually write code
   never fires automatically — the elaborate design just sits there.
2. The richly-specified **engine/orchestrator contract has zero implementing
   code** — `state.json` is literally `{}`.
3. The **research engine is genuinely real** (multi-LLM triangulation) but
   "swarm" is aspirational naming, and one research script is **broken and
   hidden** from the test suite.
4. The **code-review jury advises but never gates** — every scanner is
   non-blocking and two AI reviewers are dormant.
5. Only **1 of 10 products has tests**; S2M deploy capability exists but is unproven.
6. **"Reimagined SEO per repo" exists nowhere in code** — it is a doc standard
   plus one narrow validator plus an LLM lane.

All of this is fixable, and most of it is wiring rather than new building.

---

## The intended pipeline (design)

Per `engines/CONTRACT.md`, `promptforproject.md`, `wr/WR_TEMPLATE_FULL.md`,
`GOAP.md`, and `docs/AGENTS.md`, a Work Request is meant to flow:

1. **Intake & route** — read typed fields, score viability, refuse any request
   with no `revenue_target_monthly_usd` (`engines/CONTRACT.md` Rule 4).
2. **Deep research → compile** — named specialist lanes (market, SEO, competitor,
   chatter, revenue, …) via OpenRouter triangulation, synthesized into one packet
   with ≥90% citation coverage.
3. **Create standard docs** — WR + BOM + blueprint under the repo's doc artifacts.
4. **Implement S2M product** — orchestrator dispatches to engines that emit files
   or call runners (GitHub/Vercel/Supabase/npm/stores). "No descriptive-only output."
5. **Generate skills + a runner/MCP/CLI/API** per project.
6. **Store listing + landing page** — Gumroad/LemonSqueezy + Vercel landing/TEST URLs.
7. **Self-heal + persist state** — append `learnings.md`, write schema-valid `state.json`.

---

## The actual pipeline (reality)

| Stage | Wired? | Reality |
| --- | --- | --- |
| Intake / routing | ✅ runs | `openrouter-assignee.yml` applies labels + `@oaudrey` + a comment. Labels/comments only — no work. |
| Research | ✅ runs | `research-engine.yml` → `scripts/research-engine.js` writes `docs/research-engine/<stamp>.md`, commits it, requests review, dispatches `wr-pr-creation.yml`. Genuinely productive. |
| Doc PR | ✅ runs | `wr-pr-creation.yml` copies a WR template into `wr/issues/issue-N-*.md` (not `docs/`), opens a `[WR]` PR, asks Jules to "make it ship-to-market ready." |
| Implementation | ⚠️ stub | `openrouter-coder.yml` + `.github/scripts/openrouter_coder.py` is the **only** workflow that writes code with no external app. `jules-coding-agent.yml` is an admitted stub that creates an **empty branch → no PR**. |
| Delivery | ✅ runs (post-merge) | `ship-to-market.yml` (988 lines) deploys/publishes **already-merged** code (Vercel/Railway/npm/PDF/Docker/marketplace). It assumes implementation already happened. |

---

## Root-cause findings

### Finding 1 — The handoff never advances research → code (the smoking gun)

`openrouter-coder.yml` triggers on label `wr:research-complete`, label `wr:code`,
or a comment containing the literal `Research Findings:`. But:

- `scripts/research-engine.js` applies **`research:complete`**, not
  **`wr:research-complete`** — name mismatch, never fires.
- Its completion comment says **"Research Engine Review Request / Research
  packet:"**, never **`Research Findings:`** — the comment trigger also misses.
- Nothing auto-promotes a researched issue to `wr:code` (only manual
  `workflow_dispatch` in `issue-state-machine.yml` does).

Net: the working coder is never reached automatically. The pipeline stalls at
"doc PR / awaiting Jules" — which is exactly the "can't do the docs then
implement" symptom.

**Key files:** `scripts/research-engine.js`, `.github/workflows/openrouter-coder.yml`,
`.github/scripts/openrouter_coder.py`, `.github/workflows/wr-pr-creation.yml`,
`.github/workflows/jules-coding-agent.yml`, `.github/workflows/issue-state-machine.yml`.

### Finding 2 — The engine/orchestrator is fiction

`engines/CONTRACT.md` describes an orchestrator → engine → runner contract, but
**no code references** `route_to_engine` / `next_engine` / `runner_calls`;
`state.json` is `{}`; `agent-factory/` is all READMEs (one shell script). The
"engine" is really a label-driven GitHub Actions fan-out. The good news:
`ship-to-market.yml` is a genuinely functional delivery engine — it just needs
real code to deliver.

### Finding 3 — Research engine real; "swarm" aspirational; one script broken

`scripts/research-engine.js` genuinely fans out 8 lanes × a 3-model triad
(Claude Sonnet 4 / Gemini 2.5 Pro / GPT-4.1) in parallel, synthesized by Opus —
real and tested. But `swarm`/`mas` depth is parsed and then treated the same as
triangulation: there is **no true 100+-task swarm executor**.
`scripts/perplexity-research-issue.js` **fails `node --check`** (duplicate
declarations, two `module.exports`) and is **excluded from `npm test`**, so the
breakage is invisible.

### Finding 4 — The "trustworthy jury" never blocks

Every scanner is non-blocking: Semgrep `|| true`, CodeQL `continue-on-error`,
Jules `fail_on: never`. `ai-pr-review-openrouter.yml` and `panda-ops.yml` are
**`workflow_dispatch`-only despite docs claiming "auto on PR"**; CodeRabbit has
no config (no-op). You are paying for a jury that advises but cannot stop a bad
merge.

### Finding 5 — Product S2M readiness is thin

| Product | Code | Tests | Deploy/store | Verdict |
| --- | --- | --- | --- | --- |
| creator-payout-tracker | ✅ | ✅ | vercel.json | Most complete — only product with code+tests+deploy |
| revvel-skill-runner | ✅ | ❌ | vercel.json | Real app; "skill execution engine missing" per its own WR |
| screen-recorder-finder | ✅ | ❌ | vercel.json | Real app, no tests |
| affiliate-hub | ✅ | ❌ | vercel.json | Real landing app, no tests |
| ai-video-toolkit | ✅ | ❌ | vercel.json | Real app, no tests |
| prompt-generation-app | ✅ | ❌ | vercel.json | Modest app + deploy |
| music-video-creator | ✅ | ❌ | none | Real app, no deploy config |
| life-insurance-lead-engine | ✅ (in `build/`) | ❌ | stub | Real nested app; outer dirs empty |
| openmythos | thin | ❌ | none | Scaffold |
| graphify-evaluator | thin | ❌ | none | Docs-heavy scaffold |

Only **1/10** has tests. Store deploy (`auto-deploy-to-stores.yml`: Expo EAS /
Fastlane) exists but is unproven and secret-gated.

### Finding 6 — No executable per-repo SEO engine

"Reimagined SEO per repo" appears **nowhere in code**. What exists: a markdown
standard (`skills/seo-metadata`, `docs/Master_Inventory/SEO_METADATA_STANDARD.md`),
one executable validator (`scripts/schema-rich-results-checker.js`, JSON-LD only),
and the research engine's SEO lane. No script ingests a repo and emits SEO.

### Finding 7 — Tooling can't enforce quality (see companion doc)

Root manifest is bare (no pinned engines, no test framework, no coverage), so the
advertised 80/75 coverage gate is unenforceable and GitHub Actions doesn't run
`npm test`. Full analysis + fix in `docs/TOOLING_STANDARDIZATION_RESEARCH.md`.

---

## Prioritized remediation roadmap (goal-tied)

Goals: **$10k/month fast**, then **$10M in 3 years**. Sequenced so the fastest
revenue unblock comes first.

### Phase 0 — Unblock the pipeline (days; highest leverage)

- **1. Fix the trigger mismatch** so research auto-advances to the working
  coder: make `research-engine.js` also apply `wr:research-complete` and emit a
  comment containing `Research Findings:` (Finding 1).
- **2. Route implementation to the OpenRouter coder, not the Jules stub.**
  Comment out the stub body in `jules-coding-agent.yml` (name + date + why, per
  your no-delete rule) so it stops claiming false success, and dispatch
  `openrouter-coder.yml` after the doc PR.
- **3. Point generated docs at `docs/`** (your artifact convention) rather than
  `wr/issues/`.
- **4. Fix or quarantine `perplexity-research-issue.js`** and add it to
  `npm test` so breakage can't hide again (Finding 3).

*Outcome:* an opened issue actually produces a researched doc **and** an
implementation PR without manual steps.

### Phase 1 — Make quality trustworthy (1–2 weeks)

- **5.** Adopt the tooling foundation from `docs/TOOLING_STANDARDIZATION_RESEARCH.md`
  (`node --test` + `c8` 80/75 gate, workspaces, pinned engines, `tsc --checkJs`,
  run the gate in GitHub Actions as a required check).
- **6. Make the jury gate** on the scanners you trust: flip Semgrep / CodeQL from
  non-blocking to blocking on high-severity, and make the OpenRouter/PandaOps
  reviewers actually run on PR (Finding 4).
- **7.** Backfill tests for the **two products closest to revenue** first.

*Outcome:* the jury you pay for can stop a bad merge; coverage gate is real.

### Phase 2 — One engine that truly "does work" (2–4 weeks)

- **8.** Build a thin **CLI** `npm run engine` (`engines/runner-orchestrator/orchestrate.js`)
  that: reads a WR, validates `revenue_target_monthly_usd` against
  `schemas/state.schema.json`, writes a real `state.json`, shells to the working
  `research-engine.js`, then emits the correct `deliver:*` label so the working
  `ship-to-market.yml` ships. This turns `engines/CONTRACT.md` from prose into a
  real coordinator wiring the three assets that already work.
- **9.** Add per-project artifact generation (skill / runner / MCP / CLI / API) as
  engine sub-commands — the "create all those" capability.

*Outcome:* a request goes intake → research → state → ship with no glue by hand.

### Phase 3 — Monetization rails ($10k/mo path)

- **10.** Real **store publish** via Gumroad/LemonSqueezy API (today it only
  writes a `listing-draft.md`).
- **11. Landing-page + FB campaign** generation from the product's research packet.
- **12. Per-repo SEO engine**: extend `schema-rich-results-checker.js` + the SEO
  lane into a script that ingests a repo and emits reimagined metadata/keywords.
- **13.** Ship `creator-payout-tracker` (the only tested product) end-to-end
  first as the reference revenue case.

### Phase 4 — Scale to 24/7 ($10M/3yr path)

- **14.** Multiple orchestrators per engine, fed by handoff docs / research
  packets to spawn new projects automatically.
- **15.** Wire GOAP as the always-on personal-assistant lane (same read/write scope).
- **16.** A real swarm executor behind the `swarm`/`mas` depth flag (Finding 3)
  once cost governance from `skills/openrouter-swarms` is enforced.

---

## Conventions honored in remediation

- **No deletions** — superseded code is commented out with name + date + reason,
  not removed (per owner directive, 2026-05-21).
- **Standards artifacts** live under `docs/`.
- **Wording** — "obsessive" → "relentlessly driven" in standards/prompts.

---

## Appendix — key evidence files

- Pipeline: `.github/workflows/openrouter-coder.yml`, `.github/scripts/openrouter_coder.py`, `.github/workflows/research-engine.yml`, `scripts/research-engine.js`, `.github/workflows/wr-pr-creation.yml`, `.github/workflows/jules-coding-agent.yml`, `.github/workflows/issue-state-machine.yml`, `.github/workflows/ship-to-market.yml`
- Engine: `engines/CONTRACT.md`, `engines/runner-orchestrator/README.md`, `state.json`, `schemas/state.schema.json`, `agent-factory/`
- Research/jury: `scripts/openrouter-routing.js`, `scripts/openrouter-personas.js`, `scripts/perplexity-research-issue.js` (broken), `skills/openrouter-swarms/`, `.github/workflows/ready-for-review.yml`, `semgrep.yml`, `codeql.yml`, `jules-pr-reviewer.yml`, `ai-pr-review-openrouter.yml`, `panda-ops.yml`
- SEO: `skills/seo-metadata/`, `docs/Master_Inventory/SEO_METADATA_STANDARD.md`, `scripts/schema-rich-results-checker.js`
- Tooling: `docs/TOOLING_STANDARDIZATION_RESEARCH.md`
