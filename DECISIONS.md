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
| D017 | **EXIT quiet mode** (supersedes the 2026-07-25 quiet-mode owner request, PR #16805). Automatic triggers restored on `trusted-bot-auto-approve.yml` (PR #17091/#17097); issue-gated scheduled workflows active while issue #17099 (`exit-quiet-mode`) stays open. The 31 cron generators stripped by #16805 stay OFF pending selective, per-workflow restoration — the #16805 rationale (~80 machine PRs/night, ~$400/week OpenRouter) still argues against a blanket cron revival. | Owner words 2026-08-08: "no more quiet mode" / "i want the agents out of silent mode." Owner is out of Copilot credits; the fleet must self-approve and merge green work. NOTE: the 2026-07-25 quiet-mode decision was recorded only in workflow comments + PR #16805, never in this log — which is why automated agents (Copilot recovery session, 2026-08-08) couldn't see it. This row closes that gap; log future operating-mode changes here FIRST per Update Rules below. | 2026-08-08 | @midnghtsapphire |
| D022 | **`.sandbox/<agent>/` mandatory for every visiting agent + Triage role + out-of-scope auto-WR rule.** Adds three new standards: `VISITING_AGENT_SANDBOX_STANDARD.md` (save every thought/script/API-call/decision as you work; blackouts are the norm), `OUT_OF_SCOPE_AUTO_WR_STANDARD.md` ("not my bug" without a filed WR is banned; scope is only proven by WR-level research), and `TRIAGE_ROLE_STANDARD.md` (ceremonial override every agent has, at all times, to file the out-of-scope WR). Adds `role:triage` label to allowlist. Restructures `learnings.md` to include a Training-Module (TM-NNNN) format; backfills 6 modules from this session (TM-0001 app-vs-workflow confusion, TM-0002 header/body mismatch, TM-0003 orphaned secret pattern, TM-0004 credit-blackout false claims, TM-0005 allowlist blocks recovery labels, TM-0006 detector lookahead too tight). Wires the three new standards into `AGENTS.md` as mandatory-load-before-any-write. Creates `.sandbox/openhands/` with this session's memory, thoughts, scripts, and API-call transcripts backfilled per the new standard. | Owner words 2026-08-10: "save all your sandbox code as you go so i dont loose anything in a blackout... every error in revvel-standards needs to act as a training module to help the fleet, visiting agents and or llms then we can develop scripts that can auto fix everything and more... from now on out of scope, not my bug, etc needs to auto create a WR. Use the Triage role or create a WR for triage role that overrides the system for this type of request so the agent has the ability to overwrite and create this WR." Every one of the session's re-litigated bugs (Bito/Recurse, subscription tracker, orphaned secrets, Copilot false claims) shared the same root pattern: an agent saw something wrong, decided it was out of scope, moved on. The next agent hit the same wall from a different angle and re-derived the diagnosis. This D memorializes the fix for the whole pattern. | 2026-08-10 | @midnghtsapphire |
| D020 | **Turn ON the subscription tracker (weekly cron).** `.github/workflows/subscription-tracker.yml` had a header comment claiming "Runs weekly (Monday, cron)" but only `workflow_dispatch` in its `on:` block — the schedule was never wired. This PR adds `schedule: - cron: '0 14 * * MON'` and a `pull_request:` trigger for edits to `data/subscriptions.yml`. Same pattern as D017/D018/eeat-trust-cron: something built and left dormant. Also adds a "known-stale entries" note to `data/subscriptions.yml` listing dates that are in the past because the tracker never ran (RecurseML, DigitalOcean, Devin). The tracker keeps surfacing them as "past due — please update" until refreshed — that is correct behaviour, not a bug. | Owner words 2026-08-09: "well there is a process that is supposed to remind me to update the expired marketplace app but i cannot keep up with all of it. that is why i need an assistant." The subscription tracker IS that assistant. It was built specifically for the RecurseML trial expiry (2026-06-27) it then failed to warn about. Waking it up is the highest-leverage fix in the entire secret/subscription/expiry thread — one workflow covers RecurseML, Bito, DigitalOcean, Devin, Cursor surprise-billing, and every future subscription drift automatically. | 2026-08-09 | @midnghtsapphire |
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
