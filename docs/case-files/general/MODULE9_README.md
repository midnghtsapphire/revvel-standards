# Module 9 — CASE001 Live Public Permit Acquisition & Reconciliation

This module connects to two **real** public Columbus ArcGIS REST layers: Building Permits (layer 5) and Site Engineering Permits (layer 22), both under `https://gis.columbus.gov/arcgis/rest/services/Schemas/BuildingZoning/MapServer`.

## Run

```bash
python -m unittest discover -s hfmr -t . -p 'test_*.py' -q
python -m hfmr.case001_cli --output case001_live_001 --number 1546 --street HIGH --start 2000 --end 2010
```

Outputs: `building.json`, `site_engineering.json`, `reconciliation.json`, and `.sha256` manifests. If either source fails, the report records errors and marks retrieval incomplete. A successful request may return zero records; zero records does **not** prove the absence of construction or permits. This query is broad and may return unrelated addresses; validate address/parcel identities manually. Output directory must be empty; never overwrite evidence.

## Verification state

- ArcGIS layer URLs and fields checked against publicly indexed Columbus ArcGIS service descriptions, October 2026.
- The source package was tested using **mock network responses**. A live retrieval was attempted from the build environment but failed with network connection errors. No real CASE001 permit records are included.
- City permit GIS layers do not expose original architectural drawings or inspection photographs as layer attachments. For original records, use the city records office and public Accela portal.
- `ISSUED_DT` and `B1_FILE_DD` are permit events, not confirmed excavation or concrete pour dates.
- `SHA-256` manifests are local integrity checks, not digital signatures.

## Future improvements

Use verified historic parcel IDs; search adjacent street numbers and other historical addresses; inspect the city's public records portal and records retention policies; connect photographs and drawings with independent provenance. Never present inferred geometry as original blueprints.
