# OpenRouter Triage Process

**Status:** Active  
**Workflow:** [`.github/workflows/openrouter-triage.yml`](../.github/workflows/openrouter-triage.yml)  
**Script:** [`scripts/openrouter-triage.js`](../scripts/openrouter-triage.js)

## Policy

- This repository does **not** depend on the paid GitHub Copilot Coding Agent for automation.
- `@Copilot` / `copilot-swe-agent` assignee routing is **not used** in this flow.
- Triage routing is implemented directly through OpenRouter API calls using `OPENROUTER_API_KEY`.
- To opt out of triage, apply label `no-triage`.

## Environment variables

Required:

- `OPENROUTER_API_KEY`
- `GITHUB_TOKEN`
- `GITHUB_REPOSITORY`
- `ISSUE_NUMBER`
- `ISSUE_TITLE`
- `ISSUE_BODY`
- `EVENT_KIND` (`issue` or `pull_request`)

Optional:

- `MODEL` (default: `anthropic/claude-sonnet-4`)

## OpenRouter request / response shape

Request (`POST https://openrouter.ai/api/v1/chat/completions`):

```json
{
  "model": "anthropic/claude-sonnet-4",
  "messages": [
    { "role": "system", "content": "triage instructions" },
    { "role": "user", "content": "issue/pr payload" }
  ],
  "temperature": 0.2
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

Source: [`skills/openrouter-swarms/SKILL.md`](../skills/openrouter-swarms/SKILL.md)

| Task Type | Recommended Model | OpenRouter ID |
|---|---|---|
| Code generation / debugging | Claude Sonnet 4 | `anthropic/claude-sonnet-4` |
| Deep reasoning / architecture | Claude Opus 4 | `anthropic/claude-opus-4` |
| Fast / cheap tasks | Claude Haiku 4.5 | `anthropic/claude-haiku-4-5` |
| Code + physics problems | GitHub GPT-5 Nano | `github/gpt-5-nano` |
| Cell sequencing / biology | GitHub o1 | `github/o1-cell-sequencing` |
| General research | GPT-5 | `openai/gpt-5` |
| Long documents | Gemini 2.5 Pro | `google/gemini-2.5-pro` |
| Code completion (fast) | Codex 5.1 | `openai/codex-5.1` |

## Cost guardrails

- Default model: `anthropic/claude-sonnet-4`.
- Escalate to larger models only when triage requires deep reasoning.
- Keep output concise and actionable.
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
