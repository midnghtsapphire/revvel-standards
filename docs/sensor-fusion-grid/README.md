# Sensor Fusion Grid

Fuses four remote-sensing inputs into a 3D voxel grid (default 15 × 15 × 20)
and reports the strongest anomaly with confidence metrics. Needs `numpy`;
`matplotlib` is only used for `--plot`.

| Input | Shape | Counts as anomalous when |
|---|---|---|
| P-band SAR backscatter (dB) | surface | higher than background |
| Thermal LWIR delta (°C) | surface | far from background in either direction |
| SIF plant-stress index (0–1) | surface | higher stress |
| Dielectric permittivity (er) | volume | lower than the moist host soil |

## Method

- **Per-input score:** each input becomes a robust z-score (median and MAD)
  and is mapped to a 0–1 value with a logistic curve.
- **Blending:** the scores are combined with weights. Defaults are SAR 0.25,
  thermal 0.15, SIF 0.15 and permittivity 0.45.
- **Depth:** surface sensors fade with depth (1.5 m e-folding), and the
  weights are renormalised per layer. Only permittivity localises in depth.
- **Output:** 0–100 per voxel, plus the peak voxel position, robust z,
  second-peak ratio and the size of the cluster above the threshold.
- **Confidence (permutation test):** with thousands of voxels, pure noise
  alone reaches about 70%, so a high peak means little by itself. Each
  sensor's values are shuffled across space and the grid is re-fused. The
  empirical p-value is the share of shuffles whose maximum reaches the
  observed peak.

**The score is an anomaly index, not a calibrated probability.** Turning it
into a probability needs ground-truthed labels. The weights are illustrative.

On the built-in simulation, a planted target was located within one voxel in
99 of 100 random placements. On the default run, the target gave p ≈ 0.02 and
a noise-only grid gave p ≈ 0.14.

## Usage

```bash
python3 docs/sensor-fusion-grid/sensor_fusion_grid.py --out fusion.json --plot fusion.png
python3 docs/sensor-fusion-grid/sensor_fusion_grid.py --target 4 10 12 --dz 0.15 --threshold 60
```

## Tests

```bash
python3 -m unittest discover -s docs/sensor-fusion-grid -v
```
