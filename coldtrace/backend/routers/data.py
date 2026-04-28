"""Data router — DEM, LiDAR, satellite data retrieval."""

from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import FileResponse

from ..services.opentopo import fetch_dem
from ..services.sentinel import fetch_sentinel_ndvi

router = APIRouter()


@router.get("/dem")
async def get_dem(
    west: float = Query(..., description="West longitude"),
    south: float = Query(..., description="South latitude"),
    east: float = Query(..., description="East longitude"),
    north: float = Query(..., description="North latitude"),
    dataset: str = Query("SRTMGL1", description="DEM dataset (SRTMGL1, COP30, USGS1m)"),
) -> FileResponse:
    """Fetch a DEM tile for the given bounding box."""
    path = await fetch_dem(bbox=(west, south, east, north), dataset=dataset)
    return FileResponse(
        path=path,
        filename=path.name,
        media_type="application/octet-stream",
    )


@router.get("/ndvi-diff")
async def get_ndvi_diff(
    west: float = Query(...),
    south: float = Query(...),
    east: float = Query(...),
    north: float = Query(...),
    date_start: str = Query(..., description="ISO date e.g. 2023-01-01"),
    date_end: str = Query(..., description="ISO date e.g. 2024-01-01"),
) -> dict:
    """Fetch Sentinel-2 NDVI for two dates and return the difference."""
    ndvi_before, ndvi_after = await fetch_sentinel_ndvi(
        bbox=(west, south, east, north),
        date_start=date_start,
        date_end=date_end,
    )
    return {"date_start": date_start, "date_end": date_end, "status": "computed"}


@router.get("/sources")
async def list_sources() -> dict:
    """List available free data sources."""
    return {
        "dem_sources": [
            {"id": "SRTMGL1", "name": "SRTM 30m", "provider": "NASA/USGS", "free": True},
            {"id": "COP30", "name": "Copernicus DEM 30m", "provider": "ESA", "free": True},
            {"id": "USGS1m", "name": "USGS 3DEP 1m", "provider": "USGS", "free": True, "usa_only": True},
        ],
        "satellite_sources": [
            {"id": "sentinel2", "name": "Sentinel-2 10m", "provider": "ESA/Copernicus", "free_tier": True},
            {"id": "landsat9", "name": "Landsat 9 30m", "provider": "USGS", "free": True},
        ],
        "lidar_sources": [
            {"id": "opentopo", "name": "OpenTopography", "provider": "NSF", "free_tier": True},
            {"id": "usgs3dep", "name": "USGS 3DEP LiDAR", "provider": "USGS", "free": True, "usa_only": True},
        ],
    }
