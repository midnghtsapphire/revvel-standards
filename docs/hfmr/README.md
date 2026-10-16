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
python3 -m unittest discover -s docs/hfmr -v
```
