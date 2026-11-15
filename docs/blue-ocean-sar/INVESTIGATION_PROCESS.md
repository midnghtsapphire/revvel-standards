# SAR Investigation Process

A step-by-step process for running a satellite-SAR missing-person investigation
with the tools in this directory. Every output is a **lead for a ground team**,
never a finding: nothing here is validated against field data, and every
location carries `ground_verified: false`.

## Process at a glance

```mermaid
flowchart TD
    A[Case intake\ncase_id, LKP lat/lon,\nelapsed hours, subject category] --> B[Acquire scene\nopendata/ STAC + CMR connectors\nor blue-ocean-sar-live.yml workflow]
    B --> C[Declare provenance\nDataSource per input\nmeasured sources need a reference]
    C --> D[Detect\nMultiBandSAREngine.process_multiband_sar\nCA-CFAR per band, Pfa 1e-6]
    B --> E[Change detection\nsar-change-detection/\nbefore vs after windows]
    D --> F[Rank candidates\nfused_score = CFAR ratio x motion weight\nNOT a probability]
    E --> F
    F --> G[Export\nGeoJSON + one .cot per target\nrequire_export_provenance gate]
    G --> H[Publish to TAK\nDualCommsTAKPublisher\nTLS primary, optional multicast]
    H --> I[Ground team verifies\nonly a ground search confirms]
    I --> J[Evidence log\nhash-chained, Ed25519-signed,\nuploaded as run artifact]
```

## Steps

1. **Intake.** Record the case ID, last known position (LKP), elapsed hours
   since LKP, and the lost-person category. These drive the motion weight
   (`spread_kmh * elapsed_hours`, placeholder until ISRID/LPB rings land) and
   the live workflow inputs.
2. **Acquire.** Pull imagery and terrain for the case area with the
   `opendata/` connectors (STAC, CMR, USGS 3DEP) or dispatch
   `.github/workflows/blue-ocean-sar-live.yml` with lat/lon/radius and the
   before/after Sentinel-2 windows.
3. **Declare provenance.** Build a `DataSource` list for every input. A
   `measured` or `public_record` source must carry a reference (path, URL or
   scene ID). Without sources the finders raise `MissingSourceError`;
   `--demo` is for demos only and labels output `UNSOURCED`.
4. **Detect.** Run `MultiBandSAREngine.process_multiband_sar`. CA-CFAR runs
   per band on linear intensity; a pixel is a candidate when at least
   `min_detecting_bands` bands detect it. An empty list is a valid answer.
5. **Change detection.** Run `sar-change-detection/` on the before/after
   windows to flag recent ground disturbance near high-ranked candidates.
6. **Export.** `export_geojson` and `export_cot_files` refuse unsourced
   locations (`require_export_provenance`). One `.cot` file per target; UIDs
   are `SAR-<scene sha>-<run id>-R<rank>` so runs never overwrite each other.
7. **Publish.** `DualCommsTAKPublisher.publish_cot_event` over TLS to the TAK
   server. Status is `SENT (unacknowledged)` — bytes left the machine, nothing
   more. Multicast is unencrypted and off by default.
8. **Verify on the ground.** Hand the ranked leads to the field team. A
   detection can be a metal roof, a car or a rock face as easily as a person.
9. **Log evidence.** Every data step lands in the hash-chained evidence log,
   Ed25519-signed when `EVIDENCE_SIGNING_KEY` is set, and uploaded as the run
   artifact.

## Decision tree (gates)

```mermaid
flowchart TD
    S[Run requested] --> P{Sources named?}
    P -- no --> P1{--demo flag?}
    P1 -- no --> X1[REFUSE\nMissingSourceError]
    P1 -- yes --> L1[Run, label UNSOURCED\nSYNTHETIC callsign prefix]
    P -- yes --> R{measured source\nhas a reference?}
    R -- no --> X2[Export refused\nrequire_export_provenance]
    R -- yes --> D{Any CFAR detection?}
    D -- no --> E0[Empty result\nreport 'no detections', stop]
    D -- yes --> K{Calibration constant given?}
    K -- no --> U[Proceed, units stay\n'uncalibrated DN^2']
    K -- yes --> V[Proceed, sigma0 units]
    U --> OUT[Export + publish]
    V --> OUT
    OUT --> G{Ground verified?}
    G -- no --> HOLD[Lead only - hand to\ninvestigating agency]
    G -- yes --> CASE[Record outcome in\nevidence log]
```

## Data-flow map

```mermaid
flowchart LR
    subgraph Sources
        S1[Sentinel-2 / STAC]
        S2[NASA CMR / GEDI]
        S3[USGS 3DEP + gauges]
        S4[Public traffic cams\nOpenTrafficCamMap]
    end
    subgraph Engine
        PF[sar_person_finder.py\nca_cfar, lee_filter_intensity]
        V3[sar_person_finder_v3.py\nMultiBandSAREngine]
        CD[sar_change_detection.py]
        PR[provenance.py]
    end
    subgraph Outputs
        GJ[GeoJSON\nGIS / CalTopo]
        COT[.cot files\nATAK / WinTAK]
        EV[Evidence log\nsigned chain]
    end
    S1 --> V3
    S1 --> CD
    S2 --> V3
    S3 --> V3
    S4 -. leads only .-> EV
    PR --> V3
    PF --> V3
    V3 --> GJ
    V3 --> COT
    CD --> GJ
    COT --> PUB[sar_dual_comms_publisher.py] --> TAK[TAK server / ATAK devices]
    GJ --> EV
    COT --> EV
```

## Publish sequence

```mermaid
sequenceDiagram
    participant Op as Operator
    participant En as MultiBandSAREngine
    participant Pub as DualCommsTAKPublisher
    participant TAK as TAK server
    Op->>En: process_multiband_sar(raster, sources)
    En-->>Op: ranked targets (or empty list)
    Op->>En: export_cot_files(targets, out_dir)
    En-->>Op: one .cot per target
    Op->>Pub: publish_cot_event(xml) per file
    Pub->>TAK: TLS sendall (no ack exists)
    Pub-->>Op: SENT (unacknowledged) + sent_via
    Note over Op,TAK: exit 1 when nothing left the machine
```

## Lawful-use gates (summary of README.md)

- Background-check data (census, voter, vital records) falls under FCRA —
  permissible purpose required.
- Cameras: public feeds, your own, or owner/warrant-authorised only (CFAA).
- Output is for the owner's research; hand anything actionable to the
  investigating agency as a lead, never as evidence.
