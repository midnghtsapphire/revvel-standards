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
  the Shaffer (Columbus 2006) logs by default. The built-in Shaffer "facts"
  came from AI-generated material, named real people and cited no document,
  so they are commented out and `--use-shaffer-default` now exits 2. Ground
  truth must come from a file in which every sector cites a source document
  and a clearance date. A keyword match gives "needs review", never
  "debunked", and tips about changes after the clearance date are outside
  the clearance window. `--recheck` re-examines old verdicts. Keywords in
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
  mass and a search rank. Accessibility changes the rank only. A cleared
  reach applies a stated POD (default 0.8, an assumption) through
  `search_theory.bayes_update`; it is never treated as certain. Mass beyond
  the modelled reach is kept in a `beyond_reach` row. The median distance
  grows with elapsed time (or a stated velocity model); an earlier version
  ignored elapsed time entirely.
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

## Optimal effort allocation (`optimal_search.py`)

`search_theory.py` ranks segments. This script decides how much effort each
segment should get. It uses Koopman and Stone's optimal search theory for the
exponential detection model: maximise the sum of POA x (1 - e^(-W z / A))
with total track length equal to the budget. The solution is exact; there is
no iteration. Segments are funded in order of POA x W / A until the marginal
gains are equal.

- **Comparisons.** It reports the gain over equal effort, effort in proportion
  to POA, and greedy PSR passes.
- **Increments.** It splits the budget into increments. Each increment's
  optimal plan is nested inside the next, so stopping early is still optimal.
- **Re-planning.** After each unsuccessful increment, it updates POA with
  `search_theory.bayes_update` and re-plans.
- **Rest Of World.** The ROW segment never gets effort.

```sh
python optimal_search.py segments.csv --effort-km 40 --increments 4 --out plan.json
python optimal_search.py segments.csv --effort-hours 24 --out plan.json   # needs speed_kmh
python -m unittest test_optimal_search
```

On the workbook's example segments with 40 km of effort, the optimal plan
gives a total POS of 0.535. Greedy PSR gives 0.526, effort in proportion to
POA 0.508, and equal effort 0.455. The model's limits:

- Effort is continuous and of one type.
- There are no per-segment caps or transit times.
- The output needs rounding into real team assignments.

## Terrain-aware lost-person simulation (`lost_person_sim.py`)

This is a Monte Carlo agent model on a real DEM. Each agent walks at
Tobler's hiking speed for the local slope, v = 6 e^(-3.5 |tan(theta) + 0.05|)
km/h, multiplied by 0.6 off trails. Each agent is given one behaviour: random
walk, route following, direction sampling, downhill, or staying put. The
behaviour weights are inputs, and the defaults are written to `summary.json`
as assumptions.

Agents never cross a barrier. Barriers are the ones you supply, plus cells
with no DEM data and the grid edge. The walking time is scaled so that the
simulated median distance matches the LPB median for the category. The
residuals at 25, 75 and 95% are reported, not hidden.

Outputs:

- a probability GeoTIFF that sums to 1;
- 50, 75 and 95% containment contours;
- simulated rings next to the LPB rings;
- a segments CSV with a ROW row, which `search_theory.py` and
  `optimal_search.py` read directly.

The `update` command applies an unsuccessful search to the map:
P' = P(1 - POD) / normaliser. Cleared cells stay at zero.

```sh
python lost_person_sim.py simulate --lat 50.8766 --lon -119.9127 --category despondents \
    --hours 24 --dem copernicus_tile.tif --out out/sim --segments segments.geojson
python lost_person_sim.py update --prior out/sim/probability.tif --searched searched.geojson --out out/sim2
python -m unittest test_lost_person_sim
```

I ran it on the Copernicus GLO-30 tile for Sun Peaks (5000 agents, about
11 s). The 25% and 50% distances matched the LPB table within 0.2 km. At 75%
the simulation gave 3.4 km against the table's 4.6 km. At 95% the LPB figure
for despondents (71 km) includes vehicle travel, which a walking model cannot
reproduce, so that residual is large.

The map is a planning prior. The behaviour weights are not fitted per
category. Unmapped cliffs and rivers are not barriers unless you supply them.

## Burial timeline signature on three or more lidar surveys (`burial_signature.py`)

This is the real-data version of the uploaded `remains_anomaly_pipeline`. It
reads N >= 3 DEM GeoTIFFs with their survey years and puts them on one grid
using `microtopo.py`'s readers. Each survey can come with an uncertainty, as a
single sigma in metres or as a raster. Then it works through these steps:

1. **Per-pair change.** It computes the change between each pair of surveys
   and its propagated uncertainty. It then gives the change significance,
   1 - p = 1 - 2(1 - Phi(|dZ| / sigma)). That is a significance level, not
   the probability that a change (or a grave) is real; an earlier version
   called it "P(real change)".
2. **Burial timeline.** It looks for an earlier mound followed by later
   subsidence in the same grave-sized neighbourhood. Only (mound, sink)
   pairs whose timing fits the sink window are tried.
   - **Rejected:** ground that only rose, and ground that only sank.
3. **Significance.** It runs a Getis-Ord Gi* hotspot test on the standardised
   change, separately for each slope class. Both the mound and the sink have
   to be significant. Benjamini-Hochberg false-discovery-rate control replaces
   the fixed z cut-off that the prototype used across thousands of cells.
4. **Voids.** Black top-hat depressions with a PCA shape test sort culverts
   and vaults (linear) from grave-sized pits (compact).
5. **Candidate ledger.** It writes the candidates as CSV, GeoJSON and KML
   with q-values. A manifest records the sha256 of every input and output.
6. **Optional calibration.** With a known-sites CSV and scikit-learn
   installed, it trains a calibrated classifier with spatially blocked
   cross-validation and reports a site-level operating curve. Sites buried
   before the first survey are censored, not counted as negatives.

```sh
python burial_signature.py --epoch dtm_2012.tif 2012 0.08 --epoch dtm_2016.tif 2016 0.08 \
    --epoch dtm_2021.tif 2021 sigma_2021.tif --out-dir out/site [--sites known.csv]
python -m unittest test_burial_signature
```

Exit codes:

- **0:** the run finished (zero candidates is a valid result).
- **2:** bad input.
- **3:** fewer than three surveys, or no survey pair fits the sink window.

Every output is labelled "screening index, not a probability of a grave"
unless it was calibrated on real labelled sites.

Synthetic tests:

- **Found:** a planted mound followed by subsidence, at the right place and
  in the right survey intervals.
- **Rejected:** mound-only ground, sink-only ground, and a grave inside a
  high-uncertainty patch.
- **Noise:** pure-noise stacks gave no candidates in 50 of 50 seeds.

Limits:

- Surveys are aligned vertically only.
- Correlated lidar noise makes the significance too optimistic.
- The method is deliberately strict, so faint or old burials will be missed.
- It has not yet been run on a real stack of three or more 3DEP surveys.
- St. Francisville has only one 1 m survey, so this cannot be run there.

## Columbus public building and engineering records (`columbus_records.py`)

This is the owner's `retriever.py`, ported and hardened. It queries the City
of Columbus public ArcGIS MapServer (`gis.columbus.gov`). By default it uses
the building (5) and engineering (22) layers; `--layer name=id` changes them,
and `--list-layers` lists what the server offers. It searches for an address
and a year range.

- **Safe queries.** The where clause is built only from validated parts: a
  street of letters, digits and spaces, a house number, years, and field
  names taken from the server's own metadata.
- **Paging.** It follows the server's `maxRecordCount` and
  `exceededTransferLimit`. Truncated or incomplete results are flagged with
  the reason.
- **Raw evidence.** Every raw response, including error pages, is saved byte
  for byte. The manifest chains the hashes:
  chain_i = sha256(chain_{i-1} + sha256_i).
- **Verification.** `--verify` detects edited, deleted or reordered files.
  Keep the printed chain head somewhere else and pass it with
  `--expect-head`. This legacy chain covers only the file hashes. The URL,
  status, time and the manifest's top-level fields (case, query, completeness)
  can be edited without detection (SYSTEM_REVIEW C5).
- **Shared evidence log.** `--evidence-log DIR` also appends every raw
  response, each layer summary and the run's `manifest.json` to the shared
  `revvel-evidence/1` log in [`../evidence`](../evidence/README.md). Each entry
  hashes all of its metadata into the chain: operator (required, `--operator`
  or `EVIDENCE_OPERATOR`), host, tool version and git commit, clock state,
  URL, HTTP status, the server's `Date` header, the SHA-256 of the TLS peer
  certificate, case and run id. `--evidence-key` signs each entry with
  Ed25519. Identical responses get separate stored files. One log can hold
  every run of a case. The run directory is still written as before. The
  operator, key and log are checked before any request is sent.
- **Verifying a shared log.** `--verify DIR` recognises a shared log
  (`evidence.jsonl`) and checks it with the library. It accepts
  `--public-key`, `--expect-head`, `--court` and `--tsa-ca`.

