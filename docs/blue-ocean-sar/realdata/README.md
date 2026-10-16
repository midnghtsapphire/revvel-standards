# Real-data scripts

These are replacements for the parts of the pipeline that returned typed-in
numbers. Every output row names the file or scene it came from.

No patent material is included. Outputs from real runs (CSVs, the case
registry, logs) are not committed; the scripts regenerate them.

## What each script does and where its data comes from

| Script | Replaces | Real data source | Runs here? |
| --- | --- | --- | --- |
| `s2_ndvi.py` | NDVI values in `sentinel_wayback_satellite_math_matrix`, `multi_year_ndvi_signals` | Sentinel-2 L2A scenes, AWS open data (`sentinel-cogs`) | Yes |
| `s2_change.py` | "brush clearing near the pond" and similar change claims in the Lindeman decks | Sentinel-2 L2A scenes, AWS open data (`sentinel-cogs`) | Yes |
| `dem_terrain.py` | `run_county.py` random terrain; the slope/slide model in the Whisper deck; "LiDAR depression" claims | Copernicus GLO-30 (AWS), or your own DTM GeoTIFF | Yes |
| `microtopo.py` | The M-TMAT method in the uploaded guide (it had no code) | Two of your DEMs, or USGS 3DEP 1 m project tiles (AWS, `prd-tnm`) | Yes |
| `weather_history.py` | The temperature and snowfall figures in the slide decks | ERA5 reanalysis via Open-Meteo | No: host blocked here |
| `image_phash.py` | The hard-coded hashes in `image_comparison_features.csv` | Your actual image files | Yes (offline) |
| `qpcr_interpret.py` | `edna_dna_forensic_engine.py` fixed read counts and match % | A lab's qPCR plate export | Yes (offline) |
| `archive_collector_cli.py` | (your script, fixed) | Wayback CDX, USENET, local JSONL | Ingest yes; Wayback blocked here |
| `realtime_validation_listener.py` | (your script, fixed: it imported a class and called a method that do not exist) | POSTed JSON records -> stage-0 DB -> Stage 2 gate; `realtime-listener.service` runs it under systemd | Yes (local) |
| `stage2_validation_gate.py` | (your script, unchanged copy) | The stage-0 database | Yes |
| `field_log.py` | `taphos_serial_parser.py` ("VALIDATED" for any value present, always ONLINE) | Your Taphos-Stick field log CSV | Yes (offline) |
| `lab_readers.py` | GC-MS and 16S tabs of `ryverly_recon_app-v6.py` (typed-in peaks and abundances) | A lab's TIC export (CSV/mzML) and 16S feature table | Yes (offline) |
| `fusion.py` | The "SFAI probability" and PMI decay curves in `ryverly_recon_app-v6.py` | Outputs of the tools above, with your weights | Yes (offline) |
| `ryverly_app.py` | The rest of `ryverly_recon_app-v6.py` (fake alert logs, street-address default) | Files you upload | Needs streamlit |

Fixes made to your scripts (the original lines are kept as comments):

- **`archive_collector_cli.py`**:
  - `nntplib` was removed from Python 3.13, so the whole CLI crashed at import. It is now optional.
  - Wayback URL changed to `https`.
  - The default database path is no longer `/workspace`.
<!-- Original entry: "`stage2_validation_gate.py`: unchanged apart from
formatting and an unused import." -->
- **`stage2_validation_gate.py`**: it no longer judges every record against
  the Shaffer (Columbus 2006) logs by default. Without `--ground-truth FILE`
  or `--use-shaffer-default` it leaves records `unverified`. Keywords in
  negated or search-report sentences are kept speculative, and gaps match
  their own keywords. `realtime_validation_listener.py` takes the same flags.
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

## Terrain change between two lidar surveys (`microtopo.py`)

`microtopo.py` compares two bare-earth DEMs of the same ground. It reports
where the ground surface rose or dropped by more than the survey error.

- **Inputs.** Either `--baseline OLD.tif --recent NEW.tif` (any CRS), or
  `--lat/--lon/--radius-m`. The second form looks up every USGS 3DEP 1 m
  project over the window in the `FESM_1m.gpkg` index on the public
  `prd-tnm` bucket, reads each project's tile metadata for the lidar
  collection dates, and uses the oldest and newest projects. It reads only
  the window, by HTTP range request.
