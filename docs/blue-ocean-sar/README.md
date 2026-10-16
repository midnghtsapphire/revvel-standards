# Blue Ocean SAR

Search-and-rescue sensing tools as uploaded, with fixes and tests added to the
ones that do real computation. **Nothing here is validated against field
data.** Treat every output as a lead for a human to check on the ground, never
as a finding.

The first commit on this branch adds every file exactly as received. Later
commits change them. Code that was replaced is commented out with a reason,
not deleted. `git log -p -- docs/blue-ocean-sar` shows each change.

## Status of each file

| File | Status | Tests |
| --- | --- | --- |
| `sar_person_finder.py` | Fixed: duplicate-target suppression, fast Lee filter, `--out` path | `test_sar_person_finder.py` |
| `sar_person_finder_v3.py` | Fixed: as above, plus current CoT times, one `.cot` per target, amplitude/intensity switch | `test_sar_person_finder.py` |
| `sar_dual_comms_publisher.py` | Fixed: optional TLS, multicast warning, XML check, current time | `test_sar_dual_comms_publisher.py` |
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
argument (see `provenance.py`) naming the input data. If no source is given,
they still run, and the output is labelled
`UNSOURCED - NO INPUT SOURCE NAMED`.

Setting `provenance.STRICT = True` switches back to refusing: the tools then
raise `MissingSourceError` instead of returning coordinates, and they require
the references described below.

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
ground search can confirm anything. The GeoJSON and ATAK exporters label a
location that has lost this block as unsourced (strict mode refuses it).
ATAK markers say `SYNTHETIC` or `UNVERIFIED` in the callsign, and they no
longer show the score as a percentage.

## What the numbers mean and what they don't

- **Person-finder scores** are ranks of local SAR contrast in one scene. A
  high rank can be a metal roof, a car or a rock face just as easily as a
  person. The demo scenes are synthetic.
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
- The TLS path has been tested against a local self-signed server only, not
  OpenTAKServer.
- `public_records_engine.py` has no real connectors. The "Integrated" labels
  in its output are placeholders.
