# Blue Ocean SAR

Search-and-rescue sensing tools as uploaded, with fixes and tests added to the
ones that do real computation. **Nothing here is validated against field
data.** Treat every output as a lead for a human to check on the ground, never
as a finding.

The first commit on this branch adds every file exactly as received. Later
commits change them. Code that was replaced is commented out, not deleted,
with a short note on what was wrong and what it taught. Those notes are the
owner's learning record. Several method names and numbers (CFAR, Lee filter,
Sigma0 calibration, 6-band fusion, mesh failover) came from AI-generated
material that read as authoritative but had never been run against real data.
`git log -p -- docs/blue-ocean-sar` shows each change.

## Status of each file

| File | Status | Tests |
| --- | --- | --- |
| `sar_person_finder.py` | Fixed: CA-CFAR detection, Lee filter on intensity, duplicate-target suppression, `--out`, `--demo` | `test_sar_person_finder.py` |
| `sar_person_finder_v3.py` | Fixed: as above, plus haversine distances, time-based spread, CoT UID/ce/hae, one `.cot` per target | `test_sar_person_finder.py` |
| `sar_dual_comms_publisher.py` | Fixed: optional TLS, multicast warning, XML check, current time, honest send status and exit code | `test_sar_dual_comms_publisher.py` |
| `master_sensor_wave_search_script_v2.py` | Config path fixed, unused imports commented; scoring unchanged and **uncalibrated** | none |
| `public_records_engine.py` | Output path fixed; **returns hardcoded sample data only** | none |
| `qgis/startup.py` | Formatting only | none (needs QGIS) |
| `master_sensor_wave_search_pipeline_v2.json` | As received | — |
| `data/*` | As received (sample data) | — |

The HFMR fusion module is in `../hfmr/`, which has its own README and tests.

Run the tests (numpy is needed; scipy is not):

```sh
cd docs/blue-ocean-sar
python3 -m unittest test_provenance test_sar_person_finder test_sar_dual_comms_publisher -v
```

## Every location says what it was built from

The person finders and the master script take a `sources=[DataSource(...)]`
argument (see `provenance.py`) naming the input data.

- **Person finders** refuse to run without sources: `process_sar_scene` and
  `process_multiband_sar` raise `MissingSourceError`, and a `measured` source
  must carry a reference. Pass `allow_unverified=True` (CLI `--demo` or
  `--allow-unverified`) only for demos; output is then labelled
  `UNSOURCED - NO INPUT SOURCE NAMED`.
- **Exports** (GeoJSON and CoT, through `require_export_provenance`) are
  strict whatever `provenance.STRICT` says. They refuse a location with
  missing, malformed or unsourced provenance, or a `measured` or
  `public_record` source with no reference. The same `allow_unverified` /
  `--demo` switch opts out.
- **The master script** still follows `provenance.STRICT`, which is off by
  default: it runs without sources and labels the output unsourced.
  `provenance.STRICT = True` makes it refuse.

- `measured` (a SAR scene, LiDAR tile or GPS log) and `public_record` (a
  news story, bulletin or deed) sources should carry a reference: a file path,
  URL or scene ID that someone else can check. Strict mode requires it.
- `estimate` covers assumptions. Inputs that fall back to default values are
  listed in `assumed_inputs` and add an estimate source automatically.
- `synthetic` is made-up test data. Every demo uses it.

Every output location carries a `provenance` block with a status of
`SYNTHETIC DEMO - NOT A REAL LOCATION`, `UNVERIFIED - BUILT PARTLY ON
ESTIMATES`, `UNVERIFIED CANDIDATE - FROM MEASURED DATA` or `UNSOURCED - NO
INPUT SOURCE NAMED`. It also carries `ground_verified: false`, because only a
ground search can confirm anything. The GeoJSON and ATAK exporters refuse a
location that has lost this block, unless `--demo` is set.
ATAK markers say `SYNTHETIC` or `UNVERIFIED` in the callsign, and they no
longer show the score as a percentage.

## How the person finders detect

- **Detection** is cell-averaging CFAR on linear intensity. For each pixel the
  clutter level is the mean of a training ring (`train_cells`, default 4)
  outside a guard block (`guard_cells`, default 2). That is N = 144 training
  cells. The threshold is `alpha * clutter` with
  `alpha = N * (Pfa^(-1/N) - 1)`, and `pfa` defaults to 1e-6 per cell. The
  formula is exact for single-look speckle; multi-look data gives fewer false
  alarms than `pfa`. In the 6-band engine a pixel counts if at least
  `min_detecting_bands` bands detect it (default 1), so the false-alarm rate
  is at most 6 x `pfa`.
