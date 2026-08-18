# Sheaf Cohomology Proofs — BNAT Knowledge Sheaf

**Status:** Active companion to `standards/BNAT_SHEAF_STANDARD.md`  
**Implementation:** `scripts/bnatsheaf/cohomology.js`  
**Observatory:** [`observatory.html`](./observatory.html)

This note records the algebraic identities the fleet uses operationally.
Notation is KaTeX-friendly.

## Setup

Let $G=(V,E)$ be a finite undirected graph. A **cellular sheaf** $\mathcal{F}$
of finite-dimensional real vector spaces assigns:

- a stalk $\mathcal{F}(v)=\mathbb{R}^{d_v}$ to each vertex $v\in V$
- a stalk $\mathcal{F}(e)=\mathbb{R}^{d_e}$ to each edge $e=uv\in E$
- restriction maps $R_{v\to e}:\mathcal{F}(v)\to\mathcal{F}(e)$

A **0-cochain** is an assignment $x=(x_v)_{v\in V}$ with $x_v\in\mathcal{F}(v)$.
The **coboundary** $\delta:C^0(\mathcal{F})\to C^1(\mathcal{F})$ is

$$
(\delta x)_e = R_{u\to e}\,x_u - R_{v\to e}\,x_v.
$$

The **sheaf Laplacian** is $\Delta_{\mathcal{F}}=\delta^\top\delta$, and the
**Dirichlet energy** is

$$
E(x)=\tfrac12 x^\top\Delta_{\mathcal{F}}x=\tfrac12\sum_{e\in E}\lVert(\delta x)_e\rVert^2.
$$

## Cohomology groups

$$
H^0(\mathcal{F})\cong\ker\delta,\qquad
H^1(\mathcal{F})\cong\operatorname{coker}\delta=C^1(\mathcal{F})/\operatorname{im}\delta.
$$

(For a graph there is no 2-skeleton, so $\delta^1=0$ and
$H^1$ is exactly the cokernel of $\delta$.)

### Theorem A — Rank-nullity certificate

For finite-dimensional $C^0,C^1$:

$$
\dim H^0 + \operatorname{rank}\delta = \dim C^0,
\qquad
\dim H^1 + \operatorname{rank}\delta = \dim C^1.
$$

**Proof.** Rank-nullity on $\delta:C^0\to C^1$ gives
$\dim\ker\delta+\operatorname{rank}\delta=\dim C^0$.
The first isomorphism theorem gives
$C^1/\operatorname{im}\delta\cong\operatorname{coker}\delta$, so
$\dim H^1=\dim C^1-\operatorname{rank}\delta$. ∎

Implemented as `sheafCohomology()` → fields `rankNullityHolds`,
`cokerIdentityHolds`.

### Theorem B — Zero energy iff global section

$$
E(x)=0 \iff \delta x=0 \iff x\in\ker\delta\cong H^0(\mathcal{F}).
$$

**Proof.** $E(x)=\tfrac12\sum_e\lVert(\delta x)_e\rVert^2$ is a sum of squares,
hence vanishes iff every residual vanishes iff $\delta x=0$. ∎

Operational rule: Controller / imprint-at-spawn requires $E(x)<\varepsilon$,
i.e. the live assignment is numerically a global section.

### Theorem C — Graph $H^1$ is the cyclomatic number (identity stalks)

When every stalk is $\mathbb{R}$ and every restriction is $\mathrm{id}$,
$\delta$ is the ordinary (oriented) incidence matrix of $G$. Then

$$
\operatorname{rank}\delta = |V|-c(G),\qquad
\dim H^0=c(G),\qquad
\dim H^1=|E|-|V|+c(G),
$$

where $c(G)$ is the number of connected components.

**Corollaries used in tests / Observatory:**

| Complex | $\dim H^0$ | $\dim H^1$ | Obstruction topology |
| --- | ---: | ---: | --- |
| Path $P_3$ | 1 | 0 | none |
| Cycle $C_3$ | 1 | 1 | one essential loop |
| Conflict (disagreeing stalks on $C_3$) | 1 | 1 | loop **and** $E(x)>0$ |

## Persistent homology bridge

Filtration weights on edges (disagreement energy or timestamps) yield barcodes:

- **$H^0$ bars** — component births/deaths via union-find (elder rule)
- **$H^1$ bars** — edges whose endpoints are already connected

Graph $H^1$ bars never die on their own (no 2-cells). Positive-birth immortal
$H^1$ bars are **systemic topological tears** — escalate, never silently glue
(`wr/pending/14-veins-grounding-gate.md`).

See `scripts/bnatsheaf/persistence.js` (`PersistenceDiagram`, `fingerprint`).

## Neural Sheaf Diffusion (optional)

Discrete healing flow $x\leftarrow x-\eta\Delta_{\mathcal{F}}x$ decreases
$E(x)$ for small $\eta$ (see `scripts/bnatsheaf/nsd.js`). Learned restriction
maps freeze into deterministic edge `ru` / `rv` matrices on `CellularSheaf` for runtime.
Research note: `NSD_EXPLORATION.md`.

## References

- Hansen & Ghrist — *Toward a Spectral Theory of Cellular Sheaves*, J. Appl.
  Comput. Topology 2019. <https://arxiv.org/abs/1808.01513>
- Bodnar et al. — *Neural Sheaf Diffusion*, NeurIPS 2022.
  <https://arxiv.org/abs/2202.04579>
