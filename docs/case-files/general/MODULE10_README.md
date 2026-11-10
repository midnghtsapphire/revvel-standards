# Module 10 — Case 001 Live Acquisition Runner

This version extends Module 9 with schema verification, separate historical address variants, provenance-preserving raw query snapshots, parcel candidate extraction, and explicit per-layer failures.

## Live run
```bash
python -m unittest discover -s hfmr -t . -p 'test_*.py' -q
python -m hfmr.case001_acquire_cli --output case001_live_002 --number 1546 --street HIGH --start 2000 --end 2010
```
Run from the project root with network access to `gis.columbus.gov`.

**Important:** The package was built/tested offline. A live DNS attempt from the build environment failed, so **no authentic permit records have been acquired**. The client searches three address forms separately, but the City GIS layer might not cover 2006. An empty result is not evidence that no records exist. Parcels extracted from current permit records are candidates, not verified 2006 parcel identities.

**Verified public GIS metadata:** `https://arc.columbus.gov/arcgis/rest/services/Schemas/BuildingZoning/MapServer/layers` lists Building Permits (5), Site Engineering Permits (22), and their fields. The runtime client currently uses the equivalent `gis.columbus.gov` host.

**Next practical action:** Run against a network-enabled machine, inspect saved `acquisition_report.json` and raw query files; then obtain Accela documents and archived parcel maps by record/parcel ID. Document dates are not concrete pour dates.
