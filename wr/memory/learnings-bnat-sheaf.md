# BNAT Knowledge Sheaf — Learning Record

**Date opened:** 2026-08-03  
**Date SSOT sealed (PR 1):** 2026-08-08  
**WR:** WR-MOTU-BNAT-SHEAF / issue #16900  
**Series:** PR 1 — documentation + standard foundation

## Record of truth

The geometric invariant is now part of the Single Source of Truth (SSOT):

- Sheaf Laplacian energy $E(x)$ and $H^1$ obstruction tracking over the
  fleet's topological network are formalized in
  `docs/bnatsheaf/BNAT_SHEAF_STANDARD.md` (and the operational twin
  `standards/BNAT_SHEAF_STANDARD.md`).
- The MOTU Visiting Controller dual-language master prompt lives at
  `docs/bnatsheaf/MOTU_MASTER_PROMPT.md`.
- Overview + imprint-at-spawn + living BIOME links:
  `docs/bnatsheaf/README.md` → `scripts/biome/sheaf.js` +
  `docs/biome/biome-status.json`.
- Full WR body: `wr/WR-MOTU-BNAT-SHEAF.md`.
- MOTU Lead credentials (names only): `XAI_API_KEY` / `GROK_API_KEY` in
  `.env.example` → Vault `revvel/shared/llm/xai`.

## Binding rule

No WR assignment or high-blast PR may proceed while $E(x) > \varepsilon$.
Imprint-at-spawn is mandatory for every agent (including visiting /
transient). The rule ties into the V.E.I.N.S. Grounding Gate
(`wr/pending/14-veins-grounding-gate.md`): a failed verifier section
definitively prevents gluing of the global state. A sheaf that always
produces a global section is a rubber stamp, not a sheaf.

## Why it matters

This is a foundational structural limit against hallucinated successes and
infinite self-healing oscillations. Learning-file writes that raise energy
above $\varepsilon$ are quarantined until the transition patch is applied or
the conflict is escalated. Identity hygiene is preserved: gluing means
agreeing on overlaps, not erasing stalks.

## Additive guarantee

PR 1 does not modify BIOME scripts or behavior. BNAT remains read-only over
the BIOME feed. Subsequent series PRs may extend harness wiring; they must
not silently drop the invariant.
This is a foundational structural limit to prevent hallucinated successes and infinite self-healing oscillations.

---

## 2026-08-08 — WR-16901 Observatory + cohomology groups

**Context:** Issue #16901 requested sheaf cohomology proofs, persistence
diagrams, a simplified HTML shell on the main repository page, and an
investor/employer surface for fleets + workflows.

**Landed (additive only):**

- `scripts/bnatsheaf/cohomology.js` — $H^0\cong\ker\delta$, $H^1\cong\operatorname{coker}\delta$, rank-nullity certificates, synthetic Path/Cycle/Conflict.
- `scripts/bnatsheaf/persistence.js` — `PersistenceDiagram` + topological fingerprint for BIOME-style feeds.
- `scripts/bnatsheaf/nsd.js` — Neural Sheaf Diffusion discrete healing stub (optional).
- `docs/bnatsheaf/observatory.html` — VEINS Topology Lab public shell.
- `docs/bnatsheaf/COHOMOLOGY_PROOFS.md` — formal proof note.
- Hub card + `data/hub/entries/veins-topology-lab.json` (Method · Living Manifold).
- Imprint guidance in `AGENTS.md` + `VISITING_AGENTS.md`.

**Invariant unchanged:** long-lived H¹ bars escalate; BIOME JS untouched.
