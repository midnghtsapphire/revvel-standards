# System review: weaknesses, fixes and upgrades (2026-10-16)

This review covers every tool in `docs/blue-ocean-sar/` (`realdata/`,
`opendata/`, `opendata-rs/` and the top-level SAR finders) and `docs/hfmr/`.
Two passes were made independently:

- **Adversarial critique.** It treated the suite as opposing counsel and a
  hostile peer reviewer would before police or a sheriff's office used it.
  It ran every suite and probed suspected weaknesses with throwaway scripts.
- **Technology scout.** It researched 2023-2026 methods and sources: blue
  ocean (emerging) and red ocean (proven) upgrades.

## Bottom line

All 820 tests pass, but tests are not the same as being right.

**What is defensible today:**

- the search-theory and optimal-allocation maths;
- the LPB rings;
- the qPCR assay logic;
- the field-log checker;
- the network allow-lists;
- the Ring exporter's own-devices-only design.

**What a hostile reviewer would win on, if used now:**

- **SAR finder:** it turns pure noise into "targets".
- **Drift envelope:** it ignores elapsed time, and it treats a cleared reach
  as certain.
- **Stage 2 gate:** it "debunks" tips by keyword, using unsourced "verified"
  facts that name real people.
- **Evidence logs:** six formats, all rewritable without detection, with no
  trusted time, no signature and no operator identity.

## Critical and high findings, with fixes

| ID | Tool | Problem (observed) | Fix |
| --- | --- | --- | --- |
| C1 | `sar_person_finder*.py` | A pure-noise raster labelled "measured" gave 10 ranked targets. The "CFAR" is a global z-score with no false-alarm rate; the Lee filter runs on dB; the "calibration" is DN squared. | Use local cell-averaging CFAR with a set false-alarm rate on intensity. Return nothing below threshold. Remove the calibration wording. |
| C2 | `sar_person_finder_v3.py` | Distance uses 111 km per degree with no cos(lat). At 49 N, 1 km east is read as 1.53 km, so the footprint is squeezed 35%. | Use haversine or UTM. Make the spread depend on elapsed time and LPB data. |
| C3 | `realdata/drift_envelope.py` | The output is byte-identical at 1 h and 240 h. "Cleared" cells are set to 0. Mass beyond the reach is renormalised in, so probabilities are about doubled. | Scale the median with elapsed time and discharge. Apply POD per cell. Keep a beyond-reach cell. Rename the probability column. |
| C4 | `realdata/stage2_validation_gate.py` | Hard-coded "verified" Shaffer facts name real people. Tips are debunked by keyword, including a tip about the dirt being moved after the clearance. | Remove the built-in ground truth, or source every field. Say "needs review", never "debunked". Treat clearance dates as time bounds. |
| C5 | all evidence logs | No RFC 3161 time, no signature, no operator. A re-chained log still verifies. Columbus metadata can be edited. `fetch.py` sidecars collide within the same second. | Build one shared evidence library. Hash all metadata. Sign each entry with Ed25519. Get an RFC 3161 token for each chain head. Record the server Date header and TLS fingerprint. Require the expected head for court exports. |
| H1 | `provenance.py` | `STRICT = False` by default, so a "measured" source with no reference passes. | Make strict the default for any GeoJSON, CoT or KML export. |
| H2 | `opendata/authority.py` | LICENSED needs no subjects and no expiry. Any file counts as a "warrant". The actor is optional. An unsalted subject hash is reversible. | Require subjects, an expiry and an actor. Refuse unsalted hashing. Add an optional second-person counter-sign. |
| H3 | `sar_person_finder_v3.py` CoT | Fixed UIDs overwrite markers on every ATAK device. `ce=10` overstates accuracy. `hae=0` claims the point is on the ellipsoid. | Build UIDs from the run and scene. Derive `ce` from pixel size and geolocation. Use `hae=9999999`. |
| H4 | `sar_dual_comms_publisher.py` | "SUCCESS" is printed for unacknowledged UDP. "Failover" is reported when none fired. It claims mesh radios it cannot use. | Say "SENT (unacknowledged)". Report only failovers that happened. Remove the mesh claims. |
| H5 | `hfmr/hfmr.py` | The same reading under two group labels is counted twice (0.526 becomes 0.671). | Refuse a repeated `source_sha256`. |
| H6 | `realdata/burial_signature.py` | "P(real change)" is 1 - p, not a probability. 1 km^2 takes 7.8 GB, so county scale is impossible. | Rename it `change_significance`. Process in overlapping tiles. |

