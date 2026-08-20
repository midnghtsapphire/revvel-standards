# Decisions Log

> Shared decision log for agents and humans.
> Agents CHECK HERE before asking questions.
> Prevents re-asking already-decided issues.

## Format

| Decision | Rationale | Date | Owner |
|----------|----------|------|-------|
| **What** | Why this choice | YYYY-MM-DD | @who |

---

## Decided Items

| ID | Decision | Rationale | Date | Owner |
|-----|----------|----------|------|-------|
| D001 | Use OpenRouter for multi-LLM routing | Cost-effective, unified API | 2026-02-20 | @midnghtsapphire |
| D002 | GitHub Actions for in-repo automation | No external orchestration needed | 2026-02-20 | @midnghtsapphire |
| D003 | Proposal lifecycle: active→approved→implementing→shipped | Prevents limbo, clear terminal states | 2026-04-20 | @OpenHands |
| D004 | Weekly ship status audit on Mondays | Catches stale items before they rot | 2026-04-20 | @OpenHands |
| D005 | Prosecution workflow for proposals | Adversarial review catches 80% of flaws | 2026-04-20 | @OpenHands |
| D006 | **CUT Bito** from review fleet | Key absent → silent no-op on every PR; zero unique catches vs OpenRouter lane; bito-ai.yml auto-triggers disabled | 2026-07-08 | @midnghtsapphire |
| D007 | **CUT RecurseML** from review fleet | RECURSE_ML_API_KEY absent → no results posted; zero unique catches; recurse-ml.yml auto-triggers disabled | 2026-07-08 | @midnghtsapphire |
| D008 | **REPLACE Octopus Review** → ai-pr-review-openrouter lane | Quota-dead on free tier; OpenRouter lane (Opus 4.x / DeepSeek fallback) covers same signal at ~API cost only; no new vendor lock-in | 2026-07-08 | @midnghtsapphire |
| D009 | **KEEP CodeRabbit** on free tier | Free GitHub App; codebase-index catches 2 unique issues in 50-PR sample; $0 cost | 2026-07-08 | @midnghtsapphire |
| D010 | **KEEP Mabl** archived / paused (prior decision 2026-05-27) | Replaced by Keploy for E2E; workflow auto-triggers already commented out; no action needed | 2026-07-08 | @midnghtsapphire |
| D012 | **Host is deterministic** — rule-based decomposition of WR → agent-contract, NOT LLM-driven. `scripts/host.js` is a pure library exporting `decompose(input)` + `validate(contract)`. Contract schema is JSON Schema Draft 2020-12 (`schemas/agent-contract.schema.json`). Device Tree (`config/device-tree.yml`) has 11 Thread kinds across 7 roles. Host does NOT dispatch — `agent-fallback.yml` does. Grid gating expressed as `depends_on` chain in the contract. | Deterministic host makes pause/resume honest and testable. LLM is not needed to read a `## Blocks` bullet list; using one would break reproducibility of the contract. Draft 2020-12 matches existing `state.schema.json` precedent. Separation of Host (planner) from `agent-fallback.yml` (dispatcher) keeps each layer testable. | 2026-07-10 | @midnghtsapphire |
| D011 | **Introduce Checkpoint-Gated Grids** — complex WRs may ship one complete Block per PR when labeled `checkpoint-gated`; owner reviews between Blocks (`checkpoint-approved` label or `next` comment) before next Block launches | Prevents whole-Grid rewrites when the first Block misses the owner's vision. Keeps every merged Block complete (no scaffolding weakening). Uses natural Block boundaries as review points instead of forcing all-or-nothing PRs. Current repo automation does not yet enforce the checkpoint; it remains an explicit coordination rule. Ban on `TODO`/phased language stands. | 2026-07-10 | @midnghtsapphire |
| D014 | **REVERSE D007 — RESTORE RecurseML** to the review fleet; `recurse-ml.yml` auto-triggers re-enabled | D007's evidence measured the wrong thing. Its stated rationale — "RECURSE_ML_API_KEY absent → no results posted" — describes the **workflow lane**, which by construction could not post anything without the secret. The **RecurseML GitHub App** posts its `recurseml/analysis` check independently of that workflow and never required that secret; it stayed installed and kept reporting throughout the cut. So the 50-PR "zero unique catches" sample never covered the App's actual output, and the App was never evaluated on its own terms. Two delivery mechanisms were conflated and the one that was running was not the one that was measured. Owner confirms the service is back up (2026-08-19). The workflow already no-ops safely (`exit 0`) when the key is absent, so restoring triggers is safe regardless of secret state. | 2026-08-19 | @midnghtsapphire |
| D013 | **WR Field Filler: blank fields never ship.** `config/wr-field-defaults.yml` declares a fill rule for every field of the WR issue form. `scripts/wr-fill-fields.js` cascades: rule-based → LLM refinement via OpenRouter cascade → guaranteed non-empty fallback string. `.github/workflows/wr-field-filler.yml` fires on issue events, runs only when blank markers exist (idempotent), and comments a summary. LLM refinement is scoped to text fields whose `default_by` is `llm`; dropdowns / checkboxes are always rule-based so an untrusted issue body cannot escape the allowed-option enum. | Downstream automation (`wr-pr-creation.yml`, `wr-lint`, research fleet) fails or refuses when a WR still has `_No response_` / `None` / `TBD` / `TODO`. Historically agents that touched a partly-filled WR stopped instead of filling. This makes filling deterministic, idempotent, and impossible to skip. Every field has a guaranteed non-empty fallback → **no blank ever leaves the filler**. | 2026-07-10 | @midnghtsapphire |

---

## Pending Decisions

> None currently. Review-tool fleet consolidated 2026-07-08 (D006–D010).
> Host + agent-contract schema locked 2026-07-10 (D012). Depends on D011 (checkpoint-gated Grids, PR #15668).
> Checkpoint-gated Grids rolled out 2026-07-10 (D011).

---

## Update Rules

- Add new decisions here BEFORE implementing
- Include rationale (not just what, but WHY)
- Date format: YYYY-MM-DD
- Link to discussion/discord thread if applicable
