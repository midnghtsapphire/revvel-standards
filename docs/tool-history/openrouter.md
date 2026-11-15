# OpenRouter

| Field | Value |
| --- | --- |
| Category | LLM routing |
| Status | active |
| First evidence found | 2026-04-16 |
| Latest evidence found | 2026-11-11 |
| Cost | usage-priced credits; cost index notes account at 402, balance exhausted (Aug 2026) |
| Verdict | RECORDED: kept but gated (cost index); D001 chose it for multi-LLM routing (2026-02-20) |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Main LLM router for triage, review, personas, and fallback chains in revvel-standards.

## What worked

- D001: cost-effective unified API (2026-02-20).
- Triage, review, and persona workflows all call it (scripts/openrouter-triage.js).

## What did not work

- docs/TOOL_COST_INDEX.md: account at 402, balance exhausted; about 270 scheduled calls a day removed by the cron freeze (#17849).
- Every CI LLM call is billed (docs/LOCAL_LLM_SETUP.md).

## Why kept or dropped

Kept, gated by local-first cascade (LM Studio, Ollama, then OpenRouter). Cost-effective unified API per D001. Paid use is refused unless REVVEL_LLM_ALLOW_CLOUD=1.

## Evidence

- [DECISIONS.md D001](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/DECISIONS.md)
- [Cost index row](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/TOOL_COST_INDEX.md)
- [Spend switches](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/SPEND-SWITCHES.md)
- [Local LLM setup](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/LOCAL_LLM_SETUP.md)
- [PR #13426: OpenRouter agent workflow (2026-05-07)](https://github.com/midnghtsapphire/revvel-standards/pull/13426)
- [Triage script](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/scripts/openrouter-triage.js)
- [Subscriptions file](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/data/subscriptions.yml)
- [Commit af3b3f0ad (2026-04-16)](https://github.com/midnghtsapphire/revvel-standards/commit/af3b3f0ad85b8a1765b4c313b86a20d778f3b6b0)

## Open gaps for Audrey

- **Needs Audrey:** yes: current balance, monthly cap, and whether she still wants it as the main router
- Her monthly spend and cap.
- Whether OpenRouter stays the default after the local-first change.