- **Method.** Both DEMs go onto a 1 m grid in the baseline CRS. The median
  dZ over the window is removed as a vertical offset (different geoid
  models alone shift projects by tens of centimetres). A cell counts only if
  `|dZ| > t * sqrt(s1^2 + s2^2)`; the defaults are 0.10 m RMSE per survey
  (QL2) and t = 1.96, so 0.28 m. Patches of 2 m2 or more become
  `fill_mound` or `excavation_pit` anomalies. A local relief model and a
  sky-view factor of the newer surface are written alongside.
- **Outputs.** `dz.tif`, `lrm.tif`, `svf.tif`, `ledger.csv`,
  `anomalies.geojson` and `anomalies.kml`. Each anomaly has a centroid, area,
  mean and peak dZ, volume, and distance (m, ft) and true bearing from the
  reference point. `manifest.json` records the S3 keys, collection dates,
  parameters, the removed offset, the threshold and a SHA-256 for every file.
- **Exit codes.** 0 when the analysis ran (no anomalies is a valid result);
  2 when the DEMs do not overlap or hold no data; 3 when fewer than two 3DEP
  surveys cover the window. Code 3 still writes a manifest listing what was
  found.

Limits:

- Many places have only one 3DEP 1 m survey. On 2026-10-16, 30.910 N,
  91.280 W (St. Francisville, LA) had only `LA_CPRA_2019_C20`, so no change
  map is possible there from 3DEP alone.
- A dZ patch is a change in the mapped ground surface. Earthworks, farming,
  erosion, buildings, dense vegetation classed as ground, and different
  processing between projects all produce one. The tool cannot tell these
  apart, and every anomaly needs checking on the ground.
- Only a constant vertical offset is removed. A horizontal shift or a tilt
  between surveys shows up as paired rises and drops on slopes.
- Urban windows show many patches where buildings were removed differently
  in each project.
- The point clouds in `usgs-lidar-public` (Entwine) are not used.

## Commands

```sh
python s2_ndvi.py --lat 36.62 --lon -94.41 --start 2026-09 --end 2026-10 --out lindeman.csv
python s2_ndvi.py --lat 50.8782 --lon -119.9075 --start 2017-07 --end 2025-08 --months 7 8 --out shtuka.csv
python s2_change.py --lat 36.6534 --lon -94.4418 --radius-m 1609 --before 2026-09-12 2026-09-12 --after 2026-09-17 2026-09-17 --out-dir out/lindeman_change
python dem_terrain.py --lat 50.8782 --lon -119.9075 --radius-m 1500 --mu 0.3 0.45 0.6 --out-prefix out/td
python dem_terrain.py --dem my_1m_dtm.tif --lat .. --lon .. --radius-m 200 --out-prefix out/site   # 1 m data
python dem_terrain.py --before dtm_2018.tif --after dtm_2025.tif --lod-m 0.10 --out-prefix out/change
python microtopo.py --lat 29.999 --lon -90.260 --radius-m 150 --out-dir out/msy        # 3DEP 2017 vs 2021
python microtopo.py --baseline dtm_2015.tif --recent dtm_2022.tif --out-dir out/site    # your own DEMs
python weather_history.py --lat 50.884 --lon -119.882 --start 2018-02-16 --end 2018-02-18 --tz America/Vancouver --out wx.csv
python image_phash.py photos/*.jpg --out hashes.csv --pairs pairs.csv
python qpcr_interpret.py plate.csv --lod95-ct 36 --loq-ct 33 --pos-ct 22 26
python -m unittest test_realdata     # 24 offline tests with known answers
python -m unittest test_microtopo    # 18 offline tests for microtopo.py
```

Needs: numpy, scipy, rasterio and Pillow; mgrs is used only by the tile-check
test. Without them, the raster and image tests skip and the qPCR, weather and
registry tests still run.

## Field log, lab exports and site ranking

### `field_log.py`

Checks each row of a Taphos-Stick field log (columns `Subsystem`,
`Parameter`, `Expected_Threshold`, `Actual_Field_Value`) against its own
threshold. Thresholds can be `>= 12`, `< 0.5`, `12-20`, `85%` (a bare value
is read as a minimum; change with `--bare-number`) or exact text such as
`RTK Fix`. Quote text that contains digits.

- **Row status.** `PASS`, `FAIL`, `PENDING` (no value) or
  `UNPARSEABLE_THRESHOLD`.
- **Overall status and exit code.** `PASS` exits 0, `FAIL` exits 1, and
  `INCOMPLETE` (pending or unparseable rows, or no rows) exits 2. A missing
  file or missing column also exits 2.
- **What it does not do.** It does not report whether the device is online.
  The report covers only what the log records.

```sh
python field_log.py ops-log.csv --out field_log_report.json
cat ops-log.csv | python field_log.py - --out report.json
```

