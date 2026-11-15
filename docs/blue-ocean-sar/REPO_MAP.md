# Repo map — SAR tooling in revvel-standards

Where the SAR work lives and how the pieces depend on each other.

## Directory tree (SAR-relevant)

```text
revvel-standards/
├── .github/workflows/
│   ├── blue-ocean-sar-live.yml          # manual live run: acquire → detect → evidence artifact
│   ├── blue-ocean-sar-source-health.yml # checks the public data sources still answer
│   ├── octopus-route.yml                # PR routing
│   └── ossar.yml                        # static security scan
├── .circleci/scripts/run-tests.sh
├── docs/
│   ├── blue-ocean-sar/
│   │   ├── README.md                    # status of every file + lawful use
│   │   ├── SYSTEM_REVIEW.md             # adversarial review: C1-C5, H1-H6 (fixed)
│   │   ├── INVESTIGATION_PROCESS.md     # the process doc (this change)
│   │   ├── sar_person_finder.py         # ca_cfar, lee_filter_intensity
│   │   ├── sar_person_finder_v3.py      # 6-band engine, GeoJSON + CoT export
│   │   ├── provenance.py                # DataSource, export gates
│   │   ├── sar_dual_comms_publisher.py  # TLS/UDP CoT publisher
│   │   ├── evidence/                    # signed, hash-chained evidence log
│   │   ├── opendata/                    # STAC/CMR/USGS/OSM connectors (Python)
│   │   ├── opendata-rs/                 # Rust twin of opendata
│   │   └── data/                        # sample feeds, dossier, flight plans
│   ├── sar-change-detection/            # before/after disturbance detection
│   ├── case-files/                      # historical case material (as received)
│   └── hfmr/                            # fusion module, own README + tests
└── growlingeyes/tests/                  # sar2optical test
```

## Module dependency graph

```mermaid
graph TD
    V3[sar_person_finder_v3.py] --> PF[sar_person_finder.py]
    V3 --> PR[provenance.py]
    PF --> PR
    PIPE[sar_investigation_pipeline.py] --> V3
    PIPE --> PUB[sar_dual_comms_publisher.py]
    CD[sar-change-detection/\nsar_change_detection.py] -.independent.-> OUT((GeoJSON))
    OD[opendata/*] --> EV[evidence/]
    V3 --> OUT
    V3 --> COT((.cot files))
    COT --> PUB
    T1[test_sar_person_finder.py] -.tests.-> PF
    T1 -.tests.-> V3
    T2[test_provenance.py] -.tests.-> PR
    T3[test_sar_dual_comms_publisher.py] -.tests.-> PUB
```

## CI / workflow map

```mermaid
graph LR
    DISPATCH[workflow_dispatch\ncase inputs] --> LIVE[blue-ocean-sar-live.yml]
    LIVE --> VAL[validate inputs] --> DEPS[pip install numpy scipy\nrasterio sklearn crypto]
    DEPS --> UT[unit tests: realdata,\nopendata, evidence]
    UT --> RUN[live data pulls] --> ART[signed evidence artifact]
    CRON[schedule] --> SH[blue-ocean-sar-source-health.yml]
    PR2[pull request] --> OCT[octopus-route.yml]
    PR2 --> OSSAR[ossar.yml]
    PR2 --> CCI[.circleci run-tests.sh]
```

## Import rules observed

- `v3` builds on the base finder; both refuse to emit locations without a
  `DataSource` (provenance is the only shared trust layer).
- `opendata/` and `evidence/` are a separate acquisition stack; the finders
  never import them — data crosses as files (rasters, GeoJSON).
- `opendata-rs/` duplicates `opendata/` in Rust and keeps its own evidence
  manifest (known gap M1 in SYSTEM_REVIEW.md).
