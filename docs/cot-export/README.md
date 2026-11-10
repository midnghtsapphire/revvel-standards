# CoT Export

Writes an anomaly location as Cursor-on-Target (CoT) 2.0 XML that ATAK,
WinTAK and iTAK can import as a map marker. It uses only the Python standard
library.

The output is an `<event>` of type `b-m-p-s-m` (spot map marker) containing:

- **`<point>`:** latitude, longitude, height above ellipsoid, and
  circular/linear error. Unknown values use the CoT placeholder `9999999.0`.
- **`<contact callsign>`:** the label shown on the map.
- **`<remarks>`:** free-text sensor notes, escaped safely.
- **`<color argb>`:** red at a score of 75 or more, orange at 50 or more,
  otherwise yellow.
- **`<anomaly>`:** a custom detail element holding the fused score and the
  sensor list. TAK clients keep detail elements they don't recognise.

Times are UTC. The marker goes stale after 24 hours by default
(`--stale-hours`). Pass a fixed `--uid` so that re-sending updates the same
marker instead of adding a new one.

## Usage

```bash
python3 docs/cot-export/cot_export.py --lat 39.7392 --lon -104.9903 --hae 1609 --ce 2.5 \
    --callsign ANOMALY-01 --score 87.5 --sensors GPR P-SAR LWIR SIF \
    --remarks "GPR + P-band SAR agree at 1.9 m" --out anomaly.cot
```

To load the file in ATAK, use Import Manager → Local SD and pick the `.cot`
file, or send it over a TAK server or data package.

## Tests

```bash
python3 -m unittest discover -s docs/cot-export -v
```