### `lab_readers.py`

- **GC-MS (`gcms`).** Reads a sample and a control total-ion chromatogram
  (CSV `retention_time_min,intensity`, or mzML when pyteomics or pymzml is
  installed). It finds peaks and integrates their areas above a local
  baseline. For each target in your method file it reports whether a peak
  sits within the tolerance of the expected retention time, plus the sample
  area, control area and ratio.
- **Method file.** Retention times depend on the column and method, so they
  come from your method file. `gcms_method.example.json` is an example with
  placeholder times, and it is refused unless you pass
  `--allow-example-method`.
- **No identification.** A peak at the expected time is not an
  identification; that needs the mass spectrum and a reference standard.
- **16S (`16s`).** Reads a QIIME 2 / biom TSV feature table (taxonomy in a
  column, in `--taxonomy taxonomy.tsv`, or as the row ID) or a long CSV
  `taxon,sample,count`. It sums counts to a rank and reports relative
  abundance and fold change, sample vs control, with a pseudocount on the
  counts. One sample against one control is a description, not a test.

```sh
python lab_readers.py gcms --sample eff.csv --control ctrl.csv --method my_method.json --out gcms.json
python lab_readers.py 16s --table feature-table.tsv --sample EFF-A1 --control CTRL-A1 --rank family --out 16s.json
```

### `fusion.py`

Ranks sites from layer values you supply: a CSV keyed by site ID, point
features from `dem_terrain.py` or `s2_change.py` JSON (nearest within a set
distance), or a GeoTIFF sampled at each site (needs rasterio). Each layer is
normalised across the sites (robust z or rank percentile) and weighted by
the weight in your config file.

- **Traceable.** Every site lists each layer's raw value, source, normalised
  value, weight and contribution, so the score can be recomputed by hand.
- **No built-in weights.** There are no default weights and no time-decay
  curves. If you want weights that depend on elapsed time, put them in the
  config.
- **Not a probability.** The score ranks these sites under these weights. It
  does not say anything is buried at any of them.

```sh
python fusion.py --config fusion_config.json --out ranked_sites.json --csv ranked_sites.csv
```

### `ryverly_app.py`

An optional Streamlit viewer (`streamlit run ryverly_app.py`). It shows a
`fusion.py` output, a GC-MS sample/control pair and a 16S table that you
upload. With nothing uploaded it shows empty tabs. It has no sample data and
no alerting, and it has no default location; a search centre appears only
if you type coordinates.

Tests (offline, synthetic data with known answers):

```sh
python -m unittest test_field_log test_lab_readers test_fusion
```

The field-log, 16S and table-fusion tests need only the standard library.
The GC-MS tests need numpy, and the raster-layer test needs rasterio.

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
- **A GC-MS peak at the expected retention time is a candidate.** Naming the
  compound needs its mass spectrum and a reference standard.
- **A `fusion.py` score is a ranking.** It is only as good as the layers and
  weights you give it.

## Lost-person-behaviour rings

`lost_person_behavior.py` draws search-planning rings from the June 2003 UK
handbook *Missing Person Behaviour - An Aid to the Search Manager* (Perkins,
Roberts and Feeney). The numbers are in `lpb_mpb2003.json`, copied as printed,
with the page number on every table.

- **What is in the data.** Each category has distances from the IPP in 10%
  steps (km and miles, as printed), with the sample size. Most categories have
  two tables: the UK study and a US/Canadian table adapted from Hill or
  Koester. Survivability and where-found percentages come from the UK study.
  Behaviour notes are short strings.
- **What is not.** Fishermen, climbers and skiers have notes only. Hunters
  have no UK table. The handbook does not split any category by terrain, and
  it prints no 25%, 75% or 95% rows. Rings at those values are interpolated
  and marked as such.
- **Rows that disagree.** A few rows have km and miles values that do not
  match. They are kept as printed and listed under `transcription_flags`. The
  maps use the km column.
- **What the output means.** The rings and the `--grid` probability-of-area
  grid are a planning prior for the size of a search area. They do not
  predict where a person is, and figures from other regions and eras differ.

```sh
python lost_person_behavior.py --list
python lost_person_behavior.py --category hikers --lat 54.5 --lon -3.1 --out out/lpb
python lost_person_behavior.py --category misc_adults --lat .. --lon .. --out out/lpb --find LAT LON --grid
python -m unittest test_lost_person_behavior   # numpy only for the grid tests
```

Outputs: `rings.geojson`, `rings.kml` and `summary.json` (citation, pages,
sample size and notes), plus `grid.geojson` with `--grid`. The tool exits 2
for an unknown category. It exits 3 when the handbook has no distance table
for the category; `summary.json` is still written in that case.

