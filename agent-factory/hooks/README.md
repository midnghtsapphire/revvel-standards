# Hooks — Automation & Self-Heal

Hooks fire on lifecycle events to enforce guardrails and trigger recovery. Use `templates/agent-factory/HOOKS_TEMPLATE.json` as a starting point.

## Core hooks
- **pre-commit**: run lint + secret scan; block on violations.
- **post-tool / failure**: capture command, exit code, log tail; attach to recap and handoff.
- **test-fail**: auto-switch to recovery agent, run `/diagnose`, then `/patch` with smallest diff.
- **doc-sync**: after significant changes, regenerate docs/handoffs.
- **deploy-precheck**: run `/schema-guard`, `/ui-audit`, and security scan before deployment steps.
- **on-failure-append-learning**: on any non-zero exit, automatically append a structured entry to `agent-factory/learnings.md` so failures are captured without manual effort. See `on-failure-append-learning.sh`.

## Matcher examples
- Trigger on filename patterns (`*.sql` → schema guard, `*.tsx` → UI audit).
- Trigger on keywords in task text (`auth`, `jwt` → security hooks; `etl`, `analytics` → data hooks).
- Trigger on exit codes (non-zero test/build → recovery hook).

## Recording
- Persist artifacts to `artifacts/<run-id>/` or CI artifacts.
- Always log: timestamp, hook name, agent name, trigger, commands executed, result.
- Include recap + risk list after recovery to support handoffs.

## Wiring on-failure-append-learning

Call `on-failure-append-learning.sh` from any `post-command` or `test-fail` hook that fires on non-zero exit. Pass context via environment variables:

```bash
some-command-that-may-fail
EXIT_CODE=$?   # capture immediately after the command

AGENT_NAME="Goap" \
TASK_ATTEMPTED="deploy to staging" \
EXIT_CODE="$EXIT_CODE" \
LOG_TAIL="$(tail -20 run.log)" \
bash agent-factory/hooks/on-failure-append-learning.sh
```

Required: `AGENT_NAME`, `TASK_ATTEMPTED`, `EXIT_CODE`.  
Optional: `LOG_TAIL` (appended verbatim), `ROOT_CAUSE`, `SELF_HEALING_FIX`, `NEXT_ACTION` (defaults are filled in automatically when omitted).  
The script resolves `learnings.md` relative to the repo root, so it works from any working directory.
