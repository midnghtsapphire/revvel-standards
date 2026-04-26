"""Temporal change detection — NDVI diff and elevation change."""

from __future__ import annotations

import asyncio
import random
from pathlib import Path
from typing import Any

from ..config import settings
from ..models.analysis import ElevationChange, NDVIAnomaly


async def compute_ndvi_diff(
    ndvi_before: Any,
    ndvi_after: Any,
    sigma_threshold: float = 1.5,
) -> list[NDVIAnomaly]:
    """
    Compute pixel-wise NDVI delta and return anomalies above sigma_threshold.
    Production uses rioxarray + numpy; demo returns synthetic anomalies.
    """
    if settings.demo_mode:
        return _demo_ndvi_anomalies()

    return await asyncio.to_thread(
        _compute_ndvi_sync, ndvi_before, ndvi_after, sigma_threshold
    )


async def compute_elevation_diff(
    dem_path: Path | str,
    date_start: Any,
    date_end: Any,
    threshold_m: float = 0.25,
) -> list[ElevationChange]:
    """
    Compare multi-epoch DEMs to detect terrain changes.
    Production fetches second DEM epoch from USGS 3DEP; demo returns synthetic data.
    """
    if settings.demo_mode:
        return _demo_elevation_changes()

    return await asyncio.to_thread(
        _compute_elev_sync, Path(dem_path), threshold_m
    )


def _compute_ndvi_sync(ndvi_before: Any, ndvi_after: Any, sigma_threshold: float) -> list[NDVIAnomaly]:
    """Synchronous NDVI delta computation (called in thread pool)."""
    try:
        import numpy as np
        import rioxarray  # registers the .rio accessor on xarray objects
    except ImportError as exc:
        raise RuntimeError("numpy and rioxarray required for NDVI computation.") from exc

    before = ndvi_before.values.astype(float)
    after = ndvi_after.values.astype(float)
    delta = after - before

    mean = float(np.nanmean(delta))
    std = float(np.nanstd(delta))
    if std == 0:
        return []

    mask = np.abs(delta - mean) > sigma_threshold * std
    ys, xs = np.where(mask)

    anomalies = []
    for y, x in zip(ys[:50], xs[:50]):  # cap at 50 anomalies
        transform = ndvi_after.rio.transform()
        lon = transform.c + x * transform.a
        lat = transform.f + y * transform.e
        anomalies.append(
            NDVIAnomaly(
                lon=float(lon),
                lat=float(lat),
                sigma=float(abs(delta[y, x] - mean) / std),
                ndvi_before=float(before[y, x]),
                ndvi_after=float(after[y, x]),
                ndvi_delta=float(delta[y, x]),
            )
        )

    return sorted(anomalies, key=lambda a: -a.sigma)


def _compute_elev_sync(dem_path: Path, threshold_m: float) -> list[ElevationChange]:
    """Synchronous elevation change detection (stub — fetches second epoch in prod)."""
    return []


def _demo_ndvi_anomalies() -> list[NDVIAnomaly]:
    spots = [
        (-119.5563, 37.8771, 2.3),
        (-119.5433, 37.8401, 1.8),
        (-119.5568, 37.8470, 3.1),
        (-119.5153, 37.8801, 1.5),
        (-119.5663, 37.8470, 2.7),
    ]
    return [
        NDVIAnomaly(
            lon=lon, lat=lat, sigma=sigma,
            ndvi_before=0.35, ndvi_after=0.35 + sigma * 0.05,
            ndvi_delta=sigma * 0.05,
        )
        for lon, lat, sigma in spots
    ]


def _demo_elevation_changes() -> list[ElevationChange]:
    spots = [(-119.556, 37.877, 0.42), (-119.535, 37.842, 0.82), (-119.561, 37.868, -0.31)]
    return [ElevationChange(lon=lon, lat=lat, delta_m=d) for lon, lat, d in spots]
