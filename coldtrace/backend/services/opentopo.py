"""OpenTopography REST API client.

Free tier: 2,500 requests/day. Register at https://opentopography.org to get a key.
Supports SRTMGL1 (30m global), COP30 (Copernicus 30m), and USGS1m (1m USA).
"""

from __future__ import annotations

import asyncio
import tempfile
from pathlib import Path

import httpx

from ..config import settings

_BASE = "https://portal.opentopography.org/API/globaldem"
_DATASET_MAP = {
    "SRTMGL1": "SRTMGL1",
    "COP30": "COP30",
    "USGS1m": "USGS1m",
}


async def fetch_dem(
    bbox: tuple[float, float, float, float],
    dataset: str = "SRTMGL1",
    output_format: str = "GTiff",
) -> Path:
    """
    Fetch a DEM tile from OpenTopography for the given bounding box.

    Parameters
    ----------
    bbox : (west, south, east, north)
    dataset : one of SRTMGL1, COP30, USGS1m
    output_format : GTiff (default)

    Returns
    -------
    Path to the downloaded GeoTIFF file.
    """
    if settings.demo_mode or not settings.opentopography_api_key:
        return await _demo_dem(bbox)

    west, south, east, north = bbox
    dem_type = _DATASET_MAP.get(dataset, "SRTMGL1")

    params = {
        "demtype": dem_type,
        "west": west,
        "south": south,
        "east": east,
        "north": north,
        "outputFormat": output_format,
        "API_Key": settings.opentopography_api_key,
    }

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.get(_BASE, params=params)
        resp.raise_for_status()

    tmp = Path(tempfile.mkdtemp())
    dem_path = tmp / f"dem_{dataset}.tif"
    dem_path.write_bytes(resp.content)
    return dem_path


async def _demo_dem(bbox: tuple[float, float, float, float]) -> Path:
    """Return a placeholder path in demo mode."""
    tmp = Path(tempfile.mkdtemp())
    path = tmp / "demo_dem.tif"
    path.write_text("demo")
    return path
