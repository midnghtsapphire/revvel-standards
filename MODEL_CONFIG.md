# Model Configuration

**Source of truth:** `.github/agent-models.yml` (profiles + `routing_tree`).
This file is the human summary; when they disagree, the YAML wins.

## Active lanes (2026-07-10)

| Lane | Profile | Primary | Fallback |
| --- | --- | --- | --- |
| General / orchestration | `orchestrator` | `anthropic/claude-opus-4.8` | `anthropic/claude-opus-4.7` |
| Coding | `code_patch` | `anthropic/claude-opus-4.8` | `anthropic/claude-opus-4.7` |
| Deep reasoning | `reasoning` | `anthropic/claude-fable-5` | `anthropic/claude-opus-4.8` |
| Vision / images / OCR | `vision` | `google/gemini-2.5-pro` | `google/gemini-2.5-flash` |
| Image generation / image-to-image | `image_gen` | `google/gemini-2.5-flash-image` | `openai/gpt-image-1` |
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
  The denylist pattern covers old-style IDs too (`claude-3.5-sonnet`) — that
  naming gap is how one survived in the fleet-controller chain until
  2026-07-10.
- **Claude Fable 5 owns the reasoning lane** (owner decision 2026-07-10) —
  Mythos-class, above Opus, $10/$50 per MTok vs the twins' $5/$25. Reserve it
  for genuinely hard reasoning; execution stays on the twins.
- Every profile ships with a fallback; verify new IDs at
  <https://openrouter.ai/models> before adding.
- The fleet-controller's reassignment chain (`scripts/controller/core.js`
  `DEFAULT_MODEL_CHAIN`) mirrors this policy — twins, then Fable 5 — and a
  drift test checks it against the SSOT denylist.
- **Claude-direct lane (no OpenRouter):** where a workflow needs Claude
  specifically, the sanctioned alternatives are the official
  `anthropics/claude-code-action` GitHub Action or headless `claude -p`
  (Claude Code CLI) with an `ANTHROPIC_API_KEY` secret. Model IDs there drop
  the vendor prefix: `claude-opus-4-8`, `claude-fable-5`. Caveats: a second
  bill/key to protect from the Doppler secret wipes; Fable 5 requires 30-day
  data retention and can return `stop_reason: refusal` — pair it with an
  Opus 4.8 fallback.

## Previous configurations

- `google/gemini-2.5-pro` as global default (now the vision lane instead)
- `anthropic/claude-3.5-sonnet` (deprecated, now denylisted family)
- `deepseek/deepseek-r1` as the reasoning-lane primary (until 2026-07-10;
  still the review-profile fallback)

## Mission Alignment

Supports the PRIME DIRECTIVE ($10k/month → $10M in 3 years): cheap lanes
(triage/summary) stay cheap, expensive twins are reserved for the work that
earns it, and one router config means one place to tune spend.
