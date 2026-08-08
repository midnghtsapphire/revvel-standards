# BNAT Knowledge Sheaf Learning Record

**Date:** 2026-08-03
**Context:** WR-MOTU-BNAT-SHEAF opened to establish the formal MOTU BNAT Knowledge Sheaf standard and documentation.

## Record of Truth

The geometric invariant, specifically the Sheaf Laplacian energy $E(x)$ and the $H^1$ obstruction tracking over the fleet's topological network, is now formalized as part of the Single Source of Truth (SSOT).

This update codifies the "imprint-at-spawn" rule for all agents, ensuring that no WR assignment or high-blast PR may proceed when the fleet is in a state of topological obstruction ($E(x) > \varepsilon$). The rule ties seamlessly into the V.E.I.N.S. Grounding Gate, dictating that a failed verifier section (e.g., CI failures, test breaks) definitively prevents the gluing of the global state.

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
