# GrowlingEyes Python Intelligence Tooling

**Product:** GrowlingEyes — Freedom Angel Corp — "We believe you."
**Standards Repo:** `midnghtsapphire/revvel-standards`

---

## Directory Structure

```text
growlingeyes/
├── requirements.txt              # Python deps: PyGoogleNews, feedparser, rasterio, FastMCP …
├── requirements-dev.txt          # Test deps: pytest, pytest-asyncio, responses
├── tools/
│   ├── news_feed.py              # PyGoogleNews OSINT feed (20 intelligence domains)
│   ├── apt_signals.py            # APT signal scanner (CISA KEV, NVD, OTX, CISA RSS)
│   ├── stream_listener.py        # Real-time streams: AIS, NOAA weather, USGS quakes, RSS
│   ├── scraper.py                # Intelligence scrapers: FAA TFR, NIFC fires, OFAC, UN
│   ├── trigger_extractor.py      # Trigger extraction engine with scoring & correlation
│   └── weak_signal_finder.py     # Weak signal detection from RSS feeds (NLP-based)
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

# Trigger extraction
python growlingeyes/tools/trigger_extractor.py --domains cyber_threats kinetic_events --top 50

# Weak signal detection (emerging themes from RSS feeds)
python growlingeyes/tools/weak_signal_finder.py --domains cyber maritime
python growlingeyes/tools/weak_signal_finder.py --threshold 3 --output signals.json
python growlingeyes/tools/weak_signal_finder.py --daemon --interval 3600


# Axion Planetary MCP server
python -m growlingeyes.axion_mcp.server
```

---

## Weak Signal Finder

The **Weak Signal Finder** detects emerging themes and patterns from RSS news feeds
using NLP-based text analysis. It aggregates articles across intelligence domains,
computes word frequency scores, identifies contextual relationships between terms,
and surfaces weak signals that may indicate emerging threats or trends.

**Inspired by:** [LittleViewer/WeakSignalFinder](https://github.com/LittleViewer/WeakSignalFinder)

### How It Works

1. **Feed Aggregation** — Fetches RSS feeds from domain-specific sources (cyber, maritime, conflict, etc.)
2. **Text Processing** — Cleans and tokenizes article text, removes stopwords
3. **Frequency Analysis** — Computes word intensity scores across all articles
4. **Contextual Analysis** — Identifies word pairs that appear near each other
5. **Signal Scoring** — Scores signals based on intensity, diversity, and contextual strength
6. **Output** — Produces JSON reports with top emerging themes and contextual relationships

### Supported Domains

- **cyber** — CISA, US-CERT, Krebs on Security, The Hacker News, Bleeping Computer
- **maritime** — gCaptain, Splash247, Maritime Executive, FreightWaves
- **conflict** — Crisis Group, ReliefWeb, ACLED
- **geopolitical** — Foreign Policy, Defense One, War on the Rocks
- **migration** — IOM News, UNHCR, Mixed Migration
- **climate** — NOAA News, Climate Central, Carbon Brief
- **supply_chain** — Supply Chain Dive, Logistics Management

### Usage Examples

```bash
# Scan all domains
python growlingeyes/tools/weak_signal_finder.py

# Scan specific domains
python growlingeyes/tools/weak_signal_finder.py --domains cyber maritime conflict

# Adjust sensitivity threshold (higher = fewer, stronger signals)
python growlingeyes/tools/weak_signal_finder.py --threshold 5

# Save results to file
python growlingeyes/tools/weak_signal_finder.py --output my_signals.json

# Run continuously (daemon mode, scan every hour)
python growlingeyes/tools/weak_signal_finder.py --daemon --interval 3600
```

### Output Format

```json
{
  "domain": "cyber",
  "signal_timestamp": "2026-04-30T16:30:00Z",
  "signal_score": 82.5,
  "article_count": 47,
  "top_emerging_themes": ["ransomware", "vulnerability", "patch", "exploit", "zero-day"],
  "intensity_words": {
    "ransomware": 23,
    "vulnerability": 18,
    "patch": 15
  },
  "contextual_pairs": [
    ["ransomware", "vulnerability"],
    ["zero-day", "exploit"],
    ["patch", "security"]
  ]
}
```

---

## Trigger Extraction Engine

GrowlingEyes includes an advanced trigger extraction engine that converts raw OSINT data into actionable intelligence alerts.

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
