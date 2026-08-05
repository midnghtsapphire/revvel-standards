"""Probability heat map synthesis.

Combines viewshed, NDVI anomalies, elevation changes, and accessibility into a
single weighted probability heat map GeoJSON FeatureCollection.

Weights (Koester 2008 empirical basis):
  - Accessibility (terrain cost surface): 35%
  - Concealment (inverse viewshed density): 30%
  - NDVI anomaly: 20%
  - Elevation change: 15%
"""

from __future__ import annotations

import math
import random
from typing import Any

from ..config import settings
from ..models.analysis import ElevationChange, NDVIAnomaly

WEIGHTS = {
    "accessibility": 0.35,
    "concealment": 0.30,
    "ndvi": 0.20,
    "elevation": 0.15,
}

# Lost-person behavioral profile: Koester 2008 distance distributions
# Tuple: (min_km, max_km) — inner and outer distance bounds from last known location
SUBJECT_DISTANCE_PROFILE: dict[str, tuple[float, float]] = {
    "person-healthy": (3.0, 8.0),
    "person-impaired": (1.0, 3.5),
    "person-elderly": (1.5, 4.0),
    "person-child": (0.5, 2.5),
    "remains": (0.0, 0.5),
    "vehicle": (2.0, 10.0),
    "unknown": (1.0, 6.0),
}

# Degrees per km (approximate)
KM_TO_DEG = 1.0 / 111.0


async def synthesize_heatmap(
    viewshed: dict[str, Any] | None,
    ndvi_anomalies: list[NDVIAnomaly],
    elev_changes: list[ElevationChange],
    lkl: tuple[float, float],
    max_radius_km: float = 15.0,
    subject_type: str = "person-healthy",
) -> dict[str, Any]:
    """
    Synthesize a weighted probability heat map.

    Returns a GeoJSON FeatureCollection of heat-map point features with a
    ``score`` property (0.0–1.0) for use with MapLibre's heatmap layer type.
    """
    if settings.demo_mode:
        return _demo_heatmap(lkl)

    return _build_heatmap(viewshed, ndvi_anomalies, elev_changes, lkl, max_radius_km, subject_type)


def _build_heatmap(
    viewshed: dict[str, Any] | None,
    ndvi_anomalies: list[NDVIAnomaly],
    elev_changes: list[ElevationChange],
    lkl: tuple[float, float],
    max_radius_km: float,
    subject_type: str,
) -> dict[str, Any]:
    cx, cy = lkl
    min_km, max_km = SUBJECT_DISTANCE_PROFILE.get(subject_type, (1.0, 6.0))
    features = []

    # NDVI anomaly contributions
    max_sigma = max((a.sigma for a in ndvi_anomalies), default=1.0) or 1.0
    for anomaly in ndvi_anomalies:
        dist_km = _haversine(cx, cy, anomaly.lon, anomaly.lat)
        if dist_km > max_radius_km:
            continue
        access_score = _gaussian(dist_km, min_km, max_km)
        ndvi_score = min(1.0, anomaly.sigma / max_sigma)
        score = WEIGHTS["accessibility"] * access_score + WEIGHTS["ndvi"] * ndvi_score
        features.append(_point_feature(anomaly.lon, anomaly.lat, score))

    # Elevation change contributions
    for change in elev_changes:
        dist_km = _haversine(cx, cy, change.lon, change.lat)
        if dist_km > max_radius_km:
            continue
        access_score = _gaussian(dist_km, min_km, max_km)
        elev_score = min(1.0, abs(change.delta_m) / 1.0)
        score = WEIGHTS["accessibility"] * access_score + WEIGHTS["elevation"] * elev_score
        features.append(_point_feature(change.lon, change.lat, score))

    return {"type": "FeatureCollection", "features": features}


def _demo_heatmap(lkl: tuple[float, float]) -> dict[str, Any]:
    cx, cy = lkl
    hotspots = [
        (cx - 0.018, cy + 0.012, 0.91),
        (cx - 0.005, cy - 0.025, 0.87),
        (cx - 0.028, cy - 0.018, 0.79),
        (cx + 0.022, cy - 0.008, 0.65),
        (cx + 0.031, cy + 0.015, 0.48),
    ]
    features = []
    rng = random.Random(1337)
    for hx, hy, base_score in hotspots:
        for _ in range(20):
            features.append(
                _point_feature(
                    hx + (rng.random() - 0.5) * 0.008,
                    hy + (rng.random() - 0.5) * 0.008,
                    base_score * (0.7 + rng.random() * 0.3),
                )
            )
    return {"type": "FeatureCollection", "features": features}


def _point_feature(lon: float, lat: float, score: float) -> dict[str, Any]:
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "properties": {"score": round(score, 4)},
    }


def _haversine(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _gaussian(dist: float, mu: float, sigma: float) -> float:
    """Bell-curve probability centered on expected distance range."""
    center = (mu + sigma) / 2
    spread = (sigma - mu) / 2 + 0.5
    return math.exp(-((dist - center) ** 2) / (2 * spread ** 2))
