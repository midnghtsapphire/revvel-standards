# BNAT Knowledge Sheaf — Mathematical Sheaf Consistency for the Fleet

WR-16893 / WR-16909. This directory documents the **BNAT sheaf** layer:
mathematical sheaf consistency, sheaf cohomology proofs, persistent homology,
and imprint-at-spawn built **strictly additively** on top of the existing BIOME
sheaf metaphor (`scripts/biome/sheaf.js` + `docs/biome/biome-status.json`).

## Contents

| Doc | Purpose |
| --- | --- |
| [`SHEAF_COHOMOLOGY_PROOFS.md`](./SHEAF_COHOMOLOGY_PROOFS.md) | Short proofs of H⁰, H¹, rank-nullity, energy; BIOME mapping |
| [`PERSISTENT_HOMOLOGY_TOOLS.md`](./PERSISTENT_HOMOLOGY_TOOLS.md) | Tool matrix (native / Ripser / GUDHI) + credit-free decision |
| [`MOTU_MASTER_PROMPT.md`](./MOTU_MASTER_PROMPT.md) | MOTU master prompt (algebraic + chemistry/cognitive dual language) |
| [`NSD_EXPLORATION.md`](./NSD_EXPLORATION.md) | Neural Sheaf Diffusion follow-on (offline learnable restrictions) |
| [`BNAT_SHEAF_STANDARD.md`](./BNAT_SHEAF_STANDARD.md) | Local copy pointer — binding standard is `standards/BNAT_SHEAF_STANDARD.md` |
| [`../../standards/BNAT_SHEAF_STANDARD.md`](../../standards/BNAT_SHEAF_STANDARD.md) | Binding standard (H¹ ≈ 0 hard rule, imprint-at-spawn, escalation) |
| [`../../skills/bnatsheaf/SKILL.md`](../../skills/bnatsheaf/SKILL.md) | First-class skill every agent loads to inherit the invariant |
| [`../../products/bnat-sheaf-observatory/`](../../products/bnat-sheaf-observatory/) | Interactive observatory app (proof table + live energy) |

## The mathematics, briefly

BIOME already glues local worker status sections into a global section — a
metaphorical sheaf. BNAT makes that geometry rigorous:

| Concept | Implementation |
| --- | --- |
| Cellular sheaf of knowledge and agent state | `scripts/bnatsheaf/sheaf.js` (`CellularSheaf`) |
| Coboundary δ, H⁰/H¹, rank-nullity | `scripts/bnatsheaf/cohomology.js` |
| Restriction maps | per-edge linear maps `ru`/`rv` (identity by default) |
| Sheaf Laplacian energy E(x) | `laplacianEnergy()` — E(x) = Σₑ ‖Rᵤxᵤ − Rᵥxᵥ‖² |
| H¹ obstruction + transition patches | `h1Obstructions(ε)` |
| Persistent homology barcodes | `scripts/bnatsheaf/persistence.js` |
| Optional TDA backends (fallback native) | `scripts/bnatsheaf/tda_adapters.js` |
| Discrete Neural Sheaf Diffusion | `scripts/bnatsheaf/nsd.js` |
| Topological fingerprint | `scripts/bnatsheaf/fingerprint.js` |
| Imprint-at-spawn | `scripts/bnatsheaf/cli.js imprint_agent --agent <name>` |

A **global section** exists exactly when every overlap agrees:
`E(x) = 0 ⇔ x ∈ H⁰`. Positive energy localizes the obstruction — the
computational shadow of `H¹` — on named edges, together with the
**transition patch** that would glue them. A sheaf that always produces a
global section is not a sheaf — it is a rubber stamp
(`wr/pending/14-veins-grounding-gate.md`).

## Persistent sheaf cohomology

Filtration weight of each worker-pair edge = the Laplacian energy of its
disagreement. Sweeping the threshold upward yields:

- **H⁰ barcodes** — components merging (union-find, elder rule).
- **H¹ barcodes** — cycles. Graphs have no 2-cells, so H¹ bars never die on
  their own: **every positive-birth H¹ bar must be explicitly killed
  (resolved) or escalated — never silently glued.**

`node scripts/bnatsheaf/cli.js ph_monitor --min-lifetime 0.5` exits non-zero
whenever a persistent obstruction exists.

## Harness commands

```bash
# After any Learn / learning-file write: assert E(x) < ε
node scripts/bnatsheaf/cli.js consistency_check --epsilon 1e-9

# Before any agent starts work: restrict + verify H¹ ≈ 0
node scripts/bnatsheaf/cli.js imprint_agent --agent sentinel

# Watch barcodes; fail on long-lived H¹ bars
node scripts/bnatsheaf/cli.js ph_monitor --min-lifetime 0.5

# Rank-nullity H⁰/H¹ summary (executable proofs)
node scripts/bnatsheaf/cli.js cohomology

# Topological fingerprint companion file (BIOME schema untouched)
node scripts/bnatsheaf/cli.js fingerprint --out docs/biome/bnat-fingerprint.json
```

Exit codes reflect the **postcondition** (consistency holds), not process
completion — per `CLAUDE.md` gotcha #6.

## Language note (pure JS vs pure Python)

The WR sketch suggested a pure-Python module. This repository's runtime,
test gate (`npm test`), CI, and the BIOME sheaf itself are all Node, so the
implementation is pure dependency-free JavaScript — the invariant is
enforced by the exact same gate every PR already runs. The mathematics is
identical. Optional Python TDA tools (Ripser.py, GUDHI) remain offline-only
via the adapter survey in `PERSISTENT_HOMOLOGY_TOOLS.md`.

## Secrets

MOTU Lead (Grok) access uses `XAI_API_KEY` (alias `GROK_API_KEY`) — names
documented in `.env.example` with the Vault path `revvel/shared/llm/xai`.
GitHub Actions inject secrets as environment variables; no special
bidirectional protocol is needed. The core BNAT path is credit-free and
needs no LLM key.

## Imprint-at-spawn rule

> All agents, including transient and visiting ones, must restrict their
> initial worldview from the Knowledge Sheaf prior to beginning work:
>
> ```bash
> node scripts/bnatsheaf/cli.js imprint_agent --agent <name>
> ```
>
> Assert topological consistency (H¹ ≈ 0 / E(x) < ε) at startup. If the
> knowledge sheaf indicates an obstruction, the agent is structurally barred
> from high-blast PRs until the fleet converges.
