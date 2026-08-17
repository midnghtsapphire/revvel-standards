# NSD Exploration — Sheaf Neural Networks as a Follow-On

Status: documented follow-on (WR-16893 optional item 6). This is a design
note plus a minimal learnable-restriction stub; it does not change any
production behavior.

## What Neural Sheaf Diffusion (NSD) is

Neural Sheaf Diffusion (Bodnar et al., *Neural Sheaf Diffusion: A
Topological Perspective on Heterophily and Oversmoothing in GNNs*, NeurIPS
2022 — <https://arxiv.org/abs/2202.04579>) replaces the fixed graph
Laplacian in a GNN with a **learned sheaf Laplacian**: the restriction maps
on each edge become trainable parameters. Diffusion under a sheaf Laplacian
converges to the space of global sections, so *learning the restriction
maps* means learning what "agreement" should mean between neighbors — which
resolves heterophily and oversmoothing that plague ordinary GNN diffusion.

## Why it matters here

Today BNAT uses identity restriction maps: two BIOME workers "agree" iff
their severity scalars are equal. That is correct for liveness but crude for
knowledge: two learning files can be consistent without being identical.
Learned restrictions would let the fleet discover, from historical
obstruction/resolution pairs, the linear projection under which two agents'
knowledge SHOULD agree — turning transition patches from manual reagents
into predicted ones.

## Minimal learnable-restriction stub

`scripts/bnatsheaf/sheaf.js` already accepts arbitrary `ru`/`rv` matrices
per edge. A gradient step on a single scalar restriction is small enough to
show inline (energy E(w) = (w·xᵤ − xᵥ)², dE/dw = 2(w·xᵤ − xᵥ)·xᵤ):

```js
const { CellularSheaf } = require('../../scripts/bnatsheaf/sheaf');

function learnScalarRestriction(xu, xv, { lr = 0.05, steps = 200 } = {}) {
  let w = 1; // start at identity
  for (let i = 0; i < steps; i++) {
    const grad = 2 * (w * xu - xv) * xu;
    w -= lr * grad;
  }
  return w;
}

const w = learnScalarRestriction(1, 2); // learns w ≈ 2
const sheaf = new CellularSheaf({
  stalks: { a: [1], b: [2] },
  edges: [{ u: 'a', v: 'b', ru: [[w]] }],
});
// sheaf.laplacianEnergy() ≈ 0 — agreement learned, not asserted.
```

## Follow-on plan (not in this WR)

1. Log every (stalk pair, resolved transition patch) from `ph_monitor`
   escalations into `logs/agent-audit/` as training data.
2. Fit per-edge restriction matrices offline (least squares first, NSD-style
   learned maps later) and load them into `sheafFromBiomeStatus`.
3. Regression-gate: learned maps must never mask a genuine `down` worker —
   liveness edges keep identity restrictions permanently.

## References

- Bodnar, Di Giovanni, Chamberlain, Liò, Bronstein — Neural Sheaf
  Diffusion, NeurIPS 2022. <https://arxiv.org/abs/2202.04579>
- Hansen & Ghrist — *Toward a Spectral Theory of Cellular Sheaves*,
  J. Appl. Comput. Topology 2019. <https://arxiv.org/abs/1808.01513>
