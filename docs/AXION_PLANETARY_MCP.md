# Axion Planetary MCP — Specification

**Version:** 1.0.0  
**Date:** April 2026  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Product:** GrowlingEyes — Freedom Angel Corp  
**Status:** Single Source of Truth (SSOT)

---

## Overview

The **Axion Planetary MCP** is a Python-based FastMCP server that exposes
geospatial Earth observation tools to the GrowlingEyes AI agent swarm.

Its **primary function** is `axion_sar2optical` — a proprietary foundation model
that converts SAR (Synthetic Aperture Radar) radar imagery into optical-like
images, enabling **cloud-free Earth observation** anywhere on the planet.

> **Quiz answer (C):** "Converts SAR radar imagery into optical-like images to
> enable cloud-free Earth observation."
>
> SAR can penetrate clouds and darkness; the model translates this data into a
> visual format that humans and LLMs can more easily interpret.

---

## Why SAR-to-Optical

| Problem | SAR Solution |
|---|---|
| Clouds cover 70% of Earth at any time | SAR penetrates clouds completely |
| Night-time surveillance | SAR is active — illuminates its own scene |
| Wildfires produce smoke | SAR sees through smoke |
| Optical imagery is easy to interpret | SAR backscatter is not |
| LLMs cannot reason over raw backscatter | Optical-like images are directly interpretable |

The `axion_sar2optical` model bridges the gap between SAR's all-weather
capability and the interpretability of optical imagery — giving GrowlingEyes
persistent, cloud-free situational awareness.

---

## Server Details

| Field | Value |
|---|---|
| **File** | `growlingeyes/axion_mcp/server.py` |
| **Package** | `axion-planetary-mcp` |
| **Framework** | FastMCP ≥ 3.2.0 (patched — CVEs fixed in 2.13+, 2.14+, 3.2+) |
| **Python** | ≥ 3.11 |
| **Transport** | stdio (standard FastMCP) |
| **Run** | `python -m growlingeyes.axion_mcp.server` or `axion-planetary-mcp` |

---

## MCP Tools

### `axion_sar2optical` ← **Primary Function**

Converts a base64-encoded SAR GeoTIFF into a base64-encoded optical-like PNG/JPEG.

**Processing pipeline:**
1. Decode base64 → GeoTIFF bytes
2. Load float32 SAR array: Band 1 = VV (or HH), Band 2 = VH (or HV, optional)
3. Lee speckle filtering (optional) — reduces multiplicative SAR noise
4. Log transform (dB scale) + percentile normalisation
5. Colorisation:
   - **With ONNX model weights:** `axion_sar2optical_v1_onnx` — pix2pix/U-Net translation
   - **Without weights (fallback):** Physics-based CPU colorisation:
     - R ← VV dB (rough/built surfaces)
     - G ← VH dB (vegetation volume scattering)
     - B ← VV/VH ratio dB (flooding/moisture)
6. Optional histogram equalisation
7. Encode → base64 PNG or JPEG

**Input:**
```json
{
  "sar_b64": "<base64-encoded GeoTIFF>",
  "apply_speckle_filter": true,
  "histogram_equalise": false,
  "output_format": "png"
}
```

**Output:**
```json
{
  "image_b64": "<base64-encoded PNG>",
  "format": "png",
  "width": 512,
  "height": 512,
  "method": "axion_sar2optical_v1_onnx",
  "bands": "dual_pol"
}
```

---

### `axion_describe_sar`

Analyse a SAR GeoTIFF and return band statistics + processing recommendations
without converting to optical.

---

### `axion_batch_convert`

Convert multiple SAR images in a single MCP call. Accepts a list of
`{sar_b64, id}` items and returns results in the same order.

---

### `axion_status`

Returns operational status — whether the ONNX model weights are loaded or the
CPU fallback is active.

---

## MCP Resources

### `data://axion-planetary/config`

Returns server configuration including model load status and supported
polarisation modes.

### `data://axion-planetary/sar-sources`

Authoritative list of SAR data sources compatible with `axion_sar2optical`:

