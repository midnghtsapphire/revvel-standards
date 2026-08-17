# Sheaf Cohomology — Short Proofs (cellular, discrete)

**Status:** Active (WR-16909)  
**Executable surface:** `scripts/bnatsheaf/cohomology.js`  
**Proof tests:** `tests/bnatsheaf-cohomology-proofs.test.js`

This note records the short algebraic proofs that underwrite the BNAT
Knowledge Sheaf. Every identity below is checked by the proof suite on every
`npm test` run.

## Setup

Let \(X=(V,E)\) be a finite undirected graph and \(\mathcal{F}\) a cellular
sheaf of finite-dimensional real vector spaces on \(X\):

- **Stalks** \(\mathcal{F}(v)\) live on vertices (BIOME workers / agents).
- **Restriction maps** \(\rho_{v\trianglelefteq e}:\mathcal{F}(v)\to\mathcal{F}(e)\)
  live on incident edges (overlaps / consistency constraints).

### Cochain complex

\[
0\to C^0=\bigoplus_{v\in V}\mathcal{F}(v)
\xrightarrow{\delta}
C^1=\bigoplus_{e\in E}\mathcal{F}(e)\to 0
\]

with coboundary

\[
(\delta x)_e=\rho_{u\trianglelefteq e}(x_u)-\rho_{v\trianglelefteq e}(x_v)
\quad\text{for }e=\{u,v\}.
\]

When every stalk has dimension \(d\) and every restriction is the identity,
\(\dim C^0=nd\) and \(\dim C^1=md\) for \(n=|V|\), \(m=|E|\).

## Theorem (H⁰ = global sections)

\[
H^0(X;\mathcal{F})=\ker\delta\cong\Gamma(X,\mathcal{F}).
\]

**Proof sketch.** \(x\in\ker\delta\) if and only if
\(\rho_{u\trianglelefteq e}(x_u)=\rho_{v\trianglelefteq e}(x_v)\) for every
edge \(e=\{u,v\}\). By the sheaf (gluing) axiom this is exactly the condition
that the local values \(\{x_v\}_{v\in V}\) patch to a unique global section.
Conversely every global section restricts to a 0-cocycle. ∎

**Executable check.** `computeCohomology(sheaf).inH0 === true` iff
`‖δx‖² < ε`, and `applyCoboundary` returns the zero residual on any constant
assignment under identity restrictions
(`tests/bnatsheaf-cohomology-proofs.test.js`).

## Theorem (H¹ = obstruction)

\[
H^1(X;\mathcal{F})=\operatorname{coker}\delta=C^1/\operatorname{im}\delta.
\]

**Proof sketch.** A class \([r]\in H^1\) is an assignment of local residuals
on edges that is _not_ of the form \(\delta x\) for any global 0-cochain \(x\).
Algebraically this means the local data will not glue: no choice of vertex
values cancels every residual simultaneously. On a graph (no 2-cells) every
cocycle is closed, so \(H^1=\operatorname{coker}\delta\). ∎

**Executable check.** On the 3-cycle with \(d=1\),
\(\operatorname{rank}\delta=2\), so \(\dim H^1=3-2=1\). The group is
non-trivial even when the zero section has energy 0 — obstruction is a
property of the sheaf, not of one particular section.

## Rank-nullity (computable)

\[
\dim H^0=\dim C^0-\operatorname{rank}\delta,
\qquad
\dim H^1=\dim C^1-\operatorname{rank}\delta.
\]

**Proof.** Rank-nullity on \(\delta:C^0\to C^1\):
\(\dim\ker\delta=\dim C^0-\operatorname{rank}\delta\).
For the cokernel,
\(\dim\operatorname{coker}\delta=\dim C^1-\operatorname{rank}\delta\). ∎

**Verified table** (identity restrictions, \(d=1\)):

| Complex | \(n\) | \(m\) | \(\operatorname{rank}\delta\) | \(\dim H^0\) | \(\dim H^1\) | Gluing |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Path (tree) | 3 | 2 | 2 | 1 | 0 | yes |
| Cycle | 3 | 3 | 2 | 1 | 1 | obstruction class |
| 2 components | 4 | 2 | 2 | 2 | 0 | yes |
| Constant section (any) | — | — | — | — | — | energy \(\approx 0\), in \(H^0\) |

Implementation: Gaussian elimination over \(\mathbb{R}\) in
`scripts/bnatsheaf/cohomology.js` (`matrixRank`, `computeCohomology`).
No NumPy/SciPy — credit-free pure Node so `npm test` enforces the proofs.

## Energy characterization

The sheaf Laplacian \(\Delta=\delta^*\delta\) satisfies

\[
E(x)=\langle x,\Delta x\rangle=\|\delta x\|^2.
\]

(Up to the conventional \(\tfrac12\) factor used in some continuum texts;
the BNAT harness uses the squared residual sum so thresholds stay integer-clean.)

**Corollary.** \(E(x)=0\iff x\in\ker\delta=H^0\).

This is the quantitative test used by:

- `node scripts/bnatsheaf/cli.js consistency_check` (after every Learn write)
- `node scripts/bnatsheaf/cli.js imprint_agent --agent <name>` (spawn gate)
- the VEINS grounding gate companion (`wr/pending/14-veins-grounding-gate.md`)

## BIOME / fleet mapping

| Mathematical object | Concrete artifact |
| --- | --- |
| Vertex / stalk | BIOME worker (`sentinel`, `medic`, `homeostat`, `sheaf`, …) or agent instance |
| Edge / restriction | Status-overlap constraint or learning-file agreement |
| Global section | Coherent `docs/biome/biome-status.json` after metaphorical glue |
| \(E(x)>0\) / non-zero class in \(H^1\) | Residual inconsistency → escalate (grounding gate) |
| Long-lived \(H^1\) bar | Systemic topological tear pairwise patches cannot kill |
| Persistence barcode | Multi-scale history of tears across status snapshots |
| Neural Sheaf Diffusion | Learnable restrictions (offline, `scripts/bnatsheaf/nsd.js`) frozen into the deterministic sheaf |

The same pattern applies to any project: dependency graphs, multi-agent memory
overlaps, test-result sections, API-contract agreement, OSINT graphs. Non-vanishing
\(H^1\) or long-lived bars are the principled reason to escalate instead of
silently merge.

## Commands

```bash
# Rank-nullity summary over the live BIOME feed
node scripts/bnatsheaf/cli.js cohomology

# Compact fingerprint (dim_H0, dim_H1, long-lived bars)
node scripts/bnatsheaf/cli.js fingerprint --out docs/biome/bnat-fingerprint.json
```

Exit codes reflect the postcondition (consistency holds), not process completion.

## References

- Hansen & Ghrist — _Toward a Spectral Theory of Cellular Sheaves_,
  J. Appl. Comput. Topology 2019. <https://arxiv.org/abs/1808.01513>
- Curry — _Sheaves, Cosheaves and Applications_, 2014.
- Bodnar et al. — _Neural Sheaf Diffusion_, NeurIPS 2022.
  <https://arxiv.org/abs/2202.04579>
