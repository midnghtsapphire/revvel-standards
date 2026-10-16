# Forensic Finders — Case 001: Brian Shaffer

This starter case workspace adds a sourced historical-data discovery registry to the HFMR historical ingestion prototype. No actual CLIF imagery or LiDAR data is bundled, and no case-specific anomaly has been detected.

## Prioritized acquisition

1. Download and inspect the CLIF 2006 sample and auxiliary timestamps from the official AFRL archive. Determine the exact collection date, footprint, registration, and camera coverage before making any case-relevance claim.
2. Obtain historical 2005–2007 Franklin County GIS snapshots and check building footprints, parcel changes, and construction records.
3. Inspect Ohio LiDAR tile metadata to identify *acquisition* dates, then choose pre/post-2006 comparison datasets only if actually available.
4. Verify georeferencing, spatial resolution, vertical datum and acquisition times. Never treat imagery pixel differences as metal detection.

## Run HFMR on compatible georeferenced rasters

```bash
pip install numpy rasterio
python -m hfmr inspect --input before.tif
python -m hfmr historical --case FF-001-BRIAN-SHAFFER --before before.tif --after after.tif --output results
python -m hfmr verify --output results
```

Only compare equivalent measurement types and carefully assess registration, seasonal differences, land use and sensor limitations. The existing pipeline is a research prototype, not a forensic-grade identification system.

## Source registry

See `source_registry.csv` and `case_manifest.json`.

## Module 2: Archive discovery and evidence intake

Run from the extracted package root:

```bash
python -m hfmr archive-sources --registry source_registry.csv
python -m hfmr archive-inspect --input /path/to/old.tif
python -m hfmr archive-register --case CASE001 --source-id MY-ARCHIVE-001 --input /path/to/old.tif --output evidence/MY-ARCHIVE-001.json
python -m hfmr archive-verify --manifest evidence/MY-ARCHIVE-001.json --input /path/to/old.tif
python -m unittest discover -s hfmr -t . -p 'test_*.py'
```

Acquisition dates must be documented independently of upload or publication dates. To add a verified date, supply `--acquired 2006-04-01 --acquisition-basis 'source metadata: <exact citation>'`. Never infer a date from the file name alone. Source registry URLs are research leads, not confirmed downloads. This module works offline, does not download source data, and cannot establish case relevance, identify metal, or authenticate that source metadata is truthful. A SHA-256 manifest detects changes only when its reference hash is itself trusted; production signatures and external timestamping remain future work.