| Satellite | Operator | Resolution | Revisit | Cost |
|---|---|---|---|---|
| Sentinel-1 | ESA Copernicus | 10 m | 6 days | Free |
| ALOS PALSAR-2 | JAXA | 10 m | 14 days | Free |
| RADARSAT Constellation | MDA/CSA | 5 m | 4 days | Paid |
| Capella Space | Capella | 0.5 m | ~daily | Paid |
| ICEYE | ICEYE | 1 m | ~daily | Paid |

---

## MCP Prompts

### `analyse_sar_scene(scene_context)`

Generates a structured analysis prompt for an AI agent to interpret a
SAR-derived optical-like image.

---

## Model Weights

The `axion_sar2optical_v1.onnx` weights are a proprietary foundation model
trained on paired Sentinel-1 SAR / Sentinel-2 optical data.

| Field | Value |
|---|---|
| **Architecture** | Conditional GAN / U-Net (pix2pix variant) |
| **Input** | `[1, 2, H, W]` float32 (VV + VH), log-normalised to `[-1, 1]` |
| **Output** | `[1, 3, H, W]` float32 RGB optical-like, values in `[-1, 1]` |
| **Default path** | `growlingeyes/axion_mcp/weights/axion_sar2optical_v1.onnx` |
| **Env override** | `AXION_SAR2OPTICAL_WEIGHTS=/path/to/weights.onnx` |

When weights are not present the server falls back to the physics-based CPU
colorisation pipeline, which is deterministic and does not require GPU hardware.

---

## Wiring into `.mcp.json`

```json
"axion-planetary": {
  "command": "python",
  "args": ["-m", "growlingeyes.axion_mcp.server"],
  "env": {
    "AXION_SAR2OPTICAL_WEIGHTS": "${AXION_SAR2OPTICAL_WEIGHTS}",
    "AXION_OUTPUT_FORMAT": "png"
  }
}
```

---

## Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `AXION_SAR2OPTICAL_WEIGHTS` | No | `axion_mcp/weights/axion_sar2optical_v1.onnx` | Path to ONNX model weights |
| `AXION_OUTPUT_FORMAT` | No | `png` | Default output format (`png` or `jpeg`) |

---

## GrowlingEyes Intelligence Tool Wiring

The `growlingeyes/tools/` directory exposes five Python tools that feed
intelligence into the GrowlingEyes data pipeline:

| Tool | Description | Primary Library |
|---|---|---|
| `news_feed.py` | Google News OSINT feed across 20 domains | **PyGoogleNews** |
| `apt_signals.py` | APT threat-intel scanner (CISA KEV, NVD, OTX, CISA RSS) | httpx, feedparser |
| `stream_listener.py` | Real-time streams: AIS vessels, NOAA weather, USGS quakes, RSS | websockets, httpx, feedparser |
| `scraper.py` | HTML/XML intelligence scrapers: FAA TFR, NIFC fires, OFAC SDN, UN sanctions | httpx, BeautifulSoup |
| `weak_signal_finder.py` | Weak signal detection from RSS feeds (regex/token-based emerging themes) | feedparser, Rich |

All tools read from `.env` and follow the GrowlingEyes error handling standards:
no uncaught exceptions, empty list fallback on failure, Rich CLI output.

---

## Installation

```bash
# Install all GrowlingEyes Python tool dependencies
pip install -r growlingeyes/requirements.txt

# Dev + test dependencies
pip install -r growlingeyes/requirements.txt -r growlingeyes/requirements-dev.txt

# Run the Axion Planetary MCP server
python -m growlingeyes.axion_mcp.server

# Run individual tools
python growlingeyes/tools/news_feed.py --topics apt cyber military
python growlingeyes/tools/apt_signals.py --sources cisa nvd
python growlingeyes/tools/stream_listener.py --streams noaa_weather usgs_quakes gdacs
python growlingeyes/tools/scraper.py --targets faa_tfr nifc_fires
python growlingeyes/tools/weak_signal_finder.py --domains cyber maritime
```

---

*GrowlingEyes is a product of Freedom Angel Corp — "We believe you."*