```sh
python columbus_records.py --number 1546 --street HIGH --start 2000 --end 2010 --output evidence
python columbus_records.py --verify evidence/run_<stamp> --expect-head <hex>
python columbus_records.py --number 1546 --street HIGH --output evidence \
    --evidence-log case-014 --operator "Det. J. Smith" --evidence-key ~/keys/jsmith.key
python columbus_records.py --verify case-014 --public-key jsmith.pub --expect-head <head> --court
python -m unittest test_columbus_records
```

The shared log needs the `cryptography` package. Without `--evidence-log` the
tool still uses only the standard library.

Exit codes: 0 means complete; 1 means incomplete, truncated or a failed
verify; 2 means bad input. The host is blocked from the build sandbox, so
the tests use recorded responses. The real layer fields have not been
confirmed yet.

The address match keeps the original `LIKE '%number%street%'` pattern, so
1546 can also match 15460. Review the results by hand. No results does not
prove no construction took place.

## qPCR assay validation and quantification (`qpcr_assay.py`)

This replaces the lab half of the uploaded `field_confirmation.py`. It follows
MIQE (Bustin et al. 2009) and the eDNA LOD/LOQ approach of Forootan et al.
(2017) and Klymus et al. (2020). It uses the standard library only and reads
the same plate format as `qpcr_interpret.py`.

- **Standard curve.** It fits Ct = slope x log10(copies) + intercept and
  reports R^2, efficiency E = 10^(-1/slope) - 1 and standard errors. The
  curve fails if efficiency is outside 90-110% or R^2 is below 0.98.
- **LOD95.** It fits detection probability against log10(copies) by maximum
  likelihood (logistic or probit), with a 95% CI. It says so when the assay
  never reaches 95% detection, or when the data cannot support a fit.
- **LOQ.** This is the lowest standard from which every higher level has a
  coefficient of variation of 35% or less. The CV is computed from the
  back-calculated copy numbers.
- **Unknowns.** Copies per reaction come with a prediction interval.
  Copies per gram = copies x (elution / template) x dilution / soil grams,
  with every input given explicitly. Recovery from extraction is not
  corrected for.
- **Calls, in order.**
  1. Contaminated NTC or blank, failed curve, inhibition, or discordant
     replicates: `INCONCLUSIVE`. These are never reported as negative.
  2. No amplification: `NOT_DETECTED` (cannot exclude presence below LOD).
  3. Amplified, but below LOD95: `DETECTED_BELOW_LOD`.
  4. Between LOD95 and the LOQ: `DETECTED_NOT_QUANTIFIABLE`.
  5. At or above the LOQ: `QUANTIFIED`.

```sh
python qpcr_assay.py validate standards.csv
python qpcr_assay.py quantify --standards standards.csv plate.csv --elution-ul 100 --template-ul 2 --soil-g 0.25
python -m unittest test_qpcr_assay
```

Every result is labelled as an assay interpretation, not an identification.
Sequencing is still needed to identify the source.

## Case dossier (`dossier.py`)

This builds a printable case dossier in the colour-banded style of the
uploaded dossiers: section bands, case-ID strips, status chips, and a running
header and footer with case ID, page x of y, generation time and a
not-validated notice.

Every value comes from a file one of these tools wrote:

- `search_theory.py`
- `optimal_search.py`
- `lost_person_behavior.py`
- `lost_person_sim.py`
- `burial_signature.py`
- `microtopo.py`
- `evidence_scoring.py`
- `qpcr_interpret.py` and `qpcr_assay.py`
- `drift_envelope.py`

Values are copied verbatim, and each tool's own caveats are quoted. A missing
field shows "not provided".

Each section gets a status chip:

- **COMPUTED:** built from the tool's output.
- **MISSING:** no output was given for that tool.
- **FLAGGED:** the tool itself reported a limit, a residual or a hash
  mismatch.

An appendix lists every input file with its SHA-256. The HTML is
self-contained and prints from Chrome or Edge with the running header and
footer. If reportlab is installed, a PDF is also written directly.

```sh
python dossier.py --case case.json --search-theory st.json --optimal plan.json \
    --lps out/sim --burial out/site --out dossier.html
python -m unittest test_dossier
```

## Sweep width and canopy correction (`sweep_width.py`)

This file supplies the W column that `search_theory.py` and
`optimal_search.py` need. W comes from the first of these that exists:

1. a `sweep_width_km` you already put in the segments file;
2. your own field calibration (`--calibration`): a measured W, or a range of
   detection with W = factor x range (Koester et al. 2014: 1.8, 1.6 and 1.1 x
   Rd for high, medium and low visibility);