Medium findings:

- The six evidence formats do not interoperate.
- "Probability" means something different in each tool.
- A pass on the ROW segment in `search_theory.py` crashes with a KeyError.
- `fusion.py` scores depend on which candidate sites were included.
- `datetime.utcnow()` is used in places.
- The Columbus `LIKE` match is broad.
- `build_case_registry.py` misreads "1%" as 100%.

## Cross-cutting weaknesses

1. **No shared trust layer.** There is no shared signing, trusted time or
   operator identity.
2. **Safety switches default to off,** or only change a label.
3. **No common geometry or probability format.** Units, distance formulas
   and what "probability" means vary by tool.
4. **Tests check arithmetic, not truth.** No test uses real case outcomes
   (found subjects, recovered remains, confirmed graves).
5. **No tiling.** Nothing runs at county scale.

## The cellular "cutoff seconds" idea

Carrier records cannot tell crush from submersion, and they cannot resolve
12.5 s versus 15 s.

- **Water and signal.** Water absorbs cellular signals within centimetres to
  metres. The network loses the phone at once, even while the phone itself
  still works.
- **Idle phones.** The network only notices an idle phone has gone at its
  next periodic registration, which on LTE is about every 54 minutes.
- **Resolution.** Call records resolve to about a second at best, and
  billing records often round to the minute.

Treat cutoff values as a hypothesis to test, not as a finding.

## Upgrades, ranked by value for effort

Red ocean means proven and widely used. Blue ocean means emerging and not yet
field-validated for this use.

| Rank | ID | Upgrade | Type | Plugs into |
| --- | --- | --- | --- | --- |
| 1 | R1 | RFC 3161 timestamps and signatures on evidence; C2PA on images and dossiers | Red | The shared evidence library (fixes C5) |
| 2 | B3 | GEDI and ICESat-2 canopy as a visibility penalty on sweep width | Blue | `optimal_search.py` and the CMR connector |
| 3 | R3 | Sweep-width and POD tables by resource, terrain and vegetation (USCG 2004; Chiacchia 2023; 2025 drone POD trials) | Red | `search_theory.py` and `optimal_search.py` |
| 4 | B6 | Red-edge NDRE (Sentinel-2 bands 5-7) added to NDVI change | Blue (cheap) | `s2_change.py` |
| 5 | B2 | River refloat timing from accumulated degree-days (2026 preprint), using the USGS water-temperature series | Blue | `drift_envelope.py` |
| 6 | R2 | CalTopo/SARTopo GeoJSON round trip: export segments with POA, POD, PSR | Red | All planning tools |
| 7 | R4 | ISRID (about 300,000 incidents) per-category calibration in place of the 2003 UK data | Red | `lost_person_sim.py` |
| 8 | B1 | One fusion layer: every sensor as a likelihood ratio with an interval, benchmarked on SAREnv (2025) | Blue | `search_theory.bayes_update` |

**After those, in order:**

- B5: validate the agent model with a Gaussian-process emulator (Glasgow
  2024).
- R5: Mattson consensus input and ICS-204 assignment output.
- B7: an eDNA human mtDNA water assay along drift envelopes. This needs an
  ethics and consent gate.
