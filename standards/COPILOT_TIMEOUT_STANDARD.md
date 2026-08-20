# Copilot / Visiting-LLM Timeout Standard

**ID:** RVS-COPILOT-TIMEOUT-001  
**WR:** #17775  
**Status:** Active  
**Floor:** 60 minutes  
**Ceiling (proven need only):** 90 minutes  

## Problem

Long coding-agent sessions (GitHub Copilot cloud agent, OpenRouter, OpenHands,
SWE-agent, Jules, free-LLM router, agent-fallback) were dying with:

```text
The job has exceeded the maximum execution time of 10m0s
```

That string is GitHub Actions killing a job whose `timeout-minutes` is `10` (or
another short cap). It is **not** OpenRouter’s per-request HTTP timeout.

## Rule

1. Every **execution** job that runs a visiting LLM, OpenRouter, or Copilot
   coding path MUST set `timeout-minutes` to **at least 60**.
2. Use **90** only when a captured failing run proves 60 is still insufficient.
3. Do **not** blanket-raise short automation (lint, label sync, WR field filler,
   host decompose, agent monitor).
4. Host-emitted Thread `timeout_minutes` and device-tree
   `default_timeout_minutes` for OpenRouter-preferring kinds MUST also be ≥ 60
   (exception: `host-decomposer`, which is in-process meta work).

## Source of truth

| Artifact | Path |
| --- | --- |
| Policy | `config/copilot-timeouts.yml` |
| Auditor | `scripts/copilot-timeout-audit.js` |
| Tests | `tests/copilot-timeout-audit.test.js` |
| Product console | `products/copilot-timeout-console` |
| Docs page | `docs/copilot-timeout-console/` |

## How to verify (click-by-click)

1. Clone the repo (or open the PR branch).
2. In a terminal at the repo root, run:

   ```bash
   node scripts/copilot-timeout-audit.js --markdown
   ```

3. **Success looks like:** exit code `0` and a line  
   `Answer: YES — floor 60m is held.`
4. **Failure looks like:** exit code `1` and a table row with ❌ naming the
   workflow + job still under 60.
5. Fix only that job’s `timeout-minutes`, re-run the auditor, then:

   ```bash
   node --test tests/copilot-timeout-audit.test.js
   ```

## Adding a new visiting agent workflow

1. Add the workflow path (and job ids) under `targets:` in
   `config/copilot-timeouts.yml`.
2. Set that job’s `timeout-minutes: 60` (or higher).
3. Run the auditor — it must stay green.
4. Do not invent a second timeout policy file.

## Nested client timeouts

Job `timeout-minutes` is the wall clock for the whole job. Individual HTTP
calls (e.g. `scripts/openrouter-routing.js` default 60s, OpenRouter coder
request 120s) are **per request** and may stay shorter — multi-turn coding
issues many requests inside one 60-minute job. Do not confuse the two layers.

## Related

- `docs/AGENT_FALLBACK_PROCESS.md`
- `config/device-tree.yml`
- `schemas/agent-contract.schema.json`
- `standards/VERIFY_THE_POSTCONDITION.md` (RVS-VERIFY-001 — a floor nobody checks is decoration)
