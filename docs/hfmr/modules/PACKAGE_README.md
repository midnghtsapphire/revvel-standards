# HFMR reference prototype

Reproducible **feature-level** inference and hash-chain audit demonstration for historical forensic material reanalysis. **Not validated for casework, metal identification, or human-remains inference.** No raw SAR/GPR/LiDAR readers or physical forward solvers are implemented yet.

Run: `python -m unittest discover -v` (Python 3.10+, standard library only).

## Interfaces
- `Observation`: one measured feature, measurement uncertainty, source SHA-256, dependency group.
- `CalibratedModel`: conditional Gaussian means and intrinsic variability for five competing hypotheses. These MUST be fitted on representative calibration data; example test parameters are synthetic.
- `infer`: normalized hypothesis probabilities conditional on the supplied model; **not** a probability of human remains.
- `Ledger`: canonical JSONL hash chain; supports integrity checking with an externally stored expected head.

## Security limitations
The local hash chain is neither immutable nor authenticated. Production requires signed acquisition manifests (protected keys), independent RFC 3161 timestamps, external anchoring of ledger heads, WORM object storage, access logs, clock provenance, key rotation and custody transfer signatures. Hashes do not validate sensor accuracy.

## Next implementation milestones
1. Data adapters: SAR SLC/metadata, GPR trace+antenna parameters, LAS/LAZ, GeoTIFF and archival imagery.
2. Versioned calibration packages by sensor/soil/geometry/time period; physical forward model adapters.
3. Correlated multivariate likelihood with estimated joint covariance; unknown-class and out-of-distribution rejection.
4. Registration and temporal change uncertainty; Monte Carlo propagation of nuisance parameters.
5. Pre-registered blind trials; grouped train/test splits by site, date, acquisition campaign and hardware; calibration plots and reliability metrics.
6. Signed provenance DAG, WORM retention, external time authority and reproducible export.

## Model validation
Report per-stratum false alarm rate, sensitivity, precision-recall, Brier score, log loss, expected calibration error, abstention rate, and geolocation uncertainty. Establish acceptance thresholds before opening the blind test set. Do not equate a metal likelihood with a remains likelihood.

## New executable historical-grid pipeline
From the directory *containing* `hfmr/`:

```bash
python -m unittest discover -s hfmr -t . -v
python -m hfmr analyze --case DEMO-001 --input hfmr/examples/synthetic_grid.csv --output demo_run
python -m hfmr verify --output demo_run
```

`analyze` accepts rectangular numeric CSV grids, optionally `--before` (same shape), `--threshold`, and a georeferencing triplet `--cell-size-m 1 --origin-x 500000 --origin-y 4500000 --crs EPSG:32613`. It produces a JSON manifest, candidate features, a hash-chain ledger and expected head; with georeferencing it also emits point GeoJSON. **Never assign geographic coordinates without an independently validated CRS and grid transform.**

The detector uses median/MAD normalized residuals and connected components; its scores are **not material likelihoods** and are **not probabilities of remains**. It is an end-to-end reproducibility and anomaly-workflow prototype, not a validated forensic instrument. Rasterio/PDAL/SAR SLC/GPR proprietary readers, electromagnetic inversion, registration error propagation, digital signatures, external time stamping, calibration fitting, dashboards and video rendering remain future engineering work.

### Acceptance and blind testing plan
Use pre-registered thresholds, separate test sites/acquisition campaigns, include ordinary debris and undisturbed terrain, quantify per-site false positives and missed targets, compare independent annotators, and evaluate calibration reliability and spatial uncertainty. Do not infer metal identity or human remains from a generic scalar anomaly detector.

## Historical geospatial ingestion (v1)
Requires `pip install numpy rasterio` (Python 3.10+). Reads GeoTIFF bands and geospatial metadata; warps the later raster onto the earlier raster's grid, preserves nodata, calculates pixelwise differences, extracts robust anomalies, and writes `difference.tif`, `candidates.geojson`, `manifest.json`, and a hash ledger. Both inputs must have valid CRSs and scientifically comparable numeric values. This is **not** a radiometric, SAR phase, or LiDAR point-cloud calibration engine.

```bash
python -m hfmr inspect --input old.tif
python -m hfmr historical --case CASE-001 --before old.tif --after new.tif --output run001
python -m hfmr verify --output run001
python -m unittest discover -s hfmr -t . -v
```

**IMPORTANT:** Old and new rasters must represent the same physical quantity, units, vertical datum (if elevations), and compatible measurement conditions. Warping alone cannot ensure physical comparability. Geographic coordinate output is only as reliable as input georeferencing; no spatial uncertainty estimate is produced. The original data is never modified. Hash-chain head must be anchored independently to provide tamper-evidence against full replacement. Do not use candidate locations as established remains evidence.
