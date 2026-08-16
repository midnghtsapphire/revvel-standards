# Persistent Homology Tools — Production Survey for revvel-standards

**Status:** Active (WR-16909)  
**Core engine:** `scripts/bnatsheaf/persistence.js` (pure JS, credit-free)  
**Optional adapters:** `scripts/bnatsheaf/tda_adapters.js`

## Decision (binding)

| Priority | Tool | Fit for revvel-standards | Notes |
| --- | --- | --- | --- |
| **Core** | Pure JS (union-find + elder rule) | Credit-free, BIOME-scale, already in CI | H⁰ merges + H¹ cycle births on filtered graphs |
| Optional | **Ripser** / ripser-js | Fastest Vietoris–Rips for learning-file point clouds | Tiny; Scikit-TDA ecosystem. No hard dep. |
| Optional | **GUDHI** | Rips / Alpha / Cubical / Witness; mature API | Best general-purpose offline. No hard dep. |
| Research | Dionysus 2 | Persistent cohomology, zigzag, vineyards | Time-evolving agent sections |
| Research | giotto-tda / scikit-tda | Scikit-learn pipelines, vectorizations | Notebooks and investor demos |

**Runtime / credit-free path remains pure JavaScript with zero new dependencies.**
Thin optional adapters call Ripser or GUDHI *when present* and fall back
otherwise. The core consistency path (`consistency_check`, `imprint_agent`,
`ph_monitor`, `fingerprint`) never `require()`s a native TDA package.

> Language note: the originating MOTU write-up sketched pure-Python + NumPy.
> This repository's test gate, CI, and the BIOME sheaf are Node, so the
> production engine is pure dependency-free JavaScript. The mathematics is
> identical; see `standards/BNAT_SHEAF_STANDARD.md`.

## What v1 computes

1. **Ordinary PH of the underlying graph** under a filtration whose edge
   weight is the Laplacian residual energy of that worker-pair
   (`barcodesFromBiomeStatus`).
2. **Long-lived H¹ detection** — bars born at positive weight encode sustained
   disagreement and must be killed or escalated (`longLivedH1`, `ph_monitor`).
3. **Topological fingerprint** — `{ dim_H0, dim_H1, rank_delta, energy,
   long_lived_h1 }` via rank-nullity cohomology + barcodes
   (`scripts/bnatsheaf/fingerprint.js`).

Persistent *sheaf* cohomology (filtrating both topology *and* restriction maps)
is the natural follow-on and is documented in `NSD_EXPLORATION.md`; it is not
required for the v1 gate.

## Usage patterns

### Credit-free default (always)

```bash
node scripts/bnatsheaf/cli.js ph_monitor --min-lifetime 0.5
node scripts/bnatsheaf/cli.js fingerprint --out docs/biome/bnat-fingerprint.json
```

```js
const { computeBarcodes, longLivedH1 } = require('./scripts/bnatsheaf/persistence');
const { barcodesWithBackend, probeBackends } = require('./scripts/bnatsheaf/tda_adapters');

const { barcodes, backend } = barcodesWithBackend(
  ['a', 'b', 'c'],
  [
    { u: 'a', v: 'b', weight: 1 },
    { u: 'b', v: 'c', weight: 2 },
    { u: 'a', v: 'c', weight: 3 },
  ],
  { prefer: 'auto' } // tries ripser → gudhi → native
);
// backend === 'native' in CI and every credit-free runner
```

### Optional backends (offline / research laptops)

```bash
# Only if you deliberately install a Node binding — never in root package.json
npm install ripser-js   # hypothetical; probe is name-tolerant
```

`probeBackends()` reports `{ native: true, ripser: bool, gudhi: bool }`.
Missing packages are not errors; adapters return native barcodes with a `note`.

## Filtration design for BIOME

| Signal | Filtration weight | Interpretation |
| --- | --- | --- |
| Worker-pair severity agreement | \(E_e=\|x_u-x_v\|^2\) | 0 = perfect agreement (born immediately) |
| Learning-file write time | timestamp normed to \([0,1]\) | multi-scale history of knowledge tears |
| Residual after transition patch | post-patch \(E_e\) | bar dies only when the tear is actually fixed |

Graph H¹ bars never die on their own (no 2-cells). A bar born at weight 0 with
perfect agreement is topology-only and harmless. A bar born at positive weight
is a **persistent obstruction** — CI turns red via `ph_monitor`.

## Why Ripser and GUDHI stay optional

1. **Credit-free invariant** — BIOME and BNAT must run on `GITHUB_TOKEN` alone
   with no native build toolchain in Actions.
2. **Reproducibility** — Gaussian elimination + union-find are deterministic
   across Node 22 runners; native wheels are not.
3. **Scope** — BIOME graphs are tiny (≤ tens of workers). Asymptotic Rips
   speed does not buy anything at this scale.
4. **Escalation clarity** — long-lived bars must name a worker-pair edge and a
   transition patch. Point-cloud PH does not produce that directly.

## Follow-on (explicitly out of the v1 gate, tracked here)

1. Residual-energy vineyards across hourly `biome-status.json` snapshots.
2. Persistent sheaf cohomology with filtrated restriction maps (NSD-frozen).
3. Optional offline notebook that calls GUDHI for investor demos, consuming
   the same fingerprint schema.

## References

- Bauer — *Ripser: efficient computation of Vietoris–Rips persistence barcodes*,
  J. Appl. Comput. Topology 2021. <https://github.com/Ripser/ripser>
- Maria et al. — *The GUDHI Library*, ICMS 2014. <https://gudhi.inria.fr/>
- Otter et al. — *A roadmap for the computation of persistent homology*,
  EPJ Data Science 2017.
