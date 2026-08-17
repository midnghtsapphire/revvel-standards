# BNAT Sheaf Standard

This document formalizes the topological structures underlying the MOTU BNAT (Biomimetic Networked Agent Topology) Knowledge Sheaf. It governs how the system detects misalignments between localized intelligence streams.

## Formal Definitions

### Cellular Sheaf and Restriction Maps

A **cellular sheaf** $\mathcal{F}$ over a network represents local observations tied together via restriction maps.
Let $G = (V, E)$ be a graph representing the components or agents in the network. For each vertex $v \in V$ and edge $e \in E$, we assign vector spaces $\mathcal{F}(v)$ and $\mathcal{F}(e)$ respectively.

For each incident vertex-edge pair $v \triangleleft e$, there exists a linear **restriction map** $\mathcal{F}_{v \triangleleft e}: \mathcal{F}(v) \to \mathcal{F}(e)$. A global assignment or state $x \in \prod_{v \in V} \mathcal{F}(v)$ is considered a **global section** if for all edges $e = \{u, v\}$, the restriction maps agree:

$$
\mathcal{F}_{u \triangleleft e}(x_u) = \mathcal{F}_{v \triangleleft e}(x_v)
$$

### Sheaf Laplacian Energy $E(x)$

The coboundary map $\delta: \prod_{v \in V} \mathcal{F}(v) \to \prod_{e \in E} \mathcal{F}(e)$ measures the disagreement over edges:

$$
(\delta x)_e = \mathcal{F}_{v \triangleleft e}(x_v) - \mathcal{F}_{u \triangleleft e}(x_u)
$$

The **Sheaf Laplacian** is $L = \delta^T \delta$. The Sheaf Laplacian energy $E(x)$ quantifies the aggregate disagreement across the network state $x$:

$$
E(x) = x^T L x = \| \delta x \|^2
$$

### $H^1$ Obstruction and Persistent Homology Barcodes

When $E(x) > 0$, the state fails to glue into a valid global section, representing an obstruction in the first cohomology group, $H^1 \neq 0$.

To monitor these obstructions over time and across scales, the system tracks **Persistent Homology Barcodes**. As the tolerance parameter $\epsilon$ varies, features (obstructions) are born and die. The lengths of these bars in the persistence diagram represent the resilience of conflicting localized views before convergence is achieved.

### Dual Embedding: Algebraic and Cognitive/Chemistry

The BNAT standard operates via a **dual embedding**:

1. **Algebraic Mode:** The explicit matrices, restriction maps, Laplacian energy $E(x)$, and cohomology calculations (via `bnatsheaf`).
2. **Cognitive / Chemistry Mode:** The biomimetic interpretation of these structures. The restriction maps act as _membrane interfaces_ or _synaptic weight transfers_. High $E(x)$ manifests as _inflammation_ or _allosteric inhibition_, triggering autoimmune responses (e.g., self-healing rollbacks or blocking destructive actions).

## The Hard Controller Rule

To ensure safety in the S-MOS (Swarm Metacognitive Operating System), the Controller enforces the following absolute threshold:

> **No WR (Work Request) assignment or high-blast PR is permitted to merge or execute while the Sheaf Laplacian energy $E(x) > \varepsilon$.**

If $H^1 \neq 0$ (the verifier stalk contradicts the generator stalk, or localized intelligence fails to glue), the fleet is in an obstructed state. The lane is frozen.

## Integration with V.E.I.N.S. Grounding Gate

This standard explicitly references and strengthens the safeguards defined in the companion WR: [`wr/pending/14-veins-grounding-gate.md`](../../wr/pending/14-veins-grounding-gate.md).

Specifically, the Bi-directional Proof & Grounding Gate requires that:

1. **Obstruction Reporting:** The global section in `biome-status` must show `degraded` if any stalk conflicts. The sheaf cannot paper over an $H^1$ obstruction.
2. **Verifier Sections:** Suite state, script compile checks, and WR smoke runs must act as explicit sheaf stalks. A failed verification yields an infinite distance on the corresponding restriction map, driving $E(x) > \varepsilon$.