3. the built-in table in `sweep_width_tables.json`.

The built-in table holds only two sourced values, both for a ground searcher
in the Koester et al. 2004 USCG/NSARC experiments: 142 m in leaf-off forest
with a high-visibility object, and 17 m in dense forest with a
low-visibility object. They come from secondary summaries and should be
checked against the report. Every other entry is null and needs field
calibration.

Earlier versions of these tools used POD and sweep values taken from
AI-generated material that had never been measured. Those values are gone.

**Canopy.** For aircraft and drones, W is reduced by canopy cover:
W_eff = W_open x (1 - cover)^k, with k = 1 / cos(view angle) by default.
This is an assumption, and you can change k. Cover comes from a column,
from GEDI shots (a CSV, averaged per segment polygon) or from a canopy-cover
GeoTIFF. Ground teams use the vegetation class instead of canopy cover.

```sh
python sweep_width.py segments.csv --resource ground_searcher --target unresponsive_adult \
    --calibration my_trials.csv --gedi-shots gedi.csv --segments-geojson segs.geojson --out segs_w.csv
python optimal_search.py segs_w.csv --effort-km 40
python -m unittest test_sweep_width
```

Exit codes: 3 means some segments still have no W (pass `--allow-missing`
to accept that); 2 means bad input.

## Evidence fusion with likelihood ratios (`evidence_fusion.py`)

This replaces hand-weighted scores, such as the 0.45 / 0.25 / 0.20 / 0.10
weights in the uploaded scripts. Those weights came from AI-generated
material and had no measured basis. Here, each evidence layer gives a
likelihood ratio (LR):

LR = P(observation | person in cell) / P(observation | not in cell).

Every LR comes with a 90% interval and a cited source. A layer without a
source is refused. There are four kinds of layer:

- a lookup table by bins;
- a logistic model;
- a detector (a hit gives sensitivity / false-positive rate; a miss gives
  (1 - sensitivity) / (1 - false-positive rate));
- a completed search (LR = 1 - POD, the same as `search_theory.bayes_update`).

Posterior odds = prior odds x the product of the LRs. The prior is a
segments CSV, a `lost_person_sim` raster or a SAREnv scenario. A
Rest-of-World term is kept. A seeded Monte Carlo over the LR intervals gives
each cell or segment a median and a 90% interval.

Layers that share a dependency group are never multiplied together as if
they were independent. Admiralty grades can shrink an LR toward 1, but only
under a rule you choose; the report flags that rule as a policy choice.

`score_map` benchmarks a fused map against known find locations. It reports
the rank of the true cell, the probability searched before the find, and
the log score.

```sh
python evidence_fusion.py fuse --config fusion.json --out fused.json --csv fused.csv
python evidence_fusion.py score --map fused.csv --found found.csv --baseline segments.csv
python optimal_search.py fused.csv --effort-km 40
python -m unittest test_evidence_fusion
```

The module ships no LR values. Every number must come from a measured study
or your own field trials. The SAREnv loader follows that project's own code
but has not been run on real SAREnv files.

## CalTopo / SARTopo file exchange (`caltopo_io.py`)

This tool works with files only and never writes to the CalTopo API.

- **Export.** It turns segment polygons, plus POA, POD, PSR and planned
  effort from `search_theory.py`, `optimal_search.py` or
  `lost_person_sim.py`, into a GeoJSON file that CalTopo can import. Each
  feature is an Assignment or Shape, styled yellow to red by POA. The
  numbers are written into the description, so they survive even if CalTopo
  drops unknown properties.
- **Import.** It reads a CalTopo export, measures how much of each walked
  track lies inside each segment, and computes coverage C = km x W / area
  and POD = 1 - e^-C. It writes a passes CSV that
  `search_theory.py --passes` reads.

```sh
python caltopo_io.py export --polygons segs.geojson --segments segs.csv --optimal plan.json --out caltopo.json
python caltopo_io.py import caltopo_export.json --segments-geojson segs.geojson --sweep-width-km 0.05 --passes-out passes.csv
python -m unittest test_caltopo_io
```

The property names follow the open-source `caltopo_python` client, because
CalTopo publishes no import schema. Try a first import on a scratch map.

## Your own distance tables in `lost_person_sim.py`

`--distance-table FILE` replaces the 2003 UK table with your own, for
example ISRID figures from your licensed Lost Person Behavior book or app.
The table gives category, terrain and the 25/50/75/95% distances in km,
with its source and licence.

