# GPR Wave Model

Ground Penetrating Radar (GPR) physics model for estimating whether a buried
target shows up in conductive clay or silt soils. It uses only the Python 3.9+
standard library, with no dependencies.

## What it computes

For each soil (relative permittivity `er`, conductivity `sigma`) and target
`er`, at normal incidence:

| Quantity | Formula | Unit |
|---|---|---|
| Velocity (lossless) | `v = c / sqrt(er)` | m/ns |
| Loss tangent | `tan_d = sigma / (omega * eps0 * er)` | — |
| Attenuation | full lossy solution; low-loss check `~1.636 * sigma[mS/m] / sqrt(er)` | dB/m |
| Velocity (lossy) | `v = omega / beta` | m/ns |
| Fresnel reflection | `R = (n1 - n2) / (n1 + n2)`, `n = sqrt(er*)` | — |
| Two-way travel time | `TWT = 2d / v_soil` for depths 0–3 m | ns |
| Return level | `20 log10 abs(R) - 2 * alpha_dB * d` (optional spreading) | dB |
| Max detectable depth | deepest `d` where the return level stays within the loss budget | m |

The script prints summary tables and writes the full results as JSON,
including a depth-by-depth return profile for each target.

## Usage

```bash
python3 docs/gpr-wave-model/gpr_wave_model.py                     # tables + JSON to stdout
python3 docs/gpr-wave-model/gpr_wave_model.py \
    --soil 15 20 25 --sigma 10 30 60 --target 3 6 9 16.4 \
    --freq 250 --loss-budget 60 --spreading --out results.json
python3 docs/gpr-wave-model/gpr_wave_model.py --no-table          # JSON only
```

`--sigma` takes either one value for all soils or one value per `--soil`.

## Example (400 MHz, 60 dB budget, no spreading)

| Soil | Loss (dB/m) | Deepest detectable target (target er 3 → 16.4) |
|---|---|---|
| er 15, sigma 10 mS/m | 4.2 | 6.1 → 3.2 m |
| er 20, sigma 30 mS/m | 11.0 | 2.4 → 1.6 m |
| er 25, sigma 60 mS/m | 19.6 | 1.4 → 1.0 m |

## Assumptions and limits

- Non-magnetic media, a flat boundary, the wave hitting the boundary straight
  on, and uniform soil above the target.
- Conductivity is treated as fixed across frequencies. Real clays are
  dispersive, so attenuation at high frequency is usually somewhat higher
  than the model predicts.
- The 60 dB loss budget is a placeholder. Replace it with your instrument's
  dB margin left for ground losses after system, antenna-coupling and
  transmission losses.
- Depth estimates are only as good as the soil `er`. Calibrate it against a
  known-depth reflector or a hyperbola fit before converting TWT to depth.

## Tests

```bash
python3 -m unittest discover -s docs/gpr-wave-model -v
```