- R6: ASPRS 2023 accuracy reporting for each lidar epoch.
- R7: OpenDrift Leeway for tidal water.
- B4: ingest drone thermal and AOS detections as POD.
- B8: cadaver-dog teams with a sweep width and a wind-driven scent cone.
- B9: NISAR coherence for timing large disturbances.

No 2024-2026 field validation was found for satellite hyperspectral, InSAR,
eDNA or chemical odour sensors used to locate clandestine remains. Present
them as research in any dossier.

The scout's full source list, with dates, is kept with the session notes.
Key sources:

- ICAR TERCOM 2025 report
- Ewers et al., arXiv 2412.13317
- SAREnv, *Drones* 9(9) 628 (2025)
- GEDI v3 release notice (July 2026)
- ASF NISAR public release (2026)
- EGUsphere-2026-5071 (refloat timing)
- USCG ground sweep-width report (DTIC ADA511658)
- C2PA white paper (September 2025)

## Fix order

1. C1, C2, H1, H3 and H4: SAR finder, provenance and publisher.
2. C3 and M3: drift envelope and the search-theory ROW crash.
3. C4 and M5: Stage 2 gate.
4. C5, H2, H5 and M1, with R1: the shared evidence library, adopted by
   `fetch.py`, `columbus_records.py`, `authority.py`, `ring_export.py`,
   `records_adapter.py`, the Rust crate and HFMR.
5. H6: rename the burial field, and add tiling.
6. Upgrades in the ranked order above.

## The pipeline paste of 2026-10-16: what was built and what was not

The paste was AI-generated code and prose:

- the "drone made of math" adjoint inversion;
- regional profiles, `ingest.py` and `solver.py`;
- the Farber skeletal-dispersal "fall vs malfeasance proof";
- Moors Murders weighted overlay and viewshed analysis;
- a synthetic GPR radargram and a Random Forest;
- an ODK form;
- a 1965 lens LUT with CLAHE and polynomial georeferencing;
- NDMI, peat erosion reversal, bilinear resampling and era weights.

It ended by asking for GeoTIFF export and for downloads that self-heal around
the clock.

**Built:**

- `realdata/geotiff_export.py` writes GeoTIFFs with CRS, geotransform, band
  names, units, provenance hashes and a read-back check. It also does
  polynomial GCP georeferencing with per-point and leave-one-out residuals,
  and bilinear resampling.
- `opendata/source_health.py` and a six-hourly workflow probe each source's
  content, select mirrors, derive timeouts, and go red when a required
  source is down.

**Sound ideas worth building next, from published sources:**

- NDMI from Sentinel-2 B8A and B11 (Gao 1996 form). It needs B11 added to
  `s2_change.py`, and test fixtures updated.
- Viewshed-weighted overlay, as published for the Saddleworth Moor search
  (Lockwood & Masters 2021). The weights must come from the case, not a
  template.
- Contrast enhancement (CLAHE) on scanned photos before GCP picking. It is a
  display aid; it adds no information.

**Not built, and why:**

| Pasted item | Problem |
| --- | --- |
| Regional diffusion constants, "D" values per region | Invented. No source; the numbers changed between paragraphs. |
| 2.5 mm/yr peat erosion "reversal" | Invented constant. Real peat loss varies by orders of magnitude with slope, cover and drainage. |
| Era-based overlay weights | Invented. Weights in a weighted overlay are the analysis; made-up weights make the map. |
| Random Forest on synthetic features | A model trained on made-up data learns the generator, not the ground. |
| Synthetic GPR radargram | Fine as a teaching picture. Useless as evidence or for training. |
| "Fall vs malfeasance proof" and "courtroom proof" | Skeletal dispersal patterns are not proof of either. Scavenging, water and time produce both. |
| Fixed 0.91 confidence | A constant is not a confidence. |
| KML output | The pasted namespaces were wrong. `caltopo_io.py` and the existing GeoJSON exports cover this. |
| "Drone made of math" adjoint inversion | No observation model linked it to any real measurement. |
