# Real-data scripts

These are replacements for the parts of the pipeline that returned typed-in
numbers. Every output row names the file or scene it came from.

No patent material is included. Outputs from real runs (CSVs, the case
registry, logs) are not committed; the scripts regenerate them.

## What each script does and where its data comes from

| Script | Replaces | Real data source | Runs here? |
| --- | --- | --- | --- |
| `s2_ndvi.py` | NDVI values in `sentinel_wayback_satellite_math_matrix`, `multi_year_ndvi_signals` | Sentinel-2 L2A scenes, AWS open data (`sentinel-cogs`) | Yes |
| `dem_terrain.py` | `run_county.py` random terrain; the slope/slide model in the Whisper deck; "LiDAR depression" claims | Copernicus GLO-30 (AWS), or your own DTM GeoTIFF | Yes |
| `weather_history.py` | The temperature and snowfall figures in the slide decks | ERA5 reanalysis via Open-Meteo | No: host blocked here |
| `image_phash.py` | The hard-coded hashes in `image_comparison_features.csv` | Your actual image files | Yes (offline) |
| `qpcr_interpret.py` | `edna_dna_forensic_engine.py` fixed read counts and match % | A lab's qPCR plate export | Yes (offline) |
| `archive_collector_cli.py` | (your script, fixed) | Wayback CDX, USENET, local JSONL | Ingest yes; Wayback blocked here |
| `stage2_validation_gate.py` | (your script, unchanged copy) | The stage-0 database | Yes |

Fixes made to your scripts (the original lines are kept as comments):

- **`archive_collector_cli.py`**:
  - `nntplib` was removed from Python 3.13, so the whole CLI crashed at import. It is now optional.
  - Wayback URL changed to `https`.
  - The default database path is no longer `/workspace`.
- **`stage2_validation_gate.py`**: unchanged apart from formatting and an
  unused import.
- **`run_county.py`** (not in this folder): its `print("\n…")` lines were
  broken across two lines, so it would not start. Its terrain sweep also uses
  random noise when no tile is given; `dem_terrain.py --before/--after` does
  the real DEM change instead.

## Case registry (all files, in order)

`build_case_registry.py` reads every CSV, JSON, SQLite and Python registry in
the folders you give it. It never runs the Python files; it parses their
literal dicts with `ast`.

- **What it keeps.** Every coordinate, confidence, depth, elevation and
  status, each with the file and row it came from. Nothing is merged or
  dropped.
- **How it groups coordinates.** Coordinates within 100 m of each other count
  as one place. The spread between places is reported per case.
- **What `--elevation` adds.** The real Copernicus elevation at each place,
  plus a claimed-vs-real check wherever a file states an elevation.

Outputs: `claims.csv`, `coordinates.csv`, `elevation_checks.csv`,
`case_summary.json` and `case_registry.sqlite`.

```sh
python build_case_registry.py --in UPLOADS_DIR --in extracted_zips/ --out-dir registry/ --elevation
```

## Commands

```sh
python s2_ndvi.py --lat 36.62 --lon -94.41 --start 2026-09 --end 2026-10 --out lindeman.csv
python s2_ndvi.py --lat 50.8782 --lon -119.9075 --start 2017-07 --end 2025-08 --months 7 8 --out shtuka.csv
python dem_terrain.py --lat 50.8782 --lon -119.9075 --radius-m 1500 --mu 0.3 0.45 0.6 --out-prefix out/td
python dem_terrain.py --dem my_1m_dtm.tif --lat .. --lon .. --radius-m 200 --out-prefix out/site   # 1 m data
python dem_terrain.py --before dtm_2018.tif --after dtm_2025.tif --lod-m 0.10 --out-prefix out/change
python weather_history.py --lat 50.884 --lon -119.882 --start 2018-02-16 --end 2018-02-18 --tz America/Vancouver --out wx.csv
python image_phash.py photos/*.jpg --out hashes.csv --pairs pairs.csv
python qpcr_interpret.py plate.csv --lod95-ct 36 --loq-ct 33 --pos-ct 22 26
python -m unittest test_realdata     # 24 offline tests with known answers
```

Needs: numpy, scipy, rasterio and Pillow; mgrs is used only by the tile-check
test. Without them, the raster and image tests skip and the qPCR, weather and
registry tests still run.

## Limits that come with the data

- **Sentinel-2 pixels are 10 m.** It can show a change in vegetation over a
  patch, not one tree or one grave.
- **Copernicus GLO-30 is a 30 m surface model.** Trees and buildings are
  included, so it shows slopes, gullies and drainage paths. For grave-scale
  work, pass a 1 m bare-earth DTM with `--dem` (NRCan HRDEM, USGS 3DEP or a
  drone survey).
- **ERA5 is a ~25 km grid.** A weather station record beats it when one
  exists.
- **pHash matches copies of the same photo.** It does not recognise the same
  animal or person in two different photos.
- **qPCR "DETECTED" is the lab's call about DNA in the tube.** Identifying a
  person needs the lab's profile comparison.
