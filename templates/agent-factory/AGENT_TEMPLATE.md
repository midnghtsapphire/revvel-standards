---
name: "<agent-name>"
role: "<domain role, e.g., Frontend Engineer>"
models:
  primary: "<model id>"
  fallback: "<model id>"
tools:
  allow: ["shell", "node", "docker"]
  deny: ["network"] # toggle per profile
settings_profile: "<default settings profile>"
inputs: ["task", "recent_logs", "repo_map"]
outputs: ["planned_commands", "recap", "risks", "artifacts"]
handoff_expectations:
  recap: true
  next_actions: true
  risks: true
---

# Purpose
- What this agent owns and when to trigger it.

## Operating Protocol
1. Confirm triggers and scope.
2. Load context kit (task, constraints, decisions, risks, tests to run).
3. Plan: list smallest command stack to finish.
4. Execute: run commands; log artifacts.
5. Verify: rerun targeted tests/linters.
6. Recap: decisions, diffs, risks, next steps.

## Trigger Words
- e.g., `react`, `tailwind`, `ui`, `storybook`.

## Guardrails
- Security posture, network rules, timeouts, redaction notes.

## Tools
- Allowed tools and how to use them safely.

## Handoff Checklist
- [ ] Recap complete
- [ ] Risks listed
- [ ] Tests rerun (list)
- [ ] Artifacts linked
