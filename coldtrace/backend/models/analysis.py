"""Pydantic models for analysis jobs and parameters."""

from __future__ import annotations

from datetime import date
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class SubjectType(str, Enum):
    PERSON_HEALTHY = "person-healthy"
    PERSON_IMPAIRED = "person-impaired"
    PERSON_ELDERLY = "person-elderly"
    PERSON_CHILD = "person-child"
    REMAINS = "remains"
    VEHICLE = "vehicle"
    UNKNOWN = "unknown"


class JobStatus(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETE = "COMPLETE"
    FAILED = "FAILED"


class AnalysisParams(BaseModel):
    case_id: str | None = None
    lkl_lat: float = Field(..., ge=-90, le=90, description="Last known location latitude")
    lkl_lon: float = Field(..., ge=-180, le=180, description="Last known location longitude")
    aoi_north: float = Field(..., ge=-90, le=90)
    aoi_south: float = Field(..., ge=-90, le=90)
    aoi_west: float = Field(..., ge=-180, le=180)
    aoi_east: float = Field(..., ge=-180, le=180)
    date_start: date = Field(..., description="Date of last confirmed sighting / event")
    date_end: date = Field(..., description="Analysis end date")
    observer_height_m: float = Field(1.65, ge=0.1, le=10.0, description="Observer/subject height in meters")
    max_radius_km: float = Field(15.0, ge=1.0, le=100.0, description="Maximum travel radius in km")
    subject_type: SubjectType = SubjectType.PERSON_HEALTHY
    run_viewshed: bool = True
    run_ndvi: bool = True
    run_elevation_change: bool = True
    run_accessibility: bool = True
    run_heatmap: bool = True


class NDVIAnomaly(BaseModel):
    lon: float
    lat: float
    sigma: float
    ndvi_before: float
    ndvi_after: float
    ndvi_delta: float


class ElevationChange(BaseModel):
    lon: float
    lat: float
    delta_m: float


class AnalysisResult(BaseModel):
    viewshed_geojson: dict[str, Any] | None = None
    ndvi_anomalies: list[NDVIAnomaly] = []
    elevation_changes: list[ElevationChange] = []
    heatmap: dict[str, Any] | None = None
    priority_zones: list[dict[str, Any]] = []


class AnalysisJob(BaseModel):
    id: str
    status: JobStatus = JobStatus.QUEUED
    progress: int = 0
    step: str = ""
    error: str | None = None
    params: AnalysisParams
    result: AnalysisResult | None = None
