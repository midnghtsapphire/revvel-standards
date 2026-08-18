# MOTU BNAT Knowledge Sheaf

**Status:** Active (WR-16900 / WR-MOTU-BNAT-SHEAF series, PR 1)  
**Companion standard:** [`BNAT_SHEAF_STANDARD.md`](./BNAT_SHEAF_STANDARD.md) ·
[`../../standards/BNAT_SHEAF_STANDARD.md`](../../standards/BNAT_SHEAF_STANDARD.md)  
**Master prompt:** [`MOTU_MASTER_PROMPT.md`](./MOTU_MASTER_PROMPT.md)  
**Skill:** [`../../skills/bnatsheaf/SKILL.md`](../../skills/bnatsheaf/SKILL.md)
WR-16893 / WR-16909. This directory documents the **BNAT sheaf** layer:
mathematical sheaf consistency, sheaf cohomology proofs, persistent homology,
and imprint-at-spawn built **strictly additively** on top of the existing BIOME
sheaf metaphor (`scripts/biome/sheaf.js` + `docs/biome/biome-status.json`).

This directory is the documentation foundation for the **MOTU BNAT Knowledge
Sheaf** — the geometric invariant that keeps the multi-agent fleet coherent.
Everything here is **strictly additive** relative to the living BIOME sheaf.
Do not modify BIOME scripts or behavior from this layer.

## Living example (BIOME sheaf)
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

The BIOME crew already glues local worker status sections into a global
section — a metaphorical sheaf you can inspect right now:

| Artifact | Path |
| --- | --- |
| Glue implementation | [`scripts/biome/sheaf.js`](../../scripts/biome/sheaf.js) |
| Live status feed | [`docs/biome/biome-status.json`](../../docs/biome/biome-status.json) |
| Human-readable status | [`docs/biome/biome-status.html`](../../docs/biome/biome-status.html) |

BNAT elevates that metaphor into mathematics (cellular sheaf, restriction
maps, Sheaf Laplacian energy $E(x)$, $H^1$ obstruction, persistent homology
barcodes) without replacing the feed. The mathematical layer lives at
`scripts/bnatsheaf/` and **reads** the BIOME feed read-only.

## Overview

The BNAT Knowledge Sheaf is the connective tissue for the multi-agent fleet.
It maps localized operational state from individual workers (stalks) into a
globally consistent topological structure — a **cellular sheaf**. When local
states conflict (non-zero $H^1$ obstruction, or elevated Sheaf Laplacian
energy $E(x) > \varepsilon$), the sheaf detects the misalignment and blocks
destructive fleet actions until consensus is restored.
BIOME already glues local worker status sections into a global section — a
metaphorical sheaf. BNAT makes that geometry rigorous:

| Concept | Where it lives |
| --- | --- |
| Cellular / Čech sheaf of knowledge & agent state | `scripts/bnatsheaf/sheaf.js` (`CellularSheaf`) |
| Restriction maps | per-edge linear maps `ru` / `rv` (identity by default) |
| Sheaf Laplacian energy $E(x)$ | `laplacianEnergy()` — $E(x)=\sum_e\|R_u x_u - R_v x_v\|^2$ |
| $H^1$ obstruction + transition patches | `h1Obstructions(\varepsilon)` |
| Persistent homology barcodes | `scripts/bnatsheaf/persistence.js` (`computeBarcodes`) |
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
$E(x)=0 \Leftrightarrow x \in H^0$. Positive energy localizes the obstruction —
the computational shadow of $H^1$ — on named edges, together with the
**transition patch** that would glue them. A sheaf that always produces a
global section is not a sheaf — it is a rubber stamp
([`wr/pending/14-veins-grounding-gate.md`](../../wr/pending/14-veins-grounding-gate.md)).

## Imprint-at-spawn rule

To maintain topological consistency across all transient and visiting agents,
we enforce the **imprint-at-spawn** rule (identity hygiene from
[`AGENTS.md`](../../AGENTS.md) and [`VISITING_AGENTS.md`](../../VISITING_AGENTS.md)
is preserved — each agent keeps its own stalk; gluing means agreeing on
overlaps, not erasing identity):

> Before any agent starts work, it **must** restrict from the global
> Knowledge Sheaf to its own stalk and assert $H^1 \approx 0$:
>
> ```bash
> node scripts/bnatsheaf/cli.js imprint_agent --agent <name>
> ```
>
> If $E(x) > \varepsilon$ (or imprint exits non-zero), the agent is
> structurally barred from high-blast PRs and complex WR assignments until
> the fleet converges.

## Hard Controller rule

> **No WR assignment or high-blast PR is allowed while $E(x) > \varepsilon$.**

This is binding for the MOTU Visiting Controller (see
[`MOTU_MASTER_PROMPT.md`](./MOTU_MASTER_PROMPT.md)).

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

## Contents of this directory
## Language note (pure JS vs pure Python)

The WR sketch suggested a pure-Python module. This repository's runtime,
test gate (`npm test`), CI, and the BIOME sheaf itself are all Node, so the
implementation is pure dependency-free JavaScript — the invariant is
enforced by the exact same gate every PR already runs. The mathematics is
identical. Optional Python TDA tools (Ripser.py, GUDHI) remain offline-only
via the adapter survey in `PERSISTENT_HOMOLOGY_TOOLS.md`.

- [`BNAT_SHEAF_STANDARD.md`](./BNAT_SHEAF_STANDARD.md) — formal definitions
  (cellular sheaf, restriction maps, $E(x)$, $H^1$, barcodes, dual embedding,
  hard Controller rule) and the VEINS grounding-gate companion link.
- [`MOTU_MASTER_PROMPT.md`](./MOTU_MASTER_PROMPT.md) — full MOTU Visiting
  Controller system prompt (dual algebraic + chemistry/cognitive language).
- [`NSD_EXPLORATION.md`](./NSD_EXPLORATION.md) — Neural Sheaf Diffusion
  follow-on design note (non-production).

## Companion WR (VEINS grounding gate)

This foundation **explicitly strengthens**
[`wr/pending/14-veins-grounding-gate.md`](../../wr/pending/14-veins-grounding-gate.md):

1. **Obstruction reporting** — the global section must show `degraded` when
   any stalk conflicts; never paper over $H^1$.
2. **Verifier sections** — suite state, script compile checks, and WR smoke
   runs act as explicit sheaf stalks. A failed verification drives
   $E(x) > \varepsilon$.

## Secrets (names only)

MOTU Lead (Grok / xAI) access uses `XAI_API_KEY` (alias `GROK_API_KEY`).
Placeholders live in [`.env.example`](../../.env.example) with Vault path
`revvel/shared/llm/xai`. Never commit real values.

## Language note

An early WR sketch suggested pure Python. This repository's runtime, test
gate (`npm test`), CI, and BIOME sheaf are Node, so the implementation is
dependency-free JavaScript. The mathematics is identical.

## Series

This is **PR 1** of the WR-MOTU-BNAT-SHEAF series (issue #16900):
documentation and standard foundation only. BIOME behavior is untouched.
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
