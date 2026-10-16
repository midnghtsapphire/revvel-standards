# Geospatial Database Architecture, Taxonomy, and Data Dictionary

## 1. Executive Architecture Overview

Modern Search and Rescue (SAR), forensic cold case detection, and clandestine grave recovery require unified geospatial, remote sensing, and municipal data ingestion architectures. The integration of high-resolution elevation data—announced as 100% complete across the United States baseline at Geo Week 2026 under the USGS 3D Elevation Program (3DEP)—provides a seamless, multi-temporal "digital twin" of physical terrain. However, turning raw point clouds, ground-penetrating radar (GPR) radargrams, soil chemistry metrics, and municipal permit logs into actionable search intelligence requires a robust database architecture.

This document establishes the master technical framework, taxonomic hierarchy, data dictionary, and survey schedule for a unified geospatial database. It details how spatial datasets are partitioned across political and hydrological boundaries, how government and private geofence buffers are calculated, how indexed public catalogs differ from unindexed dark data portals, and how multi-agent software engineering standards preserve code traceability during development.

---

## 2. USGS 3DEP & Multi-Source Geospatial Partitioning Framework

Geospatial data collection rarely aligns with municipal or political boundaries. To manage petabyte-scale point clouds and high-resolution digital elevation models (DEMs), datasets are partitioned using a three-tier nested geographic hierarchy:

```
[Level 1: Work Units (Projects)] ──> AOI defined by multi-agency partnerships & flight lines.
                                           │
[Level 2: Hydrographic Basins]    ──> Partitioned by USGS Hydrologic Unit Codes (HUC-8 / HUC-12).
                                           │
[Level 3: Seamless Tiles]        ──> Standardized 1 km x 1 km or 5,000 ft x 5,000 ft compressed LAZ grids.
```

### Partitioning Tier Specifications

1. **Work Units (Project Area of Interest):** Flight campaigns are funded and executed as Work Units covering broad geographical Areas of Interest (AOIs). These frequently span multiple counties or municipalities based on topography and flight logistics. In Alaska, high cloud cover and remote terrain necessitate the use of Interferometric Synthetic Aperture Radar (IfSAR) rather than optical LiDAR.
2. **Hydrologic Unit Code (HUC) Basins:** Watershed boundaries (HUC-8, HUC-10, HUC-12) serve as the primary natural partitioning scheme for flood modeling, runoff tracking, and taphonomic stream transport analysis.
3. **Seamless Tile Grids:** For processing and distribution, raw LAS/LAZ point clouds are tile-partitioned into 1 km x 1 km (or 5,000 ft x 5,000 ft) seamless tiles, tagged with WGS84 or State Plane projection metadata and USGS Quality Levels (QL0 to QL2).

---

## 3. Government & Private Geofencing Engine Specifications

Geofencing allows automated search engines to restrict spatial queries to relevant search corridors while respecting jurisdictional limits and privacy boundaries.

### Geofencing Models & Analytical Parameters

| Geofence Category | Entity Type | Governing Geometry | Primary Use Case & Operational Radius |
| :--- | :--- | :--- | :--- |
| **Watershed Basin Geofence** | Government (USGS / EPA) | HUC-12 Polygon Boundary | Hydrodynamic runoff & stream transport modeling |
| **Right-of-Way (ROW) Buffer** | Government (Municipal PW) | 500-foot Linear Buffer | Underground utility vault & catch basin audits |
| **Cell Tower Azimuth Sector** | Private / Law Enforcement | 120° Sector Wedge (1.2 km) | Mobile phone ping triangulation & handset location |
| **Property Parcel Geofence** | Private / County Assessor | Cadastral Polygon (PIN) | Property boundary verification & access authorization |
| **Vault Shaft Perimeter** | Private / Utility Operator | 10m x 5m Micro-Geofence | High-frequency GPR & borescope inspection targets |

---

## 4. Dual-Mode Search Mechanics: Indexed Catalogs vs. Unindexed Dark Data

