# Commands — Triggered Actions

Commands are `/` actions the coding agent can call alongside an agent swap. Define them in Markdown (Claude Code style) using `templates/agent-factory/COMMAND_TEMPLATE.md`, then register triggers here.

## Recommended command set
- `/bootstrap-agent` — Create a new agent file from the template with frontmatter filled.
- `/swap-agent` — Persist context kit, switch to target agent, replay context.
- `/diagnose` — Collect logs, failing command, env snapshot; attach to recap.
- `/patch` — Apply smallest fix that makes tests green; keep diff focused.
- `/doc-sync` — Generate or refresh docs/handoffs for the current agent.
- `/pipeline-fix` — Inspect CI logs, propose reruns, and auto-patch config.
- `/schema-guard` — Validate DB/schema diffs; block unsafe migrations.
- `/ui-audit` — Run accessibility and visual guardrails before merging.

## Trigger mapping (sample)
| Trigger | Commands |
| --- | --- |
| `api`, `backend`, `sql` | `/bootstrap-agent` → `/schema-guard` → `/diagnose` on failure |
| `ui`, `frontend`, `design` | `/swap-agent` → `/ui-audit` → `/doc-sync` |
| `security`, `auth`, `jwt` | `/swap-agent` → `/schema-guard` (security mode) → `/diagnose` on failure |
| `ci`, `deploy`, `docker` | `/pipeline-fix` → `/diagnose` if build fails |
| `docs`, `handoff` | `/doc-sync` → `/swap-agent` to documentation persona |

## Usage rules
- Keep commands idempotent and narrow in scope.
- Pair each command with expected inputs/outputs and tooling allowlist.
- Prefer running commands through hooks when tied to lifecycle events (pre-commit, post-test).

## Grok API Navigator — added 2026-11-12

Use `/persona grokapi <task>` in a human-authored issue or PR comment. The existing generic `/persona` workflow filter and runner resolve this specialist through `scripts/openrouter-personas.js`; no new workflow or secret is introduced. Aliases also work in the generic form: `/persona grok-api`, `/persona xai-api`, `/persona grok-demo`, and `/persona grok-test`.

Provider-specific dispatch words are `Grok API`, `xAI API`, `XAI_API_KEY`, `api.x.ai`, `grok-4.7`, and `xai-sdk`. Streaming, JSON Schema, function calling, web/X search, vision and HTTP failure words qualify only with Grok/xAI context. Natural-language keywords are Agent Factory routing metadata, not independent GitHub event listeners. Generic `api`, `auth`, `token`, the unrelated provider `Groq`, and bare `Grok` without API context do not select this specialist.

Read the [profile](../../docs/agents/grokapi/PROFILE.md) and [invocation guide](../../docs/agents/grokapi/README.md). Registration is on assignment and does not call xAI. Execution requires the existing workflow switches/spend gate and appropriate provider credentials; the persona runtime stays on the existing routed `repo_surgery` profile. The tested starter kit is [midnghtsapphire/grok-api-demo](https://github.com/midnghtsapphire/grok-api-demo).
