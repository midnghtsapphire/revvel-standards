# Visiting LLMs forget the rules

Cross-tool note. Not a tool entry.

## Audrey's verdicts, 2026-11-11

- Visiting LLMs forget her rules, even with sticky-note reminders. No matter how
  much she tells them not to, they forget. This has been a point of failure
  through her whole history.
- Orchestrator agents she set up (for example in Manus) kept writing code
  after being told not to. See [manus.md](manus.md).

## What the repo shows

- `AGENTS.md`, section "Orchestrator discipline" (commit 1c26a4ee6, 2026-06-14),
  is written as a sticky note: "Re-read this section." It says everyone forgets
  this under load and the reminder is what snaps the behavior back.
- brain-dump#4 (open, 2026-10-30) asks to investigate Claude agents reversing
  never-delete rules. The transcript is not attached yet.
- `docs/neurooz/AGENT_SHIPPING_FAILURE_ANALYSIS.md` records repeated failures of
  AI coding agents (Claude, GPT, Manus, OpenHands, Cursor, Copilot) to deliver
  complete apps.
- `standards/AGENT_SCAFFOLDING_BAN.md` and `scripts/agent-fingerprint-scan.js`
  already enforce a ban on agent watermarks by check, not by memory.

## What enforces it now

Her preference is rules enforced by checks, not memory. The visiting-agent rule
check was added with this log: `node scripts/visiting-agent-scan.js`. It flags
tracking, marketing, affiliate, and agent-branding strings in app code. See
[`VISITING_AGENTS.md`](../../VISITING_AGENTS.md) section 1b.

## Evidence

- [AGENTS.md orchestrator discipline](../../AGENTS.md)
- [Agent scaffolding ban](../../standards/AGENT_SCAFFOLDING_BAN.md)
- [Agent shipping failure analysis](../neurooz/AGENT_SHIPPING_FAILURE_ANALYSIS.md)
- [brain-dump#4](https://github.com/Freedom-Angel-Corp/brain-dump/issues/4)
