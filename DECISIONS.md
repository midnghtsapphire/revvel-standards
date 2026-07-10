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
| D013 | **WR Field Filler: blank fields never ship.** `config/wr-field-defaults.yml` declares a fill rule for every field of the WR issue form. `scripts/wr-fill-fields.js` cascades: rule-based → LLM refinement via OpenRouter cascade → guaranteed non-empty fallback string. `.github/workflows/wr-field-filler.yml` fires on issue events, runs only when blank markers exist (idempotent), and comments a summary. LLM refinement is scoped to text fields whose `default_by` is `llm`; dropdowns / checkboxes are always rule-based so an untrusted issue body cannot escape the allowed-option enum. | Downstream automation (`wr-pr-creation.yml`, `wr-lint`, research fleet) fails or refuses when a WR still has `_No response_` / `None` / `TBD` / `TODO`. Historically agents that touched a partly-filled WR stopped instead of filling. This makes filling deterministic, idempotent, and impossible to skip. Every field has a guaranteed non-empty fallback → **no blank ever leaves the filler**. | 2026-07-10 | @midnghtsapphire |

---

## Pending Decisions

> None currently. Review-tool fleet consolidated 2026-07-08 (D006–D010).

---

## Update Rules

- Add new decisions here BEFORE implementing
- Include rationale (not just what, but WHY)
- Date format: YYYY-MM-DD
- Link to discussion/discord thread if applicable
