# Repaint spike report

**Status: NOT RUN — requires GPU**

This file is the gate for `wr/WR-REPAINT-EDITOR.md`. No editor UI work merges
until the table below is filled from a real run and the verdict reads **PASS**.

The bar was set before any run, and is committed in code
(`scripts/spike/run_spike.py`) rather than prose, so it cannot be quietly
relaxed after seeing results.

## The bar

| Criterion | Threshold | Why this number |
|---|---|---|
| Voice similarity | ≥ **0.80** cosine | Below this, listeners hear a different singer on the repaired word. The product has no value under this line. |
| Seam discontinuity | ≤ **1.5×** the track's own 99th-percentile flux | Stated relative to the music because real songs contain loud legitimate transitions; an absolute threshold would fail every drum hit. |
| Narrowest usable mask | ≤ **2.0 s** | Wider than this and the tool regenerates phrases, not words. "Fix one word" would be a false claim. |

A run where voice drift could not be measured reports **INCONCLUSIVE**, not
PASS. See `docs/repaint/CONSISTENCY.md`.

## How to run

```bash
pip install -r requirements-spike.txt
python scripts/spike/run_spike.py \
    --checkpoint-path /models/ace-step \
    --out-dir artifacts/spike-001 \
    --gpu-cost-per-hour 1.80
```

Exits non-zero on FAIL or INCONCLUSIVE, so it can gate CI directly. Writes
`artifacts/spike-001/spike.json` plus every rendered variant for listening —
the numbers narrow the decision, they do not replace putting it in headphones.

## Results

_Paste from `spike.json` after the run._

| Op | Mask width | Voice sim | Seam z (worst) | Baseline p99 | Elapsed | Cost |
|---|---|---|---|---|---|---|
| repaint | 0.5 s | — | — | — | — | — |
| edit | 0.5 s | — | — | — | — | — |
| repaint | 1.0 s | — | — | — | — | — |
| edit | 1.0 s | — | — | — | — | — |
| repaint | 2.0 s | — | — | — | — | — |
| edit | 2.0 s | — | — | — | — | — |
| repaint | 4.0 s | — | — | — | — | — |
| edit | 4.0 s | — | — | — | — | — |

**Verdict:** _pending_
**Narrowest passing mask:** _pending_
**Median cost per edit:** _pending_

## Reading the outcome

- **PASS** → proceed to `apps/editor/`. Record the narrowest passing mask as the
  UI's minimum selectable span; do not let users draw a mask the model cannot
  honor.
- **FAIL on voice similarity** → the core cannot hold identity. Three fallbacks
  before abandoning, cheapest first:
  1. Lyric2Vocal LoRA on separated vocal stems.
  2. **Voice-conversion pass over the repainted span only** — convert the
     regenerated audio back toward a voice model built from the source vocal.
     This decouples "say the right word" from "sound like the right singer",
     which is attractive precisely because the second problem is commoditized
     (Kits.AI, Wondera and similar ship one-click vocal repair) while the first
     is not. Cost: one more model in the path, and conversion artifacts of its
     own to measure.
  3. Re-run against DiffRhythm 2 through the same `RepaintEngine` contract.

  The adapter exists precisely so these swaps cost a day, not a rewrite.
- **FAIL on mask width only** → the artifact-removal feature still ships (it
  tolerates wide masks); word-level editing gets deferred and the product
  narrative changes. Do not ship word-editing on a 4-second mask and hope.
- **INCONCLUSIVE** → install the embedding backend and re-run. Do not proceed on
  seam numbers alone.

## Known limitations of this spike

- One prompt, one seed, one genre. A PASS here is evidence, not proof; widen to
  three contrasting arrangements before committing to pricing.
- Seam scoring is computed on the full mix. A seam buried under a dense
  arrangement scores better than the same seam in a sparse verse, so sparse
  material is the honest worst case and should be represented in any follow-up.
- Cost per edit assumes a warm pipeline. Cold-start model load is excluded and
  will dominate for a single-user session — a real per-edit price needs the
  serving model decided first.
