# OpenRouter Triage Process

**Status:** Active  
**Workflow:** [`.github/workflows/openrouter-triage.yml`](../.github/workflows/openrouter-triage.yml)  
**Script:** [`scripts/openrouter-triage.js`](../scripts/openrouter-triage.js)

## Policy

- This repository does **not** depend on the paid GitHub Copilot Coding Agent for automation.
- `@Copilot` / `copilot-swe-agent` assignee routing is **not used** in this flow.
- Triage routing is implemented through the `triage` profile in
  [`.github/agent-models.yml`](../.github/agent-models.yml), with non-OpenRouter
  fallbacks when the key is missing or unfunded.
- To opt out of triage, apply label `no-triage`.

## Environment variables

Required:

- `GITHUB_TOKEN`
- `GITHUB_REPOSITORY`
- `ISSUE_NUMBER`
- `ISSUE_TITLE`
- `ISSUE_BODY`
- `EVENT_KIND` (`issue` or `pull_request`)

Optional:

- `OPENROUTER_API_KEY` (enables the OpenRouter lanes; GitHub Models / keyless
  Perplexity / static fallback still run without it)
- `MODEL` (overrides the SSOT triage primary only for emergency operations)
- `MODEL_FALLBACK` (overrides the SSOT triage fallback)
- `MAX_OUTPUT_TOKENS` (default from SSOT triage profile: `1500`)

## OpenRouter request / response shape

Request (`POST https://openrouter.ai/api/v1/chat/completions`):

```json
{
  "models": ["openai/gpt-4o-mini", "anthropic/claude-haiku-4.5"],
  "messages": [
    { "role": "system", "content": "triage instructions" },
    { "role": "user", "content": "issue/pr payload" }
  ],
  "temperature": 0.2,
  "max_tokens": 1500
}
```

Headers:

- `Authorization: Bearer ${OPENROUTER_API_KEY}`
- `HTTP-Referer: https://github.com/<owner>/<repo>`
- `X-Title: <owner>/<repo> OpenRouter Triage`

Response use:

- Reads `choices[0].message.content`
- Posts that content to `POST /repos/{owner}/{repo}/issues/{number}/comments`

## Model selection table

Source: [`.github/agent-models.yml`](../.github/agent-models.yml)

| Lane | Model policy | Cost posture |
|---|---|---|
| OpenRouter SSOT triage | `openai/gpt-4o-mini` → `anthropic/claude-haiku-4.5` | Cheap primary, explicit fallback |
| GitHub Models | `gpt-4o-mini` | Uses `GITHUB_TOKEN`, no OpenRouter spend |
| Keyless Perplexity | `perplexity/sonar` bridge | No API key required |
| OpenRouter free-tier | `OR_FREE_MODELS` env or built-in `:free` list | Cheap, account-dependent |
| OpenRouter backup | Explicit cheap backup models | Last paid lane; no `openrouter/auto` or `openrouter/fusion` |
| Static fallback | Rule-based labels | No LLM spend |

## Cost guardrails

- Default model comes from the SSOT `triage` profile: `openai/gpt-4o-mini`.
- Output is capped at `1500` tokens by default, down from the prior uncapped
  Sonnet request path.
- Triage prompt is intentionally concise: no broad research packet, no repeated
  issue text, and marketing/SEO only when it changes routing.
- Hourly sweep only triages `triage:new` items missing `openrouter`.
- Use `no-triage` to suppress unnecessary calls.

## Failure signals (enhanced error checking)

So no issue or PR sits silently because OpenRouter didn't run, the triage
script [always leaves a visible signal on the item itself](../scripts/openrouter-triage.js)
when it can't complete — you no longer have to dig through Actions logs to
notice that nothing is moving.

| Condition | Comment posted on item | Labels applied |
|---|---|---|
| `OPENROUTER_API_KEY` missing | ⚠️ "OpenRouter triage skipped — key not configured" with operator action | `openrouter:needs-key`, `needs-human` |
| OpenRouter API / network error | ❌ "OpenRouter triage failed" with captured HTTP/error body (truncated to 600 chars) | `openrouter:triage-failed`, `needs-human` |
| Successful re-run after a failure | 🤖 normal triage comment | Failure labels (`openrouter:triage-failed`, `openrouter:needs-key`) are automatically removed |

The workflow run itself still goes red for genuine API failures (so the
Actions UI reflects the problem), while the `needs-key` path exits 0
because it's an operator action, not a bug. Either way, the issue or PR
carries an explicit `needs-human` + `openrouter:*` label pair until the
situation is resolved — which is the signal the hourly cron sweep and
`ralph-loop.yml` rely on to avoid re-hammering a broken route.
