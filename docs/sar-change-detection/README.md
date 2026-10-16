# SAR Change Detection

Finds a persistent step change, such as ground disturbance or concrete
capping, in a multi-year SAR backscatter time series. It then checks whether
the signal settled into a stable new baseline. C-band (5.5 GHz) and P-band
(435 MHz) are analysed separately. Needs `numpy`; `matplotlib` is only used
for `--plot`.

## Method

- **Model:** for every candidate change time, it fits
  `y = a + b·sin(2πt) + c·cos(2πt) + d·step(t − τ)`. The best-fitting τ is the
  change point and `d` is the jump in dB.
- **Significance:** the sup-F statistic against the no-step model. The default
  threshold of 10 is above the 5% critical value for a single-break scan
  (about 8.85, Andrews 1993). A plain F table would overstate significance,
  because τ is chosen by scanning. A minimum step of 1.5 dB also applies.
- **Stability:** post- vs pre-event residual variance, using a log variance
  ratio z-test that scales with sample size (z ≤ 2.33), plus a post-event drift
  limit of 0.15 dB/year.

Measured on the built-in simulation (20 years, monthly samples):

- A +4 dB event was found in 100 of 100 runs, within 0.2 years of the true date.
- Runs with no event gave 0 false alarms in 200.
- Stationary post-event noise was wrongly flagged "unstable" in 3 of 600 band-runs.

## Usage

```bash
python3 docs/sar-change-detection/sar_change_detection.py --out sar.json --plot sar.png
python3 docs/sar-change-detection/sar_change_detection.py --event-year 2016.5 --step-db -3
python3 docs/sar-change-detection/sar_change_detection.py --no-event   # false-alarm check
```

All built-in series are synthetic. Real input should be calibrated sigma0 (dB)
from one orbit and track, so the viewing geometry stays constant.

## Tests

```bash
python3 -m unittest discover -s docs/sar-change-detection -v
```
