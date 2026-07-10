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

---

## Pending Decisions

> None currently. Review-tool fleet consolidated 2026-07-08 (D006–D010).
> Host + agent-contract schema locked 2026-07-10 (D012). Depends on D011 (checkpoint-gated Grids, PR #15668).

---

## Update Rules

- Add new decisions here BEFORE implementing
- Include rationale (not just what, but WHY)
- Date format: YYYY-MM-DD
- Link to discussion/discord thread if applicable