The tool reports how closely the simulation matches the table at those
points, as a KS-style distance D, and exits 5 when the fit is outside the
tolerance. The age of the data is shown next to every ring.
`distance_table.example.json` is fictional and is only there to show the
format. No ISRID numbers are included, because they are licensed.

## Red-edge indices in `s2_change.py`

Every `s2_change.py` run now writes three change maps from the same Sentinel-2
scenes:

- NDVI;
- NDRE = (B8A - B05) / (B8A + B05);
- CIre = B07 / B05 - 1.

`--index ndvi|ndre|cire` picks the map that drives the loss clusters.
Red-edge runs use a 20 m grid by default; `--grid-m` changes the grid.
Sources are Kalacska et al. 2009 and Leblanc, Kalacska and Soffer 2014 for
mass-grave vegetation, and Gitelson for the indices.

Detecting a single grave at 10-20 m pixels has not been established. A
flagged cluster is a disturbance screen only. The earlier claim that a
"SIPI chlorophyll flush" detects decomposition came from AI-generated
material and was never validated, so it is not computed.

I ran it at Sun Peaks (50.88, -119.89, 400 m radius), comparing July 2026
scenes with mid-September 2026 scenes. It flagged three NDRE-loss clusters,
of 2,000 to 7,200 m^2, between 316 and 383 m from the centre. These are
screening anomalies to check on the ground, not findings.

## River refloat timing (`refloat_timing.py`)

This tool accumulates degree-days (ADD) from a daily water-temperature
series. The series can be a CSV or USGS NWIS parameter 00010, read live
or from a saved file. Days below about 7 C add nothing. From the ADD it
gives the probability, day by day, that a body has refloated, and the
window in which that probability passes 10%, 50% and 90%.

The preset uses about 97 degree-days, the figure in the abstract of
EGUsphere preprint egusphere-2026-5071 (Delhez et al., 2026). That preprint
is not peer reviewed, and every output says so. The spread could not be
verified, so you must supply it with `--add-log-sd` or `--add-iqr`. The
log-normal shape and the 0 C base are assumptions and are recorded as such.
For the over-65 note (`--over-65`), the abstract reports that older people
are more likely to stay afloat.

The output includes a block that `drift_envelope.py` can read later.

```sh
python refloat_timing.py --csv water_temp.csv --incident 2026-05-27 --preset egusphere-2026-5071 \
    --add-iqr Q1 Q3 --out-dir out/refloat   # Q1 Q3: your own spread, in degree-days
python -m unittest test_refloat_timing
```

## GeoTIFF export and GCP georeferencing (`geotiff_export.py`)

Turns numpy arrays into GeoTIFFs that QGIS, ArcGIS Pro, GDAL and Earth Engine
open in the right place. The output is a Cloud-Optimized GeoTIFF by default.

- `write`: an array already on a map grid (`.npy`, or `.npz` with named
  layers) plus `--crs` and either `--bounds` or `--origin` and
  `--pixel-size`. Nothing is guessed. A missing CRS or grid is an error.
- `georef`: an image-space array (for example a corrected 1965 aerial photo)
  plus a GCP CSV (`id,col,row,x,y`). It fits a polynomial of order 1, 2 or 3
  and reports each point's residual and a leave-one-out error. Order 1 is the
  default. The image is resampled bilinearly onto a north-up grid, and NaN
  input cells stay empty rather than bleeding into neighbours.
  - The run refuses fewer GCPs than the fit has unknowns.
  - It warns when the fit passes exactly through every point, because the
    RMSE is then 0 and means nothing.
  - `--max-rmse` exits 1 when the leave-one-out error is too large.
- `verify`: re-opens a file and checks each band against the SHA-256
  recorded inside it at write time. It can also check the expected CRS and
  transform. A file without the hash tags fails, because it cannot be
  verified.

Each band carries its name, units and SHA-256. Each input file is hashed into
the file's tags (`gdalinfo` shows them). The file is written under a
temporary name and then renamed.

```bash
python geotiff_export.py write ndmi.npy --crs EPSG:32615 \
    --bounds 412000 4101000 413000 4102000 --band-name ndmi --units 1 --nodata nan --out ndmi.tif
python geotiff_export.py georef photo_1965.npy --gcps gcps.csv --crs EPSG:27700 \
    --order 1 --pixel-size 0.5 --max-rmse 2 --report photo_1965_gcps.json --out photo_1965.tif
python geotiff_export.py verify ndmi.tif --crs EPSG:32615
```

Exit codes: 0 means written and verified. 1 means verification failed or the
GCP fit failed `--max-rmse`. 2 means bad input.
