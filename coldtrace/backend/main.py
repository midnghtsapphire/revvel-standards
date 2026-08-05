"""ColdTrace FastAPI backend — entry point."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import analysis, cases, data
from .config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ColdTrace API starting — demo mode: %s", settings.demo_mode)
    yield
    logger.info("ColdTrace API shutting down.")


app = FastAPI(
    title="ColdTrace API",
    version="0.1.0",
    description=(
        "Temporal GIS analysis API for cold case investigations. "
        "Viewshed, LiDAR change detection, NDVI temporal analysis, and probability heat maps."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
app.include_router(cases.router, prefix="/cases", tags=["Cases"])
app.include_router(data.router, prefix="/data", tags=["Data"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": "0.1.0"}
