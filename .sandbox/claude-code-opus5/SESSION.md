# Session — Opus 5 twin roll-forward

**Agent:** visiting agent, claude-code (Claude Code CLI session)
**Date:** 2026-08-21
**Branch:** `feat/model-routing-opus-5`
**Scope as agreed with owner:** all lanes in the routing tree of
`.github/agent-models.yml`. Not the other 37 files that mention a `claude-opus-4`
string (docs, skills, per-script defaults) — those are a separate sweep.

## Status (START_HERE_CALL_CHAIN honesty rule)

**CAN** — every claim below has a receipt in this file.

## Pre-work gates

| Gate | Result |
| --- | --- |
| `node scripts/bnatsheaf/cli.js imprint_agent --agent claude-code-opus5` | exit 0, `h1ApproxZero: true`, `obstructions: []` |
| Baseline `node --test tests/controller-core.test.js` | 16/16 pass, before any edit |
| Read `VISITING_AGENTS.md`, `AGENTS.md`, `START_HERE_CALL_CHAIN.md` | done |
| Read `wr/memory/decisions.jsonl` for prior decisions | done — no locked decision governs Opus tier; the 2026-07-10 Fable-5 reasoning decision is preserved, not re-litigated |

## API call (the one external call this session made)

`GET https://openrouter.ai/api/v1/models` — 422 models returned. Confirms the
house rule "verify new IDs at openrouter.ai/models before adding":

- `anthropic/claude-opus-5` — PRESENT
- `anthropic/claude-opus-4.8` — PRESENT
- `anthropic/claude-fable-5` — PRESENT

This discharges the caveat left in the 2026-07-10 `reasoning` profile comment,
which said openrouter.ai was unreachable from the sandbox that shipped it.

## Change set

| File | Change |
| --- | --- |
| `.github/agent-models.yml` | SSOT. Twins 4.8/4.7 → 5/4.8 on orchestrator, code_patch, best_coder. Reviewer 4.7 → 4.8. Reasoning fallback 4.8 → 5 (primary stays Fable 5). Header house rules + Opus 5 gotchas documented. |
| `MODEL_CONFIG.md` | Human summary kept in sync — lane table, house rules, Claude-direct IDs, Previous configurations. |
| `scripts/controller/core.js` | `DEFAULT_MODEL_CHAIN` mirrored to `['opus-5', 'opus-4.8', 'fable-5']`. |
| `tests/controller-core.test.js` | Drift assertion updated (see TM-0007 — it pinned a literal pair, not the invariant). |
| `wr/memory/decisions.jsonl` | Appended this decision. Also repaired line 40. |
| `learnings.md` | TM-0007. |

## Untouched on purpose

- **Sonnet denylist.** `anthropic/*sonnet*` still blocks `anthropic/claude-sonnet-5`,
  which is live on OpenRouter. Sonnet 5 is not one of the models that failed the
  2026-07 fleet test, but un-denylisting a family is an owner policy call.
- **Reasoning primary.** Fable 5 stays — owner decision 2026-07-10.
- **vision / image_gen / research / triage / cheap_summary.** No Anthropic
  Opus-tier pins; outside the agreed scope.

## Verification

| Check | Result |
| --- | --- |
| `node --test tests/controller-core.test.js` | 16/16 pass |
| `npm test` (full root suite) | exit 0 |
| `node .sandbox/claude-code-opus5/verify-lanes.js` | exit 0 — 14 profiles, no denylist hit, every routed profile has a fallback, coder != reviewer |
| `npx markdownlint-cli2 learnings.md MODEL_CONFIG.md` | 0 issues |
| `python scripts/validate_jsonl.py wr/memory/decisions.jsonl` | exit 0 |

## Blockers hit and how they were handled

1. **`validate-jsonl` pre-commit hook exited 1 before I changed anything.**
   `wr/memory/decisions.jsonl` line 40 (D019, Bito) was missing the
   schema-required `locked_by`, so any commit touching that file failed the
   hook — including one that only appends a valid line. Repaired by adding
   `"locked_by":"@midnghtsapphire (owner)"`, attribution taken verbatim from
   that entry's own text ("Owner purchased ... and designated it the review
   lane"). Not bypassed with `--no-verify`.

## Findings filed for the owner (not fixed here)

1. **All three "mandatory" standards named in `AGENTS.md` are missing:**
   `standards/VISITING_AGENT_SANDBOX_STANDARD.md`,
   `standards/OUT_OF_SCOPE_AUTO_WR_STANDARD.md`,
   `standards/TRIAGE_ROLE_STANDARD.md`. `AGENTS.md` says "load these before any
   write". A visiting agent that obeys literally cannot start. Complied with the
   one-line description of each instead.
2. **D-number namespace is split.** `DECISIONS.md` ends at D016;
   `decisions.jsonl` already uses D017, D018, D019. A new decision has no
   unambiguous next number. No D-row was authored here — those rows are all
   owner-attributed and a visiting agent should not forge owner authority.
3. **Drift test pins a literal, not an invariant** — see TM-0007.
