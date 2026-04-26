"""Analysis router — POST /analysis/run and GET /analysis/{job_id}."""

from __future__ import annotations

import asyncio
import uuid
from typing import Annotated

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from ..models.analysis import (
    AnalysisJob,
    AnalysisParams,
    AnalysisResult,
    JobStatus,
)
from ..services.viewshed import compute_viewshed
from ..services.temporal import compute_ndvi_diff, compute_elevation_diff
from ..services.heatmap import synthesize_heatmap
from ..services.opentopo import fetch_dem
from ..services.sentinel import fetch_sentinel_ndvi

router = APIRouter()

# In-memory job store (replace with Redis/PostgreSQL in production)
_jobs: dict[str, AnalysisJob] = {}


@router.post("/run", response_model=AnalysisJob, status_code=202)
async def run_analysis(
    params: AnalysisParams,
    background_tasks: BackgroundTasks,
) -> AnalysisJob:
    """
    Submit an analysis job. Returns a job ID immediately.
    Poll GET /analysis/{job_id} to check progress and retrieve results.
    """
    job_id = str(uuid.uuid4())
    job = AnalysisJob(id=job_id, status=JobStatus.QUEUED, params=params)
    _jobs[job_id] = job
    background_tasks.add_task(_run_pipeline, job_id, params)
    return job


@router.get("/{job_id}", response_model=AnalysisJob)
async def get_job(job_id: str) -> AnalysisJob:
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


async def _run_pipeline(job_id: str, params: AnalysisParams) -> None:
    job = _jobs[job_id]
    try:
        job.status = JobStatus.RUNNING
        job.progress = 5
        job.step = "Fetching DEM from OpenTopography"

        dem_path = await fetch_dem(
            bbox=(params.aoi_west, params.aoi_south, params.aoi_east, params.aoi_north),
            dataset="SRTMGL1",
        )
        job.progress = 25
        job.step = "Computing viewshed"

        viewshed_geojson = await compute_viewshed(
            dem_path=dem_path,
            observer_lon=params.lkl_lon,
            observer_lat=params.lkl_lat,
            observer_height=params.observer_height_m,
        )
        job.progress = 50
        job.step = "Fetching Sentinel-2 NDVI"

        ndvi_before, ndvi_after = await fetch_sentinel_ndvi(
            bbox=(params.aoi_west, params.aoi_south, params.aoi_east, params.aoi_north),
            date_start=params.date_start,
            date_end=params.date_end,
        )
        job.progress = 68
        job.step = "Computing NDVI temporal delta"

        ndvi_anomalies = await compute_ndvi_diff(ndvi_before, ndvi_after, sigma_threshold=1.5)
        job.progress = 78
        job.step = "Detecting elevation changes"

        elev_changes = await compute_elevation_diff(dem_path, params.date_start, params.date_end)
        job.progress = 88
        job.step = "Synthesizing probability heat map"

        heatmap = await synthesize_heatmap(
            viewshed=viewshed_geojson,
            ndvi_anomalies=ndvi_anomalies,
            elev_changes=elev_changes,
            lkl=(params.lkl_lon, params.lkl_lat),
            max_radius_km=params.max_radius_km,
            subject_type=params.subject_type,
        )

        job.progress = 100
        job.step = "Complete"
        job.status = JobStatus.COMPLETE
        job.result = AnalysisResult(
            viewshed_geojson=viewshed_geojson,
            ndvi_anomalies=ndvi_anomalies,
            elevation_changes=elev_changes,
            heatmap=heatmap,
        )

    except (RuntimeError, ValueError, OSError, httpx.HTTPError) as exc:
        job.status = JobStatus.FAILED
        job.error = str(exc)
