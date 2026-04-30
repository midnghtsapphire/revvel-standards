# GrowlingEyes Python Intelligence Tooling

**Product:** GrowlingEyes — Freedom Angel Corp — "We believe you."  
**Standards Repo:** `midnghtsapphire/revvel-standards`

---

## Directory Structure

```
growlingeyes/
├── requirements.txt              # Python deps: PyGoogleNews, feedparser, rasterio, FastMCP …
├── requirements-dev.txt          # Test deps: pytest, pytest-asyncio, responses
├── tools/
│   ├── news_feed.py              # PyGoogleNews OSINT feed (20 intelligence domains)
│   ├── apt_signals.py            # APT signal scanner (CISA KEV, NVD, OTX, CISA RSS)
│   ├── stream_listener.py        # Real-time streams: AIS, NOAA weather, USGS quakes, RSS
│   ├── scraper.py                # Intelligence scrapers: FAA TFR, NIFC fires, OFAC, UN
│   └── trigger_extractor.py      # NEW: Trigger extraction engine with scoring & correlation
├── patterns/
│   ├── cyber_threats.yml         # Trigger patterns for cyber domain
│   ├── kinetic_events.yml        # Trigger patterns for conflict/military domain
│   ├── environmental.yml         # Trigger patterns for disasters/weather
│   └── README.md                 # Pattern configuration guide
├── axion_mcp/
│   ├── server.py                 # Axion Planetary MCP — axion_sar2optical foundation model
│   ├── pyproject.toml
│   └── weights/                  # (not committed) axion_sar2optical_v1.onnx goes here
└── tests/
    └── test_axion_sar2optical.py # Unit tests for SAR-to-optical pipeline
```

---

## Quick Start

```bash
pip install -r growlingeyes/requirements.txt

# News feeds (all 20 OSINT domains)
python growlingeyes/tools/news_feed.py --topics apt cyber military --limit 5

# APT signals (CISA + NVD + OTX)
python growlingeyes/tools/apt_signals.py --sources cisa nvd

# Real-time streams
python growlingeyes/tools/stream_listener.py --streams noaa_weather usgs_quakes

# Intelligence scrapers
python growlingeyes/tools/scraper.py --targets faa_tfr nifc_fires

# Trigger extraction (NEW)
python growlingeyes/tools/trigger_extractor.py --domains cyber_threats kinetic_events --top 50

# Axion Planetary MCP server
python -m growlingeyes.axion_mcp.server
```

---

## Trigger Extraction Engine

**NEW:** GrowlingEyes now includes an advanced trigger extraction engine that converts raw OSINT data into actionable intelligence alerts.

**Key Features:**
- **Pattern Recognition:** Keyword, regex, threshold, and anomaly detection
- **Multi-Domain Support:** Cyber threats, kinetic events, environmental disasters, dark web
- **Scoring & Prioritization:** 0-100 score with temporal, geographic, and correlation boosts
- **Correlation Engine:** Links triggers from multiple sources for multi-source confirmation
- **Configurable Patterns:** YAML pattern files for each intelligence domain

**Documentation:**
- Methodology: [`docs/TRIGGER_EXTRACTION_METHODOLOGY.md`](../docs/TRIGGER_EXTRACTION_METHODOLOGY.md)
- Database Schema: [`docs/growlingeyes/TRIGGER_DATABASE_SCHEMA.md`](../docs/growlingeyes/TRIGGER_DATABASE_SCHEMA.md)
- Pattern Configs: [`patterns/`](patterns/)

**Usage:**
```bash
# Extract triggers from all domains
python growlingeyes/tools/trigger_extractor.py

# Extract from specific domains
python growlingeyes/tools/trigger_extractor.py --domains cyber_threats kinetic_events

# Save to JSON
python growlingeyes/tools/trigger_extractor.py --output triggers.json --top 50
```

---

## Axion Planetary MCP

See [`docs/AXION_PLANETARY_MCP.md`](../docs/AXION_PLANETARY_MCP.md) for the
full specification of the `axion_sar2optical` foundation model.

**Primary function:** `axion_sar2optical` — converts SAR radar imagery into
optical-like images to enable cloud-free Earth observation.

---

## Environment Variables

| Variable | Tool | Purpose |
|---|---|---|
| `OTX_API_KEY` | `apt_signals.py` | AlienVault OTX subscribed pulses |
| `NVD_API_KEY` | `apt_signals.py` | NVD CVE API (optional — increases rate limit) |
| `AISSTREAM_API_KEY` | `stream_listener.py` | AIS vessel WebSocket stream |
| `AXION_SAR2OPTICAL_WEIGHTS` | `axion_mcp/server.py` | ONNX model weights path |
| `AXION_OUTPUT_FORMAT` | `axion_mcp/server.py` | Default output format (png/jpeg) |
