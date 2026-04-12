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
