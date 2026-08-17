# WR-11 — ColdTrace: Temporal GIS Cold-Case Investigation Platform

**Status:** IN BUILD  
**Author:** Audrey Evans / MIDNGHTSAPPHIRE  
**Created:** 2026-04-26  
**Target Repo:** `midnghtsapphire/coldtrace`  
**Subdomain:** `coldtrace.oaudrey.com`  
**Hub Tab:** oAudrey → ColdTrace  
**Priority:** HIGH — Sequencing-Rule compliant (SaaS + pro licensing path)

---

## Problem Statement

Cold case investigators, forensic analysts, and search-and-rescue coordinators
lack a unified, accessible, open-source tool that can:

1. Ingest date-range parameters and automatically fetch multi-temporal
   geospatial data (LiDAR elevation, satellite imagery, historical DEMs) for
   a defined area of interest.
2. Compute **line-of-sight / viewshed analysis** — determining what was visible
   from a given observer point, and inversely, where a subject could have moved
   unobserved.
3. Run **temporal change detection** — identifying terrain, vegetation, and
   surface disturbances between acquisition epochs that may indicate clandestine
   activity (e.g., clandestine graves, disturbed soil, relocated debris).
4. Generate a **probability heat map** synthesizing accessibility, concealment,
   and anomaly signals into a ranked search-area recommendation.
5. Export structured reports usable by law enforcement, medical examiners, and
   family investigators.

Current paid alternatives (ArcGIS Pro, CAD/GIS forensic modules, Esri Crime
Analysis extensions) cost $1,500–$10,000/year per seat. There is no FOSS
equivalent with a modern, accessible web UI.

---

## Deep Research Report

### 1. ArcGIS / ArcMap Ecosystem

| Tool | Cost | Notes |
|------|------|-------|
| **ArcGIS Pro** (Esri) | $1,500/yr seat | Gold-standard forensic GIS; Spatial Analyst + 3D Analyst extensions add $1,500/yr each. Full viewshed, LiDAR toolboxes. |
| **ArcGIS Online** | Free tier / $500/yr | Cloud hosted; limited LiDAR processing; REST API accessible. |
| **ArcGIS MCP Server** (`GarrickGarcia/ArcGISMCP`) | Free/MIT | Connects LLM agents to ArcGIS Online REST API. Query feature layers, extract data as CSV. |
| **ArcGIS Pro MCP Add-In** (`nicogis/MCP-Server-ArcGIS-Pro-AddIn`) | Free | C#/.NET MCP server; exposes ArcGIS Pro desktop tools to AI agents (GitHub Copilot in agent mode). |
| **ArcGIS REST API** | Free (online layer queries) | Feature service queries, raster analysis, geocoding. |
| **ArcPy** (Python) | Included with Pro license | Full Python access to all ArcGIS geoprocessing tools. |

**Decision:** ArcGIS is too expensive for our FOSS-first mandate. Use as
reference implementation only. Target open-source equivalents throughout.

---

### 2. Open-Source GIS Stack (Chosen)

#### 2a. LiDAR / Point Cloud Processing

| Tool | License | Key Capability |
|------|---------|----------------|
| **PDAL** (Point Data Abstraction Library) | BSD | CLI + Python bindings. Filter, classify, normalize, and pipeline LAS/LAZ data. Industry standard. |
| **laspy** | BSD | Pure-Python LAS/LAZ reader/writer. |
| **LAStools** (partial) | Mix (some tools free, some proprietary) | `lasground`, `lasheight`, `lasview` — free for non-commercial use. Avoid proprietary tools. |
| **CloudCompare** | GPL | 3D point cloud comparison, change detection, cross-section extraction. CLI via `ccViewer`. |
| **Open3D** | MIT | Python library for 3D data; ICP alignment for multi-epoch comparison. |
| **Potree** | BSD-2 | Web-based point cloud renderer (THREE.js). In-browser LiDAR visualization. |
| **PDAL + GDAL pipeline** | BSD | Convert LAZ → DEM (GeoTIFF) for raster analysis. |

#### 2b. Viewshed / Line-of-Sight Analysis

