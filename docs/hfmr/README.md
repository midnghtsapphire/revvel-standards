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

## Changes since the original upload

All original logic is kept. Each fix below adds code, and each has a test in
`test_hfmr.py`.

1. **Out-of-distribution abstention.** If no hypothesis explains the
   observations within 4 combined standard deviations (`OOD_Z_LIMIT`), `infer`
   returns `decision: "abstain"` and `posterior: None`. Before, a reading of
   `1e6` reported 100% for whichever hypothesis was least bad.
2. **Model coverage checks.** `means` and `intrinsic_sd` must cover every
   hypothesis, and every observed sensor must be calibrated, or you get a clear
   `ValueError` instead of a raw `KeyError`.
3. **Corrupt ledgers fail verification instead of crashing.** A truncated or
   garbage line makes `verify()` return `False`.
4. **Concurrent appends are safe.** `append` holds an exclusive file lock
   (POSIX) across read-then-write. Without it, 20 concurrent writers broke the
   chain in 10 of 10 trials.
5. **Empty input is rejected.** `infer([])` raises instead of silently
   returning the priors.

Formatting was also updated to pass the repository's flake8 gate.

Run the tests from the repo root:

```bash
python3 -m unittest discover -s docs/hfmr -t docs -v
```

The merged modules use package-relative imports, so `-t docs` is now required.

## Forensic Finders modules 2–9 (merged 2026-10-16)

The uploaded modules 2, 3, 4, 8 and 9 build on each other, and module 9 contains
everything in the earlier ones. Its package files are merged here. The two
module 3 uploads were byte-identical. `hfmr.py` and `test_hfmr.py` stay at the
fixed versions above. Module 9's own `hfmr.py` was the original prototype without
those fixes, and the rest of the package passes its tests against the fixed one.

Changes from the upload:

- Code was reformatted to pass the flake8 gate. A syntax-tree comparison
  confirmed formatting changed no logic.
- Unused imports and the star imports in the tests are commented out, not
  deleted. Each has an explicit replacement next to it.
- One exception variable that was bound but never read is handled the same
  way.

Where things are:

- `case001/` holds the Case 001 registry, manifest, unverified timeline and
  README.
- `modules/` holds each module's README as received, plus the package README
  (`PACKAGE_README.md`).

Run from `docs/` (the tests use package-relative imports):

```bash
cd docs
python3 -m unittest discover -s hfmr -t . -p 'test_*.py'
python3 -m hfmr analyze --case DEMO-001 --input hfmr/examples/synthetic_grid.csv --output demo_run
```

`test_historical.py` needs `numpy` and `rasterio`. The other tests use the
standard library only.

## Modules 10–17 and the records-retrieval repo (merged 2026-10-16)

Added from the uploads:

- `case001_acquire*` (module 10)
- `records_followup*` (module 11)
- `evidence_engine.py` (modules 12–16)
- `intake17.py` (module 17)
- `auto_retrieve.py`, from the automated records repo, which is a superset of
  module 17

Notes on the merge:

- Every file these uploads share with module 9 was byte-identical to it.
- The two module 17 uploads were identical.
- `test_auto_retrieve.py` moved from the repo's top-level `tests/` into the
  package. Its absolute import and path hack are commented out next to the
  relative import that replaces them.
- The new modules' READMEs, the engineering audit and both GitHub workflows
  are in `modules/`. The workflows are stored as `.yml.txt` so they don't run
  in this repository. If they're used in their own repository,
  `actions/checkout@v4`, `setup-python@v5` and `upload-artifact@v4` should be
  pinned to commit SHAs first (CLAUDE.md gotcha 8).
- `auto_retrieve.py` allows `gis.columbus.gov`, `arc.columbus.gov` and
  `maps2.columbus.gov`, which settles the host mismatch below for that client.

### Open points found while merging

- **Two different Columbus GIS hosts.** `columbus.py` (module 8) allows only
  `arc.columbus.gov`. `case001_live.py` (module 9) allows only
  `gis.columbus.gov`. Both serve
  `/arcgis/rest/services/Schemas/BuildingZoning/MapServer`. Neither host can be
  reached from the build session, so it's still unconfirmed which one is live.
- **Two different reference coordinates.** `case001/case_manifest.json` uses
  39.99401, -83.006497 for 1546 N High St. The "vault" coordinate in the
  Shaffer KML, eval JSON and stratigraphy deck is 39.9985, -83.0064, about
  499 m north of that address. Queries by parcel or address won't cover the
  KML polygons unless both points are searched.
- **Depth figures that disagree.** The stratigraphy deck gives "17 feet
  (approx. 1.15 m)". 17 ft is 5.18 m, and 1.15 m is 3.8 ft.
