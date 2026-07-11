# Devin Reminders — self-heal, recursive code, and code-review loops

Workflow: `.github/workflows/devin-reminders.yml` (WR #15675)

A single scheduled workflow that lets automation (or a human) schedule,
list, cancel, and fire reminders for **Devin.ai sessions** using
[`aaronsteers/devin-reminders-action`](https://github.com/aaronsteers/devin-reminders-action)
(pinned to the v0.5.0 commit SHA per
`docs/THIRD_PARTY_ACTION_AUDIT.md`). A reminder is a message delivered to an
existing Devin session via the Devin API at a scheduled time — which is
exactly the primitive needed to keep an otherwise-idle session iterating.

## Why this exists

Devin sessions stop when their initial prompt is exhausted. Reminders turn
one-shot sessions into loops:

1. **Self-healing loop** — when a healing workflow (e.g. `self-healing.yml`,
   `agent-monitor.yml`) hands a `[SELF-HEAL]` / `[AGENT-FAILURE]` item to a
   Devin session, schedule a reminder ~2 hours out: *"Re-check workflow run
   history; if the failure recurred, continue healing; otherwise close out
   the issue."* If the fix didn't stick, Devin picks the thread back up
   without a human noticing the regression first.
2. **Recursive-code loop** — for multi-layered builds, end each session
   prompt with a scheduled reminder that asks Devin to evaluate its own
   termination condition: *"If tests are green and the checklist in the PR
   description is complete, stop and request review. Otherwise do the next
   checklist item and schedule the next reminder."* The **3-day maximum
   horizon** enforced by the action is the built-in guard against infinite
   recursion — a loop cannot re-arm itself indefinitely without each
   iteration passing a fresh due-time check.
3. **Code-review loop** — after opening a PR, schedule a reminder for the
   session that asks Devin to re-review once CI and other reviewers
   (`devin-ai-integration[bot]`, Octopus, Copilot) have commented. Per
   `docs/agent-stack/DEVIN_OBSERVATIONS.md`, always verify Devin's
   "✅ Resolved" claims against the actual diff — Devin has hallucinated
   commit SHAs at least once (#14436).

## Scheduling a reminder from automation

Any workflow or agent with `actions: write` can arm a reminder:

```bash
gh workflow run devin-reminders.yml \
  --repo midnghtsapphire/revvel-standards \
  -f action=put \
  -f remind_at="2026-07-12T17:00:00+00:00" \
  -f reminder_message="Re-check run history for workflow X; continue healing if red." \
  -f agent_session_url="https://app.devin.ai/sessions/<session-id>"
```

Other operations: `-f action=list`, `-f action=cancel` (with
`-f agent_session_url=... -f cancel_guids='["guid-1"]'`), and
`-f action=cron` (force-fire due reminders now). The scheduled cron fires
due reminders every 30 minutes on its own.

## Secrets and configuration

| Name | Kind | Required | Notes |
| --- | --- | --- | --- |
| `DEVIN_API_KEY` | secret | Yes | Repo-standard Devin token name (`config/connections.yml`). If missing, every job is skipped by the `gate` job — the cron never goes red. |
| `SLACK_BOT_TOKEN` | secret | No | Only used when the Slack channel variable is set. |
| `DEVIN_REMINDERS_SLACK_CHANNEL` | variable | No | Slack channel for notifications; leave unset to skip Slack entirely. |

```bash
gh secret set DEVIN_API_KEY --repo midnghtsapphire/revvel-standards
```

## Gotchas (read before editing the workflow)

- **Single-file constraint.** Reminders are stored in a GitHub Actions
  artifact (`devin-reminders-list`), and workflows can only upload artifacts
  to their *own* runs. All four actions (put/list/cancel/cron) must stay in
  `devin-reminders.yml`. Splitting them across files silently breaks
  storage — reminders would never fire.
- **3-day horizon / 4-day retention.** `remind-at` must be in the future and
  ≤ 3 days ahead; the storage artifact expires after 4 days. Longer-range
  follow-ups belong in the issue tracker, not here.
- **Race protection.** The action's `lock-mode: auto` takes an
  artifact-based mutex on put/cancel/cron, and the workflow adds a
  `concurrency` group so overlapping runs queue instead of clobbering the
  list.
- **Token failures look like silence.** A missing/expired `DEVIN_API_KEY`
  yields Devin API `401/403`, not a delivered reminder. If reminders "stop
  firing," check the secret and the gate-job notice in the run log first —
  same triage pattern as the OpenRouter key gotcha in `AGENTS.md`.
- **Failure-spam guard.** The `gate` job skips everything when the secret is
  unset so the 30-minute cron cannot flood `agent-monitor.yml` with
  `[AGENT-FAILURE]` issues in forks or before setup.

## Tests

`tests/devin-reminders-workflow.test.js` locks in the invariants above
(single file contains all four actions, SHA-pinned action ref, secret gate,
concurrency group, no untrusted event interpolation in `run:` blocks). Run:

```bash
node --test tests/devin-reminders-workflow.test.js
```