| Tool | License | Key Capability |
|------|---------|----------------|
| **WhiteboxTools** | MIT | `viewshed` tool; Python API (`whitebox` package). DEM-based visibility from any observer point. Best FOSS option. |
| **GRASS GIS** (`r.viewshed`, `r.los`) | GPL | CLI + Python (`grass.pygrass`). Full viewshed, fuzzy viewshed, cumulative viewshed. TGRASS for time series. |
| **SAGA GIS** (`ta_lighting 2`) | GPL | CLI-first; `ta_lighting 2` module = viewshed from single observer. |
| **GDAL/OGR** | MIT/X | No viewshed; used for DEM manipulation (clip, reproject, merge). |

**Recommendation:** WhiteboxTools first (cleaner Python API), GRASS as fallback
for advanced multi-observer scenarios.

#### 2c. Temporal Change Detection

| Tool | License | Key Capability |
|------|---------|----------------|
| **GRASS TGRASS** | GPL | Time-series raster/vector data store; `t.rast.*` suite for difference, statistics, interpolation across epochs. |
| **rioxarray + xarray** | Apache 2 | N-D time-series raster stacks; band math (NDVI diff, elevation diff). |
| **scikit-image** | BSD | Image change detection algorithms (SSIM, difference maps). |
| **eo-learn** | MIT | EO patch-based time-series ML; Sentinel-2 change detection workflows. |
| **GeoAI** (`opengeos/geoai`) | MIT | Deep-learning change detection on satellite imagery. |

#### 2d. MCP Servers for GIS

| Server | Source | Capability |
|--------|--------|------------|
| **GIS MCP** (`mahdin75/gis-mcp`) | MIT/GitHub | Python MCP server; exposes GeoPandas, Shapely, PyProj, Rasterio, PySAL via MCP tools. Best general-purpose GIS MCP. |
| **ArcGIS MCP** | MIT/GitHub | ArcGIS Online integration for MCP agents. |
| **ArcGIS Pro Add-In MCP** | GitHub | ArcGIS Pro desktop → MCP. |

**Integration Plan:** Ship `gis-mcp` as a sidecar MCP server so AI agents can
query ColdTrace data programmatically.

---

### 3. Data Sources

#### 3a. LiDAR / Elevation (Free)

| Source | Coverage | API |
|--------|----------|-----|
| **USGS 3DEP** (3D Elevation Program) | USA | REST + S3. `https://tnmaccess.nationalmap.gov/api/v1/` |
| **OpenTopography** | Global + USA | REST. `https://portal.opentopography.org/api/`. Python client `pyopentopoapi`. Free tier (research). |
| **AWS Terrain Tiles** | Global | S3. `s3://elevation-tiles-prod/`. GeoTIFF global DEM. |
| **SRTM 30m** | Global | Free via USGS/NASA EarthData. 30m resolution. |
| **ALOS Global DSM 30m** | Global | Free from JAXA. |
| **Copernicus DEM (GLO-30)** | Global | Free via OpenTopography or AWS. 30m resolution, 2021 epoch. |

#### 3b. Satellite / Multispectral (Free)

| Source | Coverage | API |
|--------|----------|-----|
| **Sentinel-2** (ESA/Copernicus) | Global | Sentinel Hub REST API (free research tier). 10m multispectral. NDVI, change detection. |
| **Landsat 8/9** (USGS) | Global | EarthData REST. 30m. Long historical archive (1972+). |
| **NAIP** (USA aerial) | USA | USDA Geospatial Data Gateway. 1m resolution. |
| **Planet Labs** (NICFI program) | Tropics | Free for non-commercial. Monthly composites. |
| **Google Earth Engine** | Global | Free research API; large historical archive. Python `earthengine-api`. |

#### 3c. Historical Imagery / Archival

| Source | Notes |
|--------|-------|
| **USGS EarthExplorer** | Historical Landsat, ASTER, Hyperion, aerial. Manual + API. |
| **NARA (National Archives)** | Declassified satellite imagery (CORONA, HEXAGON). Very high res cold war era. |
| **Wayback Imagery** (Esri, free) | Historical satellite imagery viewer — useful for visual cross-referencing. |

---

### 4. Cold Case — Analytical Methodology

#### 4a. Temporal Interpolation Framework

Given a date range `[t_start, t_end]` and last known location `(lat, lon)`:

1. **Movement envelope calculation** — Maximum distance a subject could have
   traveled given the time elapsed, terrain, and known physical condition.
   Uses cost-surface (DEM + land cover) analysis: `r.walk` or `whitebox.cost_distance`.

2. **Accessibility zones** — Concentric isochrones. A person on foot covers
   ~3–5 km/hr on flat terrain; this degrades steeply with slope (Naismith's
   Rule, Tobler's hiking function). Output: probability band per time step.

3. **Concealment preference** — Statistically, subjects in crisis (medical,
   psychological) tend to follow terrain downslope toward water and seek
   concealment from natural features. Research basis: LeBlanc (2003),
   Koester (2008) — "Lost Person Behavior" empirical datasets.

4. **Line-of-Sight / Viewshed** — From known last-seen point, compute cumulative
   viewshed for all accessible points. High visibility = low concealment
   probability. Invert to yield concealment heat map.

5. **Vegetation Anomaly Detection (NDVI)** — Decomposing bodies and disturbed
   soil accelerate (or inhibit) vegetation growth. CDI (Cadaver Decomposition
   Island) research (Carter et al., 2010) shows NDVI signal within 6–24 months.
   Compare NDVI t1 vs t2 within accessibility envelope; flag anomalies >1.5σ.

6. **Elevation Change Detection** — Multi-epoch DEM differencing to detect
   digging, burial mounding, or terrain disturbance. Threshold: ±0.25m
   above expected seasonal variation.

7. **Synthesis Heat Map** — Weighted combination of:
   - Accessibility score (inverse distance × terrain cost)
   - Concealment score (inverse viewshed density)
   - NDVI anomaly score
   - Elevation change score
   - Historical incident patterns (if case database loaded)

#### 4b. Key Literature / Empirical Basis

- Koester, R.J. (2008). *Lost Person Behavior: A Search and Rescue Guide.*
  dbS Productions. (Standard behavioral profile reference for SAR.)
- Carter, D.O. et al. (2010). Cadaver decomposition in terrestrial ecosystems.
  *Naturwissenschaften*, 94(1), 12–24.
- LeBlanc, D. (2003). *Managing the Lost Person Incident.* NASAR.
- Tukey, J.W. (1977). Exploratory Data Analysis — statistical basis for
  anomaly thresholding.
- USGS Open-File Report 2016-1113 — LiDAR for forensic grave detection.

---

### 5. API Landscape Summary

#### Free Tiers (No Key Required)

- USGS 3DEP: No key. REST. Unlimited but rate-throttled.
- OpenTopography: Free API key (research). 2500 requests/day.
- Sentinel-2 via Copernicus Data Space: Free registration. OGC WCS/STAC.
- AWS Terrain Tiles: S3 open bucket, pay only for egress.

#### Free Tiers (Key Required, Free Research Tier)

- Sentinel Hub: `process-api.sentinel-hub.com`. Free 30,000 processing units/mo.
- Planet NICFI: Free for non-commercial. Tropics coverage only.
- Google Earth Engine: Free for research/non-commercial.
- Mapbox (tiles only): Free 50k tile requests/mo. (We use MapLibre which can
  use free tile sources instead.)

#### Paid (Not Used in ColdTrace v1)

- ArcGIS Online / Pro: $500–$10k/yr. Use ArcGIS MCP as optional integration
  if user has own license.
- Planet SuperDove: ~$2/km²/scene. Skip for v1.
- Maxar WorldView: Enterprise pricing. Skip for v1.

---

### 6. Monetization Path (WR North Star Compliance)

| Tier | Price | Target |
|------|-------|--------|
| Community (FOSS) | Free | Researchers, families, OSINT investigators |
| Pro | $49/mo | Cold case investigators, private detectives, journalists |
| Agency | $299/mo | Law enforcement units, ME offices, forensic firms |
| Enterprise | Custom | Federal agencies, national labs, large SAR orgs |

Pro differentiators: saved cases, multi-user, export to ArcGIS, advanced ML
anomaly scoring, case sharing with law enforcement API.

Giving Pledge: % of Pro/Agency/Enterprise revenue to Freedom Angel Fighters
(trafficking survivor restoration). Aligned with ColdTrace's public-safety mission.

---

### 7. Open Repositories Found (GitHub / Public)

| Repo | Stars | Relevance |
|------|-------|-----------|
| `mahdin75/gis-mcp` | ~200 | MCP server for GIS; GeoPandas, Rasterio, PySAL |
| `GarrickGarcia/ArcGISMCP` | ~50 | ArcGIS Online MCP |
| `nicogis/MCP-Server-ArcGIS-Pro-AddIn` | ~30 | ArcGIS Pro MCP (C#) |
| `Vedik-Kothari/Satellite_Change_Detection` | ~40 | Sentinel-2 NDVI K-Means change detection |
| `khann789/Satellite-Imagery-Anomaly-Detection` | ~15 | Isolation Forest NDVI anomaly |
| `opengeos/geoai` | ~3k | Deep-learning geospatial AI — change detection |
| `sacridini/Awesome-Lidar` | ~2k | Curated LiDAR library list |
| `jblindsay/whitebox-tools` | ~2.5k | WhiteboxTools — core viewshed engine |
| `OSGeo/gdal` | ~5k | GDAL — raster/vector Swiss army knife |
| `PDAL/PDAL` | ~1.5k | Point cloud processing |
| `laspy/laspy` | ~500 | Python LAS/LAZ I/O |
| `vikas-geotech/Time-series-Analysis-Sentinel-2` | ~30 | Sentinel-2 NDVI time-series |

---

### 8. Integration Points with Revvel Standards

- **oAudrey subdomain:** `coldtrace.oaudrey.com`
- **MCP server:** `gis-mcp` added as sidecar; expose ColdTrace tools
  to AI agents for case query and analysis trigger.
- **Affiliate links:** `get_best_link("forensic-gis-tools")` to surface
  relevant hardware (GPS, field tablets), training resources, and SAR
  organizations at monetizable touchpoints.
- **Agent Factory:** Register `coldtrace-analyst` agent template for
  autonomous cold case intake processing.

---

## Acceptance Criteria

- [ ] App loads at `coldtrace.oaudrey.com` (or locally via `index.html`)
- [ ] User can input date range, AOI bounding box, and last known location
- [ ] Demo mode runs viewshed simulation on map with probability overlay
- [ ] Backend API processes real DEM from OpenTopography (when key provided)
- [ ] Viewshed computed via WhiteboxTools; result returned as GeoTIFF/GeoJSON
- [ ] NDVI temporal diff computed for Sentinel-2 date range
- [ ] Heat map rendered on MapLibre GL with opacity controls
- [ ] Export as PNG + GeoJSON report
- [ ] All tests pass (`pytest` for backend, `vitest` for frontend)
- [ ] No proprietary dependencies in default FOSS mode
- [ ] oAudrey tab updated to include ColdTrace

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend (demo) | Static HTML + MapLibre GL JS (CDN) | Zero build step; viewable immediately |
| Frontend (production) | React 18 + Vite + TypeScript + Tailwind | Revvel standard web stack |
| Backend | Python 3.11 + FastAPI | Best for scientific/GIS libs |
| GIS engine | WhiteboxTools + GDAL + PDAL | FOSS; best-in-class |
| Satellite data | Sentinel Hub API (free tier) | NDVI temporal analysis |
| LiDAR data | OpenTopography REST API | Free research tier |
| Map tiles | MapLibre GL + OpenFreeMap (free) | No Mapbox key required |
| Database | PostgreSQL + PostGIS | Spatial queries; Revvel standard |
| ORM | SQLAlchemy | Python standard |
| Auth | Supabase Auth | Revvel standard |
| Hosting | `coldtrace.oaudrey.com` on DigitalOcean | Revvel standard |
| CI/CD | GitHub Actions | Revvel standard |

---

## Estimated Effort

| Phase | Scope | Notes |
|-------|-------|-------|
| v0 (demo) | Static HTML demo app | Complete in this WR; viewable via oaudrey immediately |
| v1 (MVP) | FastAPI backend + viewshed + NDVI diff | 2 weeks |
| v2 (full) | ML anomaly scoring + case database + export | 4–6 weeks |
| v3 (pro) | Auth + billing + agency API | 6–8 weeks |
