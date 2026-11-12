# LM Studio / Ollama (local LLMs)

| Field | Value |
| --- | --- |
| Category | local LLM |
| Status | active |
| First evidence found | 2026-07-23 |
| Latest evidence found | 2026-11-10 |
| Cost | $0 on her machine |
| Verdict | RECORDED: keep, try first (cost index) |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Layer 0 local-first cascade before OpenRouter.

## What worked

- Free lane.

## What did not work

- Hosted CI cannot reach it; self-hosted runner jobs failed with no runner.

## Why kept or dropped

Kept. Free on her laptop; GitHub runners cannot reach it.

## Evidence

- [Local LLM setup](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/LOCAL_LLM_SETUP.md)
- [local_llm.py](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/scripts/local_llm.py)
- [Commit ff00dfa71 (#17853)](https://github.com/midnghtsapphire/revvel-standards/commit/ff00dfa71f4c1647e482294eceac07f77b59533c)
- [Cost index](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/TOOL_COST_INDEX.md)

## Open gaps for Audrey

- **Needs Audrey:** yes: which models she runs
- Models and hardware.
