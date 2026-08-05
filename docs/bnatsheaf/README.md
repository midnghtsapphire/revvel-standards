# BNAT Knowledge Sheaf — Mathematical Sheaf Consistency for the Fleet

WR-16893. This directory documents the **BNAT sheaf** layer: mathematical
sheaf consistency, persistent sheaf cohomology, and imprint-at-spawn built
**strictly additively** on top of the existing BIOME sheaf metaphor
(`scripts/biome/sheaf.js` + `docs/biome/biome-status.json`).

## Contents

- [`MOTU_MASTER_PROMPT.md`](./MOTU_MASTER_PROMPT.md) — full MOTU master
  prompt with dual (algebraic + chemistry/cognitive) embedding language.
- [`NSD_EXPLORATION.md`](./NSD_EXPLORATION.md) — sheaf neural networks
  (Neural Sheaf Diffusion) follow-on exploration.
- [`../../standards/BNAT_SHEAF_STANDARD.md`](../../standards/BNAT_SHEAF_STANDARD.md)
  — the binding standard (H¹ ≈ 0 hard rule, imprint-at-spawn, escalation).
- [`../../skills/bnatsheaf/SKILL.md`](../../skills/bnatsheaf/SKILL.md) —
  first-class skill every agent loads to inherit the invariant.

## The mathematics, briefly

BIOME already glues local worker status sections into a global section —
a metaphorical sheaf. BNAT makes that geometry rigorous:

| Concept | Implementation |
| --- | --- |
| Cellular / Čech sheaf of knowledge & agent state | `scripts/bnatsheaf/sheaf.js` (`CellularSheaf`) |
| Restriction maps | per-edge linear maps `ru`/`rv` (identity by default) |
| Sheaf Laplacian energy E(x) | `laplacianEnergy()` — E(x) = Σₑ ‖Rᵤxᵤ − Rᵥxᵥ‖² |
| H¹ obstruction detection + transition patches | `h1Obstructions(ε)` |
| Persistent homology barcodes | `scripts/bnatsheaf/persistence.js` (`computeBarcodes`) |
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
```

Exit codes reflect the **postcondition** (consistency holds), not process
completion — per `CLAUDE.md` gotcha #6.

## Language note (pure JS vs pure Python)

The WR sketch suggested a pure-Python module. This repository's runtime,
test gate (`npm test`), CI, and the BIOME sheaf itself are all Node, so the
implementation is pure dependency-free JavaScript — the invariant is
enforced by the exact same gate every PR already runs. The mathematics is
identical.

## Secrets

MOTU Lead (Grok) access uses `XAI_API_KEY` (alias `GROK_API_KEY`) — names
documented in `.env.example` with the Vault path
`revvel/shared/llm/xai`. GitHub Actions inject secrets as environment
variables; no special bidirectional protocol is needed.
## MOTU BNAT Knowledge Sheaf

This directory contains the core documentation and standard foundation for the MOTU BNAT (Biomimetic Networked Agent Topology) Knowledge Sheaf.

## Overview

The BNAT Knowledge Sheaf is the connective tissue for our multi-agent fleet. It maps localized operational state from individual workers into a globally consistent topological structure—a cellular sheaf. When there is conflict between localized states (a non-zero $H^1$ obstruction or elevated Sheaf Laplacian energy $E(x)$), the sheaf provides a formal mathematical mechanism for detecting the misalignment and preventing destructive actions across the network.

For a living, operational example of this topological gluing in action, see the BIOME sheaf implementation:

- Code: [`scripts/biome/sheaf.js`](../../scripts/biome/sheaf.js)
- Feed: [`docs/biome/biome-status.json`](../../docs/biome/biome-status.json)

## Imprint-At-Spawn Rule

To maintain topological consistency across all transient and visiting agents, we enforce the **imprint-at-spawn** rule:

> All agents, including transient and visiting ones, must restrict their initial worldview from the Knowledge Sheaf prior to beginning work. They must execute `python3 bnatsheaf/scripts/imprint_agent.py` to assert topological consistency (H^1 ≈ 0) at startup.

If the knowledge sheaf indicates an obstruction ($E(x) > \\varepsilon$), the agent is structurally barred from beginning execution on high-blast PRs or adopting complex assignments until the fleet converges to consensus.
