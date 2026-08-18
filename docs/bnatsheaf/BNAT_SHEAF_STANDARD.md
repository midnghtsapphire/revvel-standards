# BNAT Sheaf Standard

**Version:** 1.1.0  
**Status:** Active (WR-16900 — MOTU BNAT Knowledge Sheaf foundation)  
**Scope:** All Revvel agents, fleets, and workflows that read or write the
knowledge sheaf (learning files, BIOME sections, agent state).  
**Binding twin:** [`../../standards/BNAT_SHEAF_STANDARD.md`](../../standards/BNAT_SHEAF_STANDARD.md)
(operational invariant + harness). This file is the **formal / mathematical**
definition used by the MOTU Visiting Controller.

## Purpose

Formalize the topological structures underlying the MOTU BNAT (Best Not Yet
Available Technology / Biomimetic Networked Agent Topology) Knowledge Sheaf.
Govern how the system detects misalignments between localized intelligence
streams. Elevate the BIOME sheaf from *metaphor* (liveness gluing) to
*mathematics* (obstruction reporting).

Companion to
[`wr/pending/14-veins-grounding-gate.md`](../../wr/pending/14-veins-grounding-gate.md):
a sheaf that always produces a global section is a rubber stamp, not a sheaf.

Everything here is **strictly additive** relative to
`scripts/biome/sheaf.js` and `docs/biome/biome-status.json`. BIOME behavior
is not modified by this standard.

## Formal definitions

### Cellular sheaf and restriction maps

A **cellular sheaf** $\mathcal{F}$ over a network represents local
observations tied together via restriction maps.

Let $G = (V, E)$ be a graph whose vertices are components or agents. For each
vertex $v \in V$ and edge $e \in E$, assign vector spaces $\mathcal{F}(v)$
and $\mathcal{F}(e)$ respectively.

For each incident vertex-edge pair $v \triangleleft e$, there exists a linear
**restriction map**

$$
\mathcal{F}_{v \triangleleft e} : \mathcal{F}(v) \to \mathcal{F}(e).
$$

A global assignment $x \in \prod_{v \in V} \mathcal{F}(v)$ is a **global
section** if for every edge $e = \{u, v\}$ the restrictions agree:

$$
\mathcal{F}_{u \triangleleft e}(x_u) = \mathcal{F}_{v \triangleleft e}(x_v).
$$

### Sheaf Laplacian energy $E(x)$

The coboundary map
$\delta : \prod_{v \in V} \mathcal{F}(v) \to \prod_{e \in E} \mathcal{F}(e)$
measures disagreement over edges:

$$
(\delta x)_e = \mathcal{F}_{v \triangleleft e}(x_v) - \mathcal{F}_{u \triangleleft e}(x_u).
$$

The **Sheaf Laplacian** is $L = \delta^{\mathsf{T}}\delta$. The **Sheaf
Laplacian energy** $E(x)$ quantifies aggregate disagreement across state $x$:

$$
E(x) = x^{\mathsf{T}} L x = \|\delta x\|^2 = \sum_{e=\{u,v\}} \bigl\| R_u x_u - R_v x_v \bigr\|^2.
$$

Default tolerance: $\varepsilon = 10^{-9}$. Enforced by
`node scripts/bnatsheaf/cli.js consistency_check`.

### $H^1$ obstruction

When $E(x) > 0$, the state fails to glue into a valid global section. That
failure is an obstruction in the first cohomology:

$$
H^1 \neq 0 \quad\Leftrightarrow\quad E(x) > 0 \text{ (up to numerical }\varepsilon\text{)}.
$$

Each obstruction is reported with its **transition patch** — the coboundary
gap that would restore agreement on that edge. Silence (gluing over the
obstruction) is a policy violation.

### Persistent homology barcodes

To monitor obstructions over time and scale, the system tracks **persistent
homology barcodes**. Filtration weight of each worker-pair edge equals the
Laplacian energy of its disagreement. Sweeping the threshold yields:

- **$H^0$ barcodes** — components merging (union-find, elder rule).
- **$H^1$ barcodes** — cycles. On graphs (no 2-cells), $H^1$ bars do not die
  on their own: **every positive-birth $H^1$ bar must be explicitly killed
  (resolved) or escalated — never silently glued.**

`node scripts/bnatsheaf/cli.js ph_monitor --min-lifetime 0.5` exits non-zero
whenever a persistent obstruction exists.

### Dual embedding: algebraic + chemistry/cognitive

The BNAT standard operates via a **dual embedding**. The two readings name
the same object:

| Algebraic | Chemistry / cognitive |
| --- | --- |
| Stalk (vector at a vertex) | An agent's local belief state — its monomer |
| Restriction map | Bond formation — how a belief projects onto a shared context |
| Overlap agreement ($R_u x_u = R_v x_v$) | Stable covalent bond — no strain |
| Laplacian energy $E(x)$ | Strain energy in the lattice — cognitive dissonance across the fleet |
| Global section ($H^0$) | Fully annealed crystal — shared coherent worldview |
| $H^1$ obstruction | A dislocation defect — a contradiction the fleet is living with |
| Transition patch | The reagent that resolves the dislocation |
| Persistence barcode | Reaction trace over time — which strains anneal, which persist |
| Long-lived $H^1$ bar | A poison — a persistent contradiction that must be removed, never diluted |
| Imprint-at-spawn | Templated synthesis — a new agent crystallizes from the coherent lattice, never from a strained one |

## The hard Controller rule

To ensure safety in the S-MOS (Swarm Metacognitive Operating System), the
Controller enforces the following absolute threshold:

> **No WR (Work Request) assignment or high-blast PR is permitted to merge or
> execute while the Sheaf Laplacian energy $E(x) > \varepsilon$.**

If $H^1 \neq 0$ (the verifier stalk contradicts the generator stalk, or
localized intelligence fails to glue), the fleet is in an obstructed state.
The lane is frozen until energy falls below $\varepsilon$.

### Supporting invariants

1. **Imprint-at-spawn.** Every agent instantiation restricts from the global
   knowledge sheaf and verifies $H^1 \approx 0$ **before** starting work:
   `node scripts/bnatsheaf/cli.js imprint_agent --agent <name>`.
2. **No silent gluing.** Long-lived $H^1$ bars from `ph_monitor` must be
   killed or escalated (`lifecycle:stuck` + `needs-human`).
3. **Strictly additive.** BIOME feed is never modified by this layer; BNAT is
   read-only over it.
4. **Exit codes are postconditions.** Every harness command exits 0 only when
   the mathematical postcondition holds (`CLAUDE.md` gotcha #6).
5. **Identity hygiene.** Gluing means agreeing on overlaps, not erasing
   stalks. Preserve language from `AGENTS.md` and `VISITING_AGENTS.md`.

## Integration with V.E.I.N.S. Grounding Gate

This standard **explicitly references and strengthens** the safeguards in
[`wr/pending/14-veins-grounding-gate.md`](../../wr/pending/14-veins-grounding-gate.md):

1. **Obstruction reporting.** The global section in `biome-status` must show
   `degraded` if any stalk conflicts. The sheaf cannot paper over an $H^1$
   obstruction.
2. **Verifier sections.** Suite state, script compile checks, and WR smoke
   runs must act as explicit sheaf stalks. A failed verification yields
   infinite (or large) distance on the corresponding restriction map, driving
   $E(x) > \varepsilon$.
3. **Bi-directional Proof & Grounding Gate.** No agent patch deploys until it
   compiles and the real test suite passes. An LLM opinion may WARN, never
   PASS over a red suite.
4. **Convergence Judge.** When the same component is "fixed" repeatedly
   without reducing $E(x)$, freeze the lane and escalate — do not accept a
   fourth patch into an oscillating defect.

## Escalation ladder for persistent obstructions

1. `ph_monitor` exits non-zero → CI turns red (edge, birth energy, transition
   patch named in JSON output).
2. Apply the transition patch (align the disagreeing sections) **or**
3. Open a WR-BLOCKER issue naming the edge; label `lifecycle:stuck` +
   `needs-human`; attach the barcode.
4. It is a policy violation to relax $\varepsilon$ or delete the edge to make
   the check pass.

## Secrets

MOTU Lead (Grok) API access: `XAI_API_KEY` (alias `GROK_API_KEY`).  
Vault path: `revvel/shared/llm/xai`. Names only in `.env.example`.

## Related artifacts

| Layer | Path |
| --- | --- |
| Docs overview | `docs/bnatsheaf/README.md` |
| Master prompt | `docs/bnatsheaf/MOTU_MASTER_PROMPT.md` |
| Operational standard | `standards/BNAT_SHEAF_STANDARD.md` |
| Core sheaf | `scripts/bnatsheaf/sheaf.js` |
| Persistence | `scripts/bnatsheaf/persistence.js` |
| Harness | `scripts/bnatsheaf/cli.js` |
| Tests | `tests/bnatsheaf.test.js` |
| Skill | `skills/bnatsheaf/SKILL.md` |
| WR body | `wr/WR-MOTU-BNAT-SHEAF.md` |
| Learning record | `wr/memory/learnings-bnat-sheaf.md` |
