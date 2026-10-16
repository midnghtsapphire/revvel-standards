# Forensic Finders — Integrated Release, Modules 1–16 (research prototype)

## Added in this release
- **12 Document Intelligence**: exact-line extraction from TXT/MD/CSV/JSON; optional `pypdf` for embedded PDF text. Scanned PDFs and photographs require an external OCR/vision adapter; no pretend extraction.
- **13 Evidence Reconciliation**: exact normalized permit identifier cross-reference; no fuzzy joins without documented aliases.
- **14 Physics Feasibility**: SAR complex SLC, baselines, geometry, coherence gates; GPR time/position/velocity gates; LiDAR point/datum gates.
- **15 Evidence Quality**: missing provenance statistics and independent source groups; NOT a human-remains likelihood.
- **16 Integrity & QA**: recursive SHA-256 manifest verification, tests, release inventory, and technical gap audit.

## Quick start
```bash
python -m unittest discover -s hfmr -t . -p 'test_*.py' -q
python -m hfmr.evidence_engine extract --input records.txt --output output/extracted.json
python -m hfmr.evidence_engine compatibility --metadata sensor.json --output output/feasibility.json
python -m hfmr.evidence_engine quality --inventory sources.json --output output/readiness.json
# Original: python -m hfmr.evidence_engine verify --root case001
#   case001 holds no *.sha256 manifests, so that run checked nothing. Verify a bundle that
#   has them, e.g. a Module 9 acquisition output (it writes a .sha256 beside every file):
python -m hfmr.case001_cli --output case001_evidence
python -m hfmr.evidence_engine verify --root case001_evidence
```

`verify` exits 1 (and reports `"valid": false`) when the root is missing, contains no `*.sha256` manifests, or any manifest fails.

## Remaining engineering work (NOT claimed complete)
1. Run live Columbus acquisition and obtain genuine records (not accomplished here).
2. Verify actual parcel IDs, API field names and schema against live endpoint.
3. Accela public portal document discovery/export; attachment APIs may not be public.
4. Optional Docling OCR integration with per-page bounding-box provenance and measured OCR error.
5. LiDAR/SAR/GPR actual geospatial calibration and validation against labeled negative controls.
6. Signed manifests, append-only external evidence storage, controlled redactions, and chain-of-custody validation.
7. Calibrated probabilistic material likelihoods require measured sensor error models, independent controls, and ground truth; do not invent confidence scores.
8. Real-world case-specific evidence review and independent verification before public allegations.

## Scientific research updates
- OGC STAC API 1.0: <https://docs.ogc.org/cs/25-005/25-005.html>
- PySTAC client conformance: <https://github.com/stac-utils/pystac-client>
- Docling document extraction: <https://github.com/docling-project/docling>
- gprMax 4: <https://gprmax.org/>

## Provenance and accuracy
A code test pass does not demonstrate a real historical record download, forensic validation, or proof of remains. The older modules remain prototypes. All results should distinguish observed source evidence, inferred possibilities, and simulated data.
