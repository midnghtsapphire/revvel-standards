# Spec 01 — Quiet Mode

Quiet Mode is the default operating state.

> **Note**: For common questions about what "exit-quiet-mode" does, see [01-quiet-mode-FAQ.md](./01-quiet-mode-FAQ.md)

## Default behavior
- Quiet Mode is ON unless an open issue titled `exit-quiet-mode` exists.
- Every cron/workflow must check for that open issue before doing work.
- If absent, exit cleanly with: `echo "Quiet Mode active; skipping"`.

## Enter / exit signals
- Open issue `exit-quiet-mode` to wake gated workflows.
- Open issue `enter-quiet-mode` to re-enter Quiet Mode.
- When `enter-quiet-mode` opens, the open `exit-quiet-mode` issue is auto-closed.

## Proposal hibernation
- Three consecutive 👎 reactions on agent proposals trigger a 7-day hibernation.
- During hibernation, proposal agents stop creating new proposals.

## Exception
- Compliance Watcher is the only cron allowed to pierce Quiet Mode.
