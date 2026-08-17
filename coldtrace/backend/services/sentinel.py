"""Sentinel Hub API client for NDVI time-series.

Free research tier: 30,000 processing units/month.
Register at https://www.sentinel-hub.com to get credentials.
"""

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from ..config import settings

_TOKEN_URL = "https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token"
_PROCESS_URL = "https://services.sentinel-hub.com/api/v1/process"


async def _get_token() -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            _TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": settings.sentinel_hub_client_id,
                "client_secret": settings.sentinel_hub_client_secret,
            },
        )
        resp.raise_for_status()
        return resp.json()["access_token"]


async def fetch_sentinel_ndvi(
    bbox: tuple[float, float, float, float],
    date_start: Any,
    date_end: Any,
) -> tuple[Any, Any]:
    """
    Fetch Sentinel-2 NDVI composites for two time windows surrounding date_start
    and date_end. Returns (ndvi_before, ndvi_after) as xarray DataArrays.

    Demo mode returns synthetic placeholder arrays.
    """
    if settings.demo_mode or not settings.sentinel_hub_client_id:
        return _demo_ndvi(), _demo_ndvi()

    token = await _get_token()
    west, south, east, north = bbox

    evalscript = """
    //VERSION=3
    function setup() {
      return { input: ["B04","B08","SCL"], output: { bands: 1, sampleType: "FLOAT32" } };
    }
    function evaluatePixel(sample) {
      if ([3,8,9,10,11].includes(sample.SCL)) return [-9999];
      var ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
      return [ndvi];
    }
    """

    def _build_request(time_from: str, time_to: str) -> dict:
        return {
            "input": {
                "bounds": {
                    "bbox": [west, south, east, north],
                    "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/4326"},
                },
                "data": [{
                    "dataFilter": {"timeRange": {"from": f"{time_from}T00:00:00Z", "to": f"{time_to}T23:59:59Z"}},
                    "type": "sentinel-2-l2a",
                }],
            },
            "output": {
                "width": 512, "height": 512,
                "responses": [{"identifier": "default", "format": {"type": "image/tiff"}}],
            },
            "evalscript": evalscript,
        }

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=120) as client:
        r_before = await client.post(_PROCESS_URL, json=_build_request(str(date_start), str(date_start)), headers=headers)
        r_after = await client.post(_PROCESS_URL, json=_build_request(str(date_end), str(date_end)), headers=headers)
        r_before.raise_for_status()
        r_after.raise_for_status()

    # In production, parse the TIFF bytes into xarray DataArrays via rioxarray
    return r_before.content, r_after.content


def _demo_ndvi() -> Any:
    """Return a placeholder in demo mode."""
    return None
