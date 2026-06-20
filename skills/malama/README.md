# Mālama 🌺 — the open self-evolving agent engine

> *Mālama* (Hawaiian): **to care for, to steward, to maintain.**

Mālama is a small, model-agnostic operating constitution for an autonomous
engineering agent. It plans, executes in verifiable steps, recovers from its own
failures, rewrites its own tactics to improve, and remembers what it learned
between sessions — without inventing results.

It is the **open core** of [**oAudrey**](https://oaudrey.com), the automation hub
from **Freedom Angel Corp**. Self-host Mālama free, or let oAudrey host and run
it for you.

**oAudrey runs on the Mālama engine.**

---

## What's here

| File | What it is |
|---|---|
| [`SYSTEM_PROMPT.md`](./SYSTEM_PROMPT.md) | The drop-in master prompt (paste into any agent runtime / `CLAUDE.md`) |
| [`SKILL.md`](./SKILL.md) | The skill spec — control loop, self-modification, honesty rules |
| [`malama.skill.yml`](./malama.skill.yml) | Machine-readable skill config |
| [`LICENSE`](./LICENSE) | AGPL-3.0-or-later |

## Quickstart

Drop the fenced block from [`SYSTEM_PROMPT.md`](./SYSTEM_PROMPT.md) into your
agent's system prompt (or a `CLAUDE.md`). That's it — the agent now runs the
Mālama loop: **Plan → Act → Verify → Learn**, with full self-modification and a
`learnings.md` memory ledger.

## What makes it different

- **Self-evolving, not just self-healing** — the agent may rewrite its own
  tactics block to get better, while its identity and the honesty rule stay put.
- **Honest by construction** — it is explicitly forbidden from fabricating
  metrics, citations, or success rates. (That rule exists *because* it was
  distilled from a design that over-claimed; Mālama keeps the engineering and
  drops the fiction.)
- **Mission-linked** — a percentage of every paid oAudrey plan funds
  trafficking-survivor reskilling, recovery, and restoration via Freedom Angel
  Fighters.

## License

**AGPL-3.0-or-later.** Free to use, modify, and self-host. If you run a modified
version as a network service, you must publish your source. See
[`LICENSE`](./LICENSE). The oAudrey hosted product and its vertical agents are
proprietary to Freedom Angel Corp.

— © 2026 Audrey Evans / Freedom Angel Corp · `angelreporters@gmail.com`
