# Hooks — Automation & Self-Heal

Hooks fire on lifecycle events to enforce guardrails and trigger recovery. Use `templates/agent-factory/HOOKS_TEMPLATE.json` as a starting point.

## Core hooks
- **pre-commit**: run lint + secret scan; block on violations.
- **post-tool / failure**: capture command, exit code, log tail; attach to recap and handoff.
- **test-fail**: auto-switch to recovery agent, run `/diagnose`, then `/patch` with smallest diff.
- **doc-sync**: after significant changes, regenerate docs/handoffs.
- **deploy-precheck**: run `/schema-guard`, `/ui-audit`, and security scan before deployment steps.

## Matcher examples
- Trigger on filename patterns (`*.sql` → schema guard, `*.tsx` → UI audit).
- Trigger on keywords in task text (`auth`, `jwt` → security hooks; `etl`, `analytics` → data hooks).
- Trigger on exit codes (non-zero test/build → recovery hook).

## Recording
- Persist artifacts to `artifacts/<run-id>/` or CI artifacts.
- Always log: timestamp, hook name, agent name, trigger, commands executed, result.
- Include recap + risk list after recovery to support handoffs.