A primary challenge in spatial intelligence is that critical evidence exists across two distinct data environments:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DUAL-MODE SEARCH ARCHITECTURE                         │
├─────────────────────────────────────────┬───────────────────────────────────────┤
│        1. INDEXED PUBLIC CATALOGS       │       2. UNINDEXED DARK DATA          │
├─────────────────────────────────────────┼───────────────────────────────────────┤
│ • USGS TNM Access API / LidarExplorer  │ • Municipal Permit Portals (BLDC/ROWE)│
│ • NRCan Open Canada GeoHub              │ • Private GPR Radargram Logs           │
│ • OpenTrafficCamMap Camera Feeds        │ • Laboratory Soil Field Notebooks     │
│ • Direct REST / SpatioTemporal APIs     │ • Web Scraping via MCP Connectors     │
└─────────────────────────────────────────┴───────────────────────────────────────┘
```

1. **Indexed Public Catalogs:** Public datasets indexed in structured repositories (e.g., USGS National Map, NRCan GeoHub). These endpoints respond directly to automated REST queries using WGS84 bounding box coordinates (`min_lat`, `max_lat`, `min_lon`, `max_lon`).
2. **Unindexed Dark Data & Portals:** Records stored inside non-indexed web portals (e.g., city building permits, sewer trench logs, private GPR scans). Accessing this data requires Agent-to-Agent (A2A) protocol tools and Model Context Protocol (MCP) servers (such as Croma MCP, Firecrawl MCP, and WebResearcher MCP) to navigate web portals and parse unstructured records.

---

## 5. Master System Taxonomy Framework

To maintain relational integrity across diverse spatial datasets, variables are categorized under a four-tier taxonomy:

* **Class 1: Federal & Regional Remote Sensing (ELEV)** — Airborne LiDAR point clouds, bare-earth DEMs, IfSAR radar, satellite multispectral imagery, and NASA GEDI spaceborne LiDAR.
* **Class 2: Subsurface & Geophysical Sensors (SUB)** — Ground-Penetrating Radar (GPR) 2.0 GHz radargrams, dielectric permittivity readings, Photoionization Detector (PID) gas sniffing, and borescope video feeds.
* **Class 3: Environmental & Chemical Taphonomy (ENV)** — Soil extraction, humic acid PCR inhibition metrics, soil moisture SAR viscosity, and vegetation nitrate/NDVI flushes.
* **Class 4: Municipal, Telecom & Infrastructure (MUN)** — Right-of-Way street cuts, plumbing/sewer invert schematics, cell tower Call Detail Records (CDR), and CCTV optical streams.

---

## 6. Master Geospatial & Environmental Data Dictionary

| Field Name | Data Type | Physical Unit | Field Description & Purpose | Valid Range / Format | Primary Source Endpoint |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `survey_id` | STRING | Code | Primary key for the survey campaign | e.g., `USGS-3DEP-NAT-2026` | Case Master DB |
| `data_category` | STRING | Taxonomy | Taxonomic class of the survey domain | ELEV, SUB, ENV, MUN | System Taxonomy |
| `jurisdiction` | STRING | Geopolitical | Governing administrative jurisdiction | County / City / Federal | USGS / Municipal GIS |
| `partitioning_scheme` | STRING | Partition | Spatial division method used for storage | 1km Tile / HUC-12 / Parcel | OpenGIS Specifications |
| `acquisition_method` | STRING | Sensor | Instrument or procedure used for capture | Airborne LiDAR / GPR / Soil Core | Field Metadata Header |
| `quality_level` | STRING | Precision | Resolution or vertical accuracy metric | QL0 (2.5cm) to QL2 (10cm) | USGS 3DEP Spec v2.1 |
| `survey_status` | STRING | State | Current operational lifecycle state | Completed / Scheduled / Outlier | Project Tracker Dashboard |
| `geofence_type` | STRING | Geometry | Boundary type used for spatial filtering | Bounding Box / ROW / Wedge | PostGIS Spatial Index |
| `index_type` | STRING | Index | Public availability classification | Indexed / Unindexed Portal | A2A Ingestion Engine |
| `latitude_dec` | FLOAT64 | Degrees (°N) | WGS84 latitude of survey centroid | -90.000000 to +90.000000 | GPS / Spatial Map |
| `longitude_dec` | FLOAT64 | Degrees (°W) | WGS84 longitude of survey centroid | -180.000000 to +180.000000 | GPS / Spatial Map |
| `dielectric_r` | FLOAT64 | Permittivity | GPR relative dielectric permittivity | 1.0 (Air) to 80.0 (Water) | GPR Radargram Processor |
| `pcr_inhibition_risk` | STRING | Risk Rating | Biochemical PCR enzyme inhibition risk | Low, Moderate, High, Extreme | Soil Chemistry Lookup |

---

## 7. Master Survey & Data Acquisition Schedule Lookup Table

| Survey ID | Category | Jurisdiction | Acquisition Method | Status | Geofence Type | Index Type |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **USGS-3DEP-NAT-2026** | Federal LiDAR | United States (National) | Airborne LiDAR / IfSAR | **Completed** | HUC-8/12 Watershed | Indexed (TNM Catalog) |
| **USGS-3DEP-REFLOW-001** | Federal LiDAR Reflow | Franklin County, OH | High-Density LiDAR (20 pts/m²) | **Scheduled** | Municipal ROW (500ft) | Indexed (USGS Tracker) |
| **NRCAN-LIDAR-BC-2025** | Provincial LiDAR | Thompson-Nicola RD, BC | Airborne LiDAR (1064nm) | **Completed** | Resort Boundary + 5km | Indexed (Open Canada) |
| **COLUMBUS-ROW-2026** | Municipal Utility | City of Columbus, OH | Subsurface Utility Engineering | **Pending** | Gateway Complex Polygon | Unindexed (City Portal) |
| **GPR-SWEEP-SHAFFER-001** | Subsurface GPR | Pearl Alley ROW, Columbus | 2.0 GHz Shielded GPR | **Outlier** | Vault Shaft (10m x 5m) | Unindexed (Dark Data) |
| **SOIL-CORE-SHTUKA-2026** | Environmental Soil | Fairways Catchment, BC | Aseptic Silt Core + Neutralization | **Scheduled** | Riparian Drainage Zone | Unindexed (Field Notes) |
| **CELL-PING-2018** | Telecom RF | Burfield Tower Sector, BC | Call Detail Records (CDR) | **Completed** | 120° Azimuth Sector | Unindexed (Law Enforcement) |
| **CCTV-TRAFFIC-2026** | Optical CCTV | BC Highway Cams / DriveBC | Frame Scraping & HOG Detection | **Completed** | Highway 5 Corridor | Indexed (Camera Feed API) |

---

## 8. Developer Code Review & Script Mapping Matrix

To maintain code traceability during multi-agent software development, scripts are mapped directly to their data sources and must include standardized version headers:

| Code Script Name | Version | Mapped Data Source / Endpoint | Primary Function Handler |
| :--- | :--- | :--- | :--- |
| `geofence_metadata_access_engine.py` | v11.0 | USGS LidarExplorer / City Portals | `GeofenceSpatialCalculator` & `UnindexedDataConnector` |
| `master_universal_search_ingestion_v10.py` | v10.0 | USGS 3DEP / NRCan / Wayback CDX | `USGS3DEPLiDARConnector` & `WaybackArchiveConnector` |
| `cctv_multi_use_toolkit.py` | v1.0 | OpenTrafficCamMap / DriveBC | `PublicTrafficCamHarvester` & `RTSPStreamHandler` |
| `edna_dna_forensic_engine.py` | v1.0 | Soil Chemistry & Lab Logs | `SoilInhibitionNeutralizer` |
