# Agent Factory Standard

Design a reusable **Agent Factory** that behaves like a skill: the coding agent can swap in the right specialist automatically, route work by trigger words, and self-heal when a run stalls. The factory aligns with Claude Code templates (agents, commands, settings, hooks, plugins) so the same scaffolding works across repos.

## Principles
- **Trigger-first routing**: map keywords, file types, and build failures to target agents or command packs.
- **Cognitive scaffolding**: every agent ships with its own goals, guardrails, tool access, and recap cadence; the factory preserves and reloads that state on swap.
- **Self-healing loop**: detect failure → capture context → switch to the recovery agent → retry with tighter checks → escalate only with evidence.
- **Composable bundles**: treat commands, settings, hooks, and plugins as swappable modules so teams can assemble the right kit per project.

## Directory Layout
- `agent-factory/README.md` — orchestration flow and usage.
- `agent-factory/commands/README.md` — how to author `/` commands and pair them with agents.
- `agent-factory/settings/README.md` — security, tooling, and memory profiles.
- `agent-factory/hooks/README.md` — lifecycle automations for self-heal and governance.
- `agent-factory/plugins/README.md` — bundling agents + commands + hooks into reusable packs.
- `templates/agent-factory/*` — drop-in templates for agents, commands, settings, hooks, and plugins (AITMPL/Claude-compatible).

## Coding Agent Trigger Matrix
| Trigger | Route To | Action |
| --- | --- | --- |
| `api`, `backend`, `fastapi`, `express`, `supabase` | Backend agent | Swap to backend agent template; load `/api-scaffold`, `/schema-guard` commands. |
| `vault`, `secret`, `token`, `api key`, `credential`, `mcp credential`, `provision`, `register api` | Vault agent | Spawn ephemeral Vault Agent; run credential check → provision → store in vault → terminate. |
| `ui`, `react`, `next`, `tailwind`, `storybook` | Frontend agent | Swap to frontend agent; run `/ui-audit`, `/accessibility-pass`. |
| `data`, `sql`, `analytics`, `etl` | Data agent | Attach `/model-audit`, `/perf-plan` commands; enforce read-only settings by default. |
| `sec`, `auth`, `jwt`, `vuln`, `owasp` | Security agent | Force secure settings profile; auto-run pre-commit hooks for secrets scan. |
| `ci`, `pipeline`, `docker`, `deploy` | DevOps agent | Load `/pipeline-fix`, `/image-hardening`; enable hooks on build/test failure. |
| `docs`, `runbook`, `handoff` | Documentation agent | Trigger `/doc-sync`, `/handoff-pack`; prefer summarization settings. |
| Failure: tests/build/lint exit non-zero | Recovery agent | Run self-heal hook: collect logs, open incident note, rerun with stricter checklist. |

## Cognitive Scaffolding (per agent)
- **Frontmatter**: `name`, `role`, `models`, `tools`, `inputs`, `outputs`, `handoff_expectations`.
- **Context kit**: problem statement, constraints, recent decisions, open risks, test focus, done/not-done list.
- **Swap protocol**: when a trigger fires, persist context kit → load target agent frontmatter → replay context kit → run warm-up checklist.
- **Recap cadence**: after each major tool use or failure, append to the context kit and persist for the next swap.

## Self-Healing Loop (Ralph Loop)
1. **Detect**: hook catches non-zero exit or flaky run; capture command, exit code, tail logs.
2. **Stabilize**: lock working tree; snapshot state and failing command.
3. **Recover**: swap to the recovery agent template; rerun with `/diagnose` then `/patch` commands.
4. **Verify**: rerun targeted tests/linters; if clean, release lock; if not, escalate with a minimal repro note.
5. **Record**: update the context kit and handoff notes for continuity.

The **Ralph Loop** (`templates/cicd/ralph-loop.yml`) is the CI implementation of this self-healing loop:
- Fires on any workflow failure
- Creates a GitHub Issue labeled `ralph-loop` + `auto-fix` + `copilot` and assigns @copilot
- Adds retry comments with updated context on each subsequent failure (max 5 retries)
- After max retries, re-labels as `needs-human` and escalates to the repository owner

## Actions & Workflows
- **Init**: choose baseline settings profile → register default hooks (pre-commit lint, post-run artifact capture) → install command pack.
- **Auto-route**: parse task text, filenames, and failure logs for triggers; call `swap_agent(trigger)`; execute the mapped command stack.
- **Guardrails**: enforce settings per agent (tool allowlist, network rules, token ceilings, redaction rules).
- **Outputs**: every run emits a recap (decisions, commands used, artifacts, remaining risks) stored with the handoff template.

## How to Use
1. Start from `templates/agent-factory/AGENT_TEMPLATE.md` to author specialists.
2. Add `/` commands with `templates/agent-factory/COMMAND_TEMPLATE.md`; register them in `agent-factory/commands/README.md`.
3. Select a settings profile and hook set from the templates; tune limits per repo.
4. Bundle agents + commands + hooks as a plugin (see `templates/agent-factory/PLUGIN_TEMPLATE.md`) for reuse across projects or clients.
5. Wire the coding agent to honor the trigger matrix and self-heal loop before shipping.

## References
- AITMPL components: agents, commands, settings, hooks, plugins, and templates (`https://www.aitmpl.com/`, `https://docs.aitmpl.com/introduction`).
- Claude Code Templates (`https://github.com/davila7/claude-code-templates`).
- Vault Agent: `VAULT_AGENT_STANDARD.md` · `skills/vault-agent/SKILL.md` · `templates/agent-factory/VAULT_AGENT_TEMPLATE.md`
- Ralph Loop: `templates/cicd/ralph-loop.yml`

---

## [2026-04-15] Reusable Master Prompt (Revvel Standards v2.0.0)

The canonical, copy-paste system prompt that converts any third-party
agent (OpenRouter, Grok, Claude, GPT, DeepSeek, Kimi, etc.) into an
EXRUP-compliant Revvel Standards agent lives at
[`ui/freedom-angel-repo-manager/MASTER_PROMPT.md`](../../ui/freedom-angel-repo-manager/MASTER_PROMPT.md).

It enforces the ten non-negotiable rules — append-only, artifact-first,
auto-documentation, GitHub flow (issue → changes → verification →
reusability), WCAG-AAA + 7-mode accessibility, GitHub API inventory /
audit, Freedom Angel Corp root entity, secrets hygiene, FOSS priority,
and self-heal on CI failure — and defines a fixed output format that
the agent factory can consume without reformatting.

Use it in two ways:

1. **Outside agents** — paste the fenced block from `MASTER_PROMPT.md`
   as the system prompt for any external model.
2. **Agent factory specialists** — reference the master prompt from
   each specialist authored from `templates/agent-factory/AGENT_TEMPLATE.md`
   so that all specialists inherit the same rules and output format.

When the prompt evolves, increment `Version:` at the top of the file,
append prior versions to `## Previous versions`, and log the change in
`CHANGELOG.md`. Never rewrite the historical blocks in place.
