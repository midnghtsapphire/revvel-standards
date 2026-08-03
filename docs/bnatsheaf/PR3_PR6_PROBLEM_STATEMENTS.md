# PR3 & PR6 Problem Statements

## PR3 — Persistent Homology Barcodes
**Title:** feat(bnatsheaf): persistent homology barcodes for knowledge/BIOME sheaf

**Problem Statement:**
Implement the persistent homology layer on top of the pure-Python cellular sheaf.
- Build a filtration from BIOME status sections / learning-file versions (parameter = time, residual energy, edge metric).
- Compute $H^0$ and $H^1$ barcodes as (dim, birth, death) tuples in a `PersistenceDiagram`.
- Detect long-lived $H^1$ bars (persistence > $\tau$) and report as systemic topological tears; escalate, never silently glue.
- Include an optional compact topological fingerprint for `biome-status.json`.
- Implement pure-Python first (union-find $H^0$ + sequential rank for $H^1$).
- Write unit tests for synthetic conflicts creating $H^1$ bars, patches killing them, and long-lived bars surviving.
- Keep strictly additive, conventional commits, and aligned with `wr/pending/14-veins-grounding-gate.md`.

## PR6 — Neural Sheaf Diffusion (optional / research)
**Title:** docs(bnatsheaf)+feat(optional): Neural Sheaf Diffusion exploration + minimal learnable restriction stub

**Problem Statement:**
Document and stub NSD as the learnable upgrade path for restriction maps.
- Write `docs/bnatsheaf/NSD_EXPLORATION.md` covering Bodnar et al. (NeurIPS 2022), the discrete layer, mapping to Dirichlet energy, and imprint-at-spawn.
- Implement a minimal pure-Python stub in `bnatsheaf/nsd.py`: diagonal restriction maps predicted from node features, sheaf Laplacian assembly, and discrete diffusion steps $x \leftarrow x - \eta \Delta_{\mathcal{F}} x$.
- Make it explicitly optional; core WR does not require a trained model. Learned maps freeze into deterministic `CellularSheaf.restrictions`.
- Ensure no heavy dependencies affect the credit-free BIOME runtime path.