## Riverine recovery tools

Built from `riverine_recovery_method.md`, `drift_modeling_note.md` and
`sar_repository_schema.json` in `docs/case-files/general/`.

| Script | What it does | Data source | Runs here? |
| --- | --- | --- | --- |
| `evidence_scoring.py` | Admiralty A-F / 1-6 codes, ranked clue table, geography gate, case-record validation | Case JSON or clue CSV | Yes (offline) |
| `usgs_gauges.py` | NWIS IV discharge, gauge height and water temperature; gauge-mismatch flag | `waterservices.usgs.gov/nwis/iv/` or a saved response | Parsing yes; live host blocked here |
| `drift_envelope.py` | Probability-weighted envelope downstream of the LKP, snag spikes, refloat note | Your inputs; optional centreline GeoJSON | Yes (offline) |

- **Sort order.** Source first, then credibility, then physical anchors
  within a tie. So `A3` ranks above `B1`.
- **Geography gate.** E/F sources and credibility 5/6 never set search
  geography. Only an A-tier physical anchor with credibility 1-3 may.
  Everything else informs the model but does not place the search.
- **Which gauge governs.** `usgs_gauges.py` flags gauges that differ by more
  than 3x. It cannot tell which gauge governs the reach. You say so with
  `--governing`, after placing the incident relative to confluences and dams.
- **Envelope, not a distance.** Cells (100 m) carry probability, cumulative
  mass and a search rank. Accessibility changes the rank only. Cleared cells
  go to 0 and the rest is renormalised.
- **The naive estimate is rejected.** The velocity x time figure appears in
  `summary.json` marked `REJECTED`, with the reasons, and is never used.
- **What is assumed.** The decay median (0.5 mi), the snag multipliers and
  the refloat band edges are assumptions. Change them for the case.
- **What is measured.** Only what you pass in: the LKP, gauge readings and
  water temperature.

```sh
python evidence_scoring.py validate ../../case-files/general/sar_case_records.json
python evidence_scoring.py rank --case ../../case-files/general/sar_case_records.json --out ranked.csv
python usgs_gauges.py --sites 12439500,12442500 --start 2026-05-27T00:00-07:00 --end 2026-05-28T23:59-07:00 \
    --governing 12442500 --obvious 12439500 --out-csv iv.csv --out-json compare.json
python usgs_gauges.py --from-file saved_iv.json --governing 12442500 --obvious 12439500
python drift_envelope.py --case ../../case-files/general/sar_case_records.json --case-id OKANOGAN-2026-05-27 \
    --elapsed-hours 25 --feature strainer_logjam:650:Logjam-1 --centreline reach.geojson --out-dir out/okanogan
python -m unittest test_evidence_scoring test_usgs_gauges test_drift_envelope
```

`fixtures/nwis_iv_synthetic_okanogan.json` has the layout of an NWIS IV
response, but its numbers are made up for the tests. They are not gauge
readings.

## Search theory: coverage, POD and POA updates (`search_theory.py`)

This script is built from the WiSAR field checklist and the Bayesian calculator
workbook in `docs/case-files/general/`. It does the workbook's arithmetic from
a segments CSV and adds three things the workbook leaves out:

- **A Rest Of World segment.** A row named `ROW` holds the chance that the
  person is outside every mapped segment. Without it, an unsuccessful search
  pushes all of that probability onto the segments.
- **Cumulative POD.** Repeated passes over a segment combine as
  1 - (1 - POD1)(1 - POD2)...
- **Input checks.** POA must sum to 1, areas must be positive and POD must
  stay between 0 and 1.

The formulas are the standard exponential detection model:

- Coverage C = TTL x W / A, and POD = 1 - e^-C.
- Probability density Pden = POA / A, and PSR = W x V x Pden. PSR ranks the
  tasking.
- After an unsuccessful round, POA' = POA x (1 - POD) / (1 - sum of POS).

```sh
python search_theory.py segments.csv --out result.json
python search_theory.py segments.csv --passes passes.csv --add-factor 2 --out result.json
python -m unittest test_search_theory
```

`segments.csv` has the columns `name, area_km2, poa`, and optionally
`ttl_km, sweep_width_km, speed_kmh, pod`. `passes.csv` has one row per later
pass: either `name, pod`, or `name, ttl_km` with `sweep_width_km` or `add_km`.

The first POA is a judgement or a lost-person-behaviour prior. The update only
moves that probability around, and the outputs are planning numbers. Bad input
exits with code 2.