- **Only detections are returned.** When nothing passes the threshold, the
  result is an empty list. Pure noise usually gives no targets.
- **Lee filter** runs on linear intensity with speckle variance `1 / enl`
  (`enl` defaults to 1, single-look). It feeds the reported backscatter only;
  CFAR runs on the unfiltered data so that `pfa` holds.
- **Backscatter** is labelled `backscatter_units: "uncalibrated DN^2"` unless
  you pass `calibration_constant` (sigma0 = intensity / constant; one number,
  or one per band in v3).
- **`fused_score`** (formerly `fused_confidence`) is the CFAR ratio
  (intensity / threshold) times the motion weight. It ranks candidates and is
  not a probability.
- **Distances** in v3 use haversine. The motion weight is a Gaussian around
  the last known position with a 1-sigma radius of
  `max(spread_kmh * elapsed_hours, min_spread_km)`. The defaults (0.25 km/h,
  0.05 km) give 1.5 km at 6 hours. This is a placeholder, not lost-person
  behaviour data. Set `--elapsed-hours` per case.

## ATAK markers and the publisher

- **CoT UIDs** are `SAR-<scene sha256[:8]>-<run id>-R<rank>`, so a new run or
  scene does not overwrite earlier markers. Pass `run_id` to fix the run id;
  otherwise it is random.
- **`hae` and `le`** are `9999999.0` (unknown). **`ce`** combines the stated
  geolocation error (`geolocation_error_m`, CLI `--geolocation-error-m`) with
  half the pixel diagonal. Without a stated error it is `9999999.0`.
- **The publisher** reports `SENT (unacknowledged)`: the bytes left this
  machine, and nothing confirms a TAK server or device received them. Results
  carry `sent_via` (channels that sent) and `failover`, which is true only
  when the primary failed and the multicast copy went out. The command exits
  with status 1 when nothing was sent. It has no mesh-radio support; the
  secondary channel is UDP multicast only.

## What the numbers mean and what they don't

- **Person-finder scores** rank CFAR detections in one scene. A detection can
  be a metal roof, a car or a rock face just as easily as a person. The demo
  scenes are synthetic.
- **`fused_probability`** in the master script is a hand-weighted sum
  (0.45 / 0.25 / 0.20 / 0.10). It has never been fit to known cases, so it is
  not a probability. The output now carries
  `"score_is_calibrated_probability": false` to say so.
- **The ratings in the satellite list** (`easter_egg_rating`) are opinions,
  not measured performance.
- **ESA BIOMASS cannot image North America or Europe.** Its P-band
  transmitter is switched off there to protect US Space Object Tracking
  Radar. Any BIOMASS scene of an Ohio location is simulated.
- **The sample camera feeds, dossier and flight plans** in `data/` are
  example records, not real observations.

## Lawful use

These tools are kept intact, including the public-records and camera material,
because they are intended for real casework and crime-scene calibration. The
following conditions apply when they are pointed at real people or places:

- **Background checks:** using census, voter, vital-record or
  neighbour/proximity data to decide about a person falls under the Fair
  Credit Reporting Act. That requires a permissible purpose, and a consumer
  reporting agency if you build reports for others. State law adds limits on
  top. Voter files have per-state rules on what they may be used for.
- **Genealogy sites** (Ancestry.com, FamilySearch, etc.): follow each site's
  terms. Record which tree or index each fact came from.
- **Cameras:** use only feeds that are public (e.g. DOT traffic cameras), that
  you own, or that the owner or a warrant has authorised. Do not log into, scan
  for, or open cameras that are not yours. That falls under the Computer
  Fraud and Abuse Act and state equivalents, whatever the purpose.
- **Personal use:** these tools are for the owner's own research, not for
  producing court evidence. If something they turn up ever seems worth
  acting on, hand the reasoning to the investigating agency as a lead and
  let them gather the evidence themselves.

## Known gaps

- No real SAR scene has been run through either person finder.
- The 6-band configuration (VHF to C-band, with its weights) is not based on
  any real sensor. No single satellite delivers those six bands.
- The TLS path has been tested against a local self-signed server only, not
  OpenTAKServer.
- `public_records_engine.py` has no real connectors. The "Integrated" labels
  in its output are placeholders.
