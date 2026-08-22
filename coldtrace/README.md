# 🔍 ColdTrace — Temporal GIS Cold-Case Investigation Platform

## Live Deployment

▶️ **[Open the live app & test it](https://midnghtsapphire.github.io/revvel-standards/docs/coldtrace/)**

## What Is This

**ColdTrace** is an open-source temporal GIS platform for cold case
investigations. Given a **date range**, a **last known location**, and an
**area of interest**, it automatically:

1. **Fetches multi-epoch geospatial data** — LiDAR point clouds (OpenTopography),
   Digital Elevation Models (USGS 3DEP, Copernicus GLO-30), and Sentinel-2
   satellite imagery. All free-tier APIs.

2. **Computes viewshed / line-of-sight** — Using WhiteboxTools against the
   downloaded DEM, it determines what was visible from the observer point and,
   inversely, which areas were concealed. Concealment ↑ = probability ↑.

3. **Detects temporal change** — NDVI (vegetation index) difference between
   two date epochs flags anomalies above a σ threshold. Cadaver Decomposition
   Island (CDI) research shows NDVI signal within 6–24 months.

4. **Detects elevation change** — Multi-epoch DEM differencing flags terrain
   disturbances ≥ 0.25 m (digging, burial mounding, soil movement).

5. **Computes accessibility isochrones** — Tobler's hiking function over the
   DEM generates a cost surface showing how far a subject could have traveled
   in the elapsed time. Subject behavioral profiles from Koester (2008).

6. **Synthesizes a probability heat map** — Weighted combination of
   accessibility, concealment, NDVI anomaly, and elevation change scores,
   yielding ranked priority search zones.

7. **Exports** — GeoJSON, CSV priority zones, map screenshot — ready for law
   enforcement, forensic investigators, and SAR coordinators.

---

## Quick Start — Demo Mode (No API Keys Required)

```bash
# Serve the static demo UI directly (no build step)
cd coldtrace
python3 -m http.server 8080
# → open http://localhost:8080
```

The demo loads the full UI on a MapLibre GL map with **simulated data** — no
API keys required. Every analysis module shows synthetic results so you can
explore the UX immediately.

---

## Full Stack Setup

### Prerequisites

- Python 3.11+
- Node.js 20+ and pnpm
- Docker + Docker Compose (optional, for full stack)

### Backend (FastAPI)

```bash
cd coldtrace/backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install GDAL (system-level)
# Ubuntu/Debian:
sudo apt-get install -y gdal-bin libgdal-dev python3-gdal

# Configure environment
cp ../.env.example ../.env
# Edit .env — set DEMO_MODE=false and add API keys

# Run
uvicorn main:app --reload --port 8000
# → API docs at http://localhost:8000/docs
```

### Frontend (React + Vite)

```bash
cd coldtrace/frontend
pnpm install
pnpm dev
# → http://localhost:5173
```

### Docker Compose (Full Stack)

```bash
cd coldtrace
cp .env.example .env
# Edit .env as needed
docker compose up --build
# → Frontend: http://localhost:5173
# → API: http://localhost:8000/docs
```

---

## API Keys (Free)

| Service | Purpose | Free Tier | Register |
|---------|---------|-----------|----------|
| **OpenTopography** | LiDAR + DEM fetch | 2,500 req/day | <https://opentopography.org> |
| **Sentinel Hub** | Satellite NDVI | 30k units/mo | <https://www.sentinel-hub.com> |
| **USGS EarthData** | Landsat + archive | Free | <https://urs.earthrs.gov> |

Set `DEMO_MODE=false` and add keys to `.env` to activate real data.

---

## GIS Engine Stack

| Role | Tool | License |
|------|------|---------|
| Viewshed / line-of-sight | **WhiteboxTools** | MIT |
| LiDAR processing | **PDAL** | BSD |
| LAS/LAZ I/O | **laspy** | BSD |
| Raster processing | **rasterio + GDAL** | MIT/X |
| Temporal analysis | **rioxarray + xarray** | Apache 2 |
| Spatial analysis | **GeoPandas + Shapely** | BSD |
| Map rendering | **MapLibre GL JS** | BSD-2 |
| Map tiles | **OpenFreeMap** | Free |

---

## Analytical Methodology

### Probability Weight Model

```text
P(location) =
  0.35 × accessibility_score    # Tobler 1993 hiking function
+ 0.30 × concealment_score      # inverse viewshed density
+ 0.20 × ndvi_anomaly_score     # CDI research (Carter et al., 2010)
+ 0.15 × elevation_change_score # terrain disturbance
```

### Subject Behavioral Profiles

Based on Koester (2008) *Lost Person Behavior* empirical data:

| Subject Type | Expected Distance Range |
|-------------|------------------------|
| Person (healthy adult) | 3–8 km |
| Person (impaired/disoriented) | 1–3.5 km |
| Person (elderly) | 1.5–4 km |
| Person (child) | 0.5–2.5 km |
| Remains | 0–0.5 km from placement site |
| Vehicle | 2–10 km |

---

## Architecture

```text
coldtrace/
├── index.html              ← Static demo app (viewable immediately, no build)
├── .env.example            ← Environment template
├── docker-compose.yml      ← Full stack (db + api + frontend)
├── README.md               ← This file
├── backend/                ← Python FastAPI
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   ├── routers/
│   │   ├── analysis.py     ← POST /analysis/run, GET /analysis/{id}
│   │   ├── cases.py        ← CRUD /cases
│   │   └── data.py         ← GET /data/dem, /data/ndvi-diff, /data/sources
│   ├── services/
│   │   ├── viewshed.py     ← WhiteboxTools viewshed
│   │   ├── temporal.py     ← NDVI + elevation change detection
│   │   ├── heatmap.py      ← Probability synthesis
│   │   ├── opentopo.py     ← OpenTopography REST client
│   │   └── sentinel.py     ← Sentinel Hub REST client
│   └── models/
│       ├── analysis.py     ← Pydantic analysis models
│       └── case.py         ← Pydantic case models
└── frontend/               ← React 18 + Vite + TypeScript + Tailwind
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        └── components/
            ├── MapView.tsx
            ├── DateRangePanel.tsx
            ├── AnalysisPanel.tsx
            └── ResultsPanel.tsx
```

---

## MCP Integration

ColdTrace exposes a GIS MCP server (via `mahdin75/gis-mcp`) so AI agents
can query analysis results programmatically:

```json
{
  "mcpServers": {
    "coldtrace-gis": {
      "command": "python",
      "args": ["-m", "gis_mcp.server"],
      "env": { "COLDTRACE_API": "http://localhost:8000" }
    }
  }
}
```

---

## Monetization

| Tier | Price | Features |
|------|-------|---------|
| Community | Free | Demo mode, single session |
| Pro | $49/mo | Real data, saved cases, exports, API access |
| Agency | $299/mo | Multi-user, ArcGIS export, priority support |
| Enterprise | Custom | Federal/legal, dedicated infra |

Giving Pledge: % of Pro/Agency/Enterprise revenue to Freedom Angel Fighters
(trafficking survivor reskilling, recovery, restoration).

---

## References

- Koester, R.J. (2008). *Lost Person Behavior.* dbS Productions.
- Carter, D.O. et al. (2010). Cadaver decomposition in terrestrial ecosystems. *Naturwissenschaften*, 94(1).
- USGS OFR 2016-1113 — LiDAR for forensic grave detection.
- WhiteboxTools documentation: <https://jblindsay.github.io/ghrg/WhiteboxTools/>
- OpenTopography API: <https://opentopography.org/developers>
- Sentinel Hub Process API: <https://docs.sentinel-hub.com/api/latest/>

---

*ColdTrace is an open-source, non-partisan investigation tool. It does not
access law enforcement databases and does not store case data beyond your own
session. All data sources used are public / free-tier.*
