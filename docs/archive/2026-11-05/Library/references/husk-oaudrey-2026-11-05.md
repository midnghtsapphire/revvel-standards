> **Archived 2026-11-05.** Kernel renamed HUSK → HULL per Audrey via Proofy: "HULL for the METAL kernel". This is the pre-rename snapshot of `Library/references/husk-oaudrey-2026-11-05.md`, archive-renamed (not deleted, not git-rm). It is not the canonical pointer. Canonical pointer: `Library/references/hull-oaudrey-2026-11-05.md`. Public product name stays METAL. Home repo stays `midnghtsapphire/oaudrey`.

# METAL (public) / HUSK (kernel) → oaudrey pointer — 2026-11-05

Agent: Grok Bot (Audrey-directed via TriageChief). Additive governance pointer only; no deletes; no merges.

## Product

- **METAL** = public product name (Audrey's pick, 2026-11-05).
- **HUSK** = **HTTP Universal Skill Kernel**, the kernel underneath METAL.
- Home repo for both: `midnghtsapphire/oaudrey` (unchanged).

## Where it lives

| Role | Repo |
| --- | --- |
| METAL / HUSK runtime + governance spine | [`midnghtsapphire/oaudrey`](https://github.com/midnghtsapphire/oaudrey) (private) |
| Brand umbrella | [`midnghtsapphire/openaudrey`](https://github.com/midnghtsapphire/openaudrey) |
| Visitor / agent metal rules the oaudrey bot must read | `AGENTS.md` + `VISITING_AGENTS.md` in [`midnghtsapphire/revvel-standards`](https://github.com/midnghtsapphire/revvel-standards) (metal rewrite drafts stay here; see `Library/references/metal-rewrite-2026-11-05.md` when present) |

## Naming note: "metal" in standards drafts

The lowercase "metal" in `AGENTS.md` / `MASTER.md` / `VISITING_AGENTS.md` (draft #18263, "metal rewrite", "metal spine") is a **style descriptor** (terse, less wordy), not a product claim. The product name is **METAL** (public) with **HUSK** as the kernel; this file is the canonical pointer.

## Historical pointer only

[`elisymlabs/husk`](https://github.com/elisymlabs/husk) was recorded earlier in `wr/memory/decisions.jsonl` (`topic: husk-integration-requirements`, 2026-10-30) while repo identity was still pending. That pointer is **historical only**. Current home for HUSK runtime + governance spine is **`midnghtsapphire/oaudrey`**.

## Standing constraints (unchanged)

- Never delete: archive-rename with a dated extension only.
- Metal AGENTS / VISITING in revvel-standards remain the visitor rules; oaudrey does not invent a parallel permission set.
- Draft PRs into `daily/YYYY-MM-DD`; agents never merge to `main`.
