# Agent Factory — Orchestration Guide

This factory mirrors the AITMPL / Claude Code template stack (agents, commands, settings, hooks, plugins) so the coding agent can swap personas on triggers, reuse `/` commands, and self-heal without manual babysitting.

## Flow
1. **Select base profile**: pick a settings profile and core hooks (pre-task lint, failure capture).
2. **Detect triggers**: watch task text, filenames, and CI output for keywords (see the trigger matrix in `AGENT_FACTORY_STANDARD.md`).
3. **Swap agent**: load the target agent frontmatter (from `templates/agent-factory/AGENT_TEMPLATE.md`) and replay the context kit.
4. **Run command stack**: attach the mapped `/` commands for that agent (see `agent-factory/commands/README.md`).
5. **Self-heal**: if a command fails, hooks route to the recovery agent, capture logs, and re-run with a stricter checklist.
6. **Recap and handoff**: emit a recap + risk list and store it with the handoff template.

## Files to edit first
- `agent-factory/settings/README.md` — pick security/tooling limits.
- `agent-factory/hooks/README.md` — wire failure and compliance hooks.
- `agent-factory/commands/README.md` — register the `/` commands and triggers.
- `agent-factory/plugins/README.md` — bundle a client- or project-specific pack.
- `templates/agent-factory/*` — copy/paste-ready templates for each component.

## Self-healing in practice
- Use the recovery agent for any non-zero exit; run `/diagnose` then `/patch`.
- Hooks must capture the failing command, exit code, and log tail; store under `artifacts/` or CI artifacts.
- After recovery, rerun only the impacted checks (lint/test/build scope) before swapping back.
- Read and append to [`agent-factory/learnings.md`](./learnings.md) — the Goap Agent Memory & Self-Healing Log — on every autonomous run so the swarm never repeats the same mistake twice.

## Governance
- Settings define guardrails (tool allowlist, network limits, redaction rules).
- Hooks enforce compliance (secret scan, license scan, dependency policy) before allowlisting a change.
- Plugins package those guardrails so teams can roll them out consistently.
