# OpenRouter Execution Contract

## Purpose

This contract defines the required self-heal behavior for OpenRouter-driven automation across workflows.

## Required self-heal packet

On any auto-recovery event, workflows must emit a standardized contract payload through:

- `scripts/self-heal-contract.js`

Minimum fields:

- `component`
- `repository`
- `issue_number` (when applicable)
- `workflow`
- `run_id`
- `incident.error`
- `incident.action_taken`
- `verification.method`
- `escalation.on_failure`

## Closed-loop verification policy

Any rerun/retry action must include verification that a new workflow run actually started.

Required verification backoff windows:

- 5s
- 10s
- 20s
- 30s

If verification fails, the workflow must:

1. Emit a self-heal contract payload.
2. Open or update a `needs-human`-labeled issue with actionable context.

## Routing policy

GitHub-visible routing account for OpenRouter-first lanes is `@oaudrey`.
Do not route automation to `@Copilot` in this repository.

## SLO reporting

Self-heal dashboards must publish:

- MTTR
- Retry success rate
- Repeated failure signatures
- Oldest stuck-item age
