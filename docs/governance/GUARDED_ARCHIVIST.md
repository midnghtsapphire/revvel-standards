# Guarded Archivist (metal, 2026-11-05)

**Diffs only into memory / rules.** Live LLMs do not write storage directly.

## Rules

1. Memory and standards updates land as **reviewed diffs** (draft PR), never silent overwrite.
2. Isolate the live model from durable stores: propose a patch → gate → merge by owner.
3. Prefer append / comment-out / `Archive/YYYY-MM-DD/` rename over rewrite-in-place.
4. Same commit: `CHANGELOG.md` (+ `LEDGER.md` if present) and `Library/` source notes.

Source diagram: Next-Gen AI-Architected GitHub Infrastructure (Tier 2 — Guarded Archivist). Notes: `Library/references/metal-rewrite-2026-11-05.md`.
