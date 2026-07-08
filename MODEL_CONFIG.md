# Model Configuration

**Source of truth:** `.github/agent-models.yml` (profiles + `routing_tree`).
This file is the human summary; when they disagree, the YAML wins.

## Active lanes (2026-07-08)

| Lane | Profile | Primary | Fallback |
| --- | --- | --- | --- |
| General / orchestration | `orchestrator` | `anthropic/claude-opus-4.8` | `anthropic/claude-opus-4.7` |
| Coding | `code_patch` | `anthropic/claude-opus-4.8` | `anthropic/claude-opus-4.7` |
| Deep reasoning | `reasoning` | `deepseek/deepseek-r1` | `anthropic/claude-opus-4.8` |
| Vision / images / OCR | `vision` | `google/gemini-2.5-pro` | `google/gemini-2.5-flash` |
| Review | `review` | `anthropic/claude-opus-4.7` | `deepseek/deepseek-r1` |
| Research (cited) | `research` | `sonar-pro` (Perplexity) | `sonar-deep-research` |
| Triage / classify | `triage` | `openai/gpt-4o-mini` | `anthropic/claude-haiku-4.5` |
| Cheap summary | `cheap_summary` | `deepseek/deepseek-chat` | `openai/gpt-4o-mini` |

For **any type of job**, walk the `routing_tree` in `agent-models.yml`
top-down; first match wins.

## House rules

- Everything routes through OpenRouter where possible — one place, one bill.
- The **Opus twins** (4.8 primary / 4.7 fallback, and the reviewer twin
  deliberately differs from the coding twin) beat `openrouter/auto`
  ("fusion") in our own fleet A/B tests — pinned, never auto.
- **Claude Sonnet models are denylisted**: they repeatedly refused/violated
  repo operating rules in testing. Do not reintroduce, not even as fallback.
- Every profile ships with a fallback; verify new IDs at
  <https://openrouter.ai/models> before adding.

## Previous configurations

- `google/gemini-2.5-pro` as global default (now the vision lane instead)
- `anthropic/claude-3.5-sonnet` (deprecated, now denylisted family)

## Mission Alignment

Supports the PRIME DIRECTIVE ($10k/month → $10M in 3 years): cheap lanes
(triage/summary) stay cheap, expensive twins are reserved for the work that
earns it, and one router config means one place to tune spend.
