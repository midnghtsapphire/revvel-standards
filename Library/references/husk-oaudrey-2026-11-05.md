# HUSK → oaudrey pointer — 2026-11-05

Agent: Grok Bot (Audrey-directed via TriageChief). Additive governance pointer only; no deletes; no merges.

## Product

**HUSK** = **HTTP Universal Skill Kernel**.

## Where it lives

| Role | Repo |
| --- | --- |
| HUSK runtime + governance spine | [`midnghtsapphire/oaudrey`](https://github.com/midnghtsapphire/oaudrey) (private) |
| Brand umbrella | [`midnghtsapphire/openaudrey`](https://github.com/midnghtsapphire/openaudrey) |
| Visitor / agent metal rules the oaudrey bot must read | `AGENTS.md` + `VISITING_AGENTS.md` in [`midnghtsapphire/revvel-standards`](https://github.com/midnghtsapphire/revvel-standards) (metal rewrite drafts stay here; see `Library/references/metal-rewrite-2026-11-05.md` when present) |

## Historical pointer only

[`elisymlabs/husk`](https://github.com/elisymlabs/husk) was recorded earlier in `wr/memory/decisions.jsonl` (`topic: husk-integration-requirements`, 2026-10-30) while repo identity was still pending. That pointer is **historical only**. Current home for HUSK runtime + governance spine is **`midnghtsapphire/oaudrey`**.

## Standing constraints (unchanged)

- Never delete: archive-rename with a dated extension only.
- Metal AGENTS / VISITING in revvel-standards remain the visitor rules; oaudrey does not invent a parallel permission set.
- Draft PRs into `daily/YYYY-MM-DD`; agents never merge to `main`.