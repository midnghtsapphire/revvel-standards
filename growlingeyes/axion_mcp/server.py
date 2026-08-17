"""
Axion Planetary MCP Server
--------------------------
Repository: growlingeyes/axion_mcp/server.py
Product:    GrowlingEyes — Freedom Angel Corp

Primary function — axion_sar2optical
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Converts Synthetic Aperture Radar (SAR) radar imagery into optical-like images
to enable cloud-free Earth observation.

SAR sensors (e.g., Sentinel-1, ALOS PALSAR) penetrate cloud cover, smoke, and
darkness, producing backscatter intensity arrays that are difficult for humans
and LLMs to interpret directly.  axion_sar2optical translates those backscatter
arrays into visually interpretable, pseudo-optical images by:

  1. Reading the single-band or dual-polarisation SAR GeoTIFF (VV, VH, HH, HV)
  2. Applying Lee/Enhanced Lee speckle filtering to reduce SAR noise
  3. Log-transforming and normalising backscatter values (dB scale)
  4. Mapping SAR bands to RGB channels using physics-informed colorisation:
       R ← VV (or HH) — sensitive to rough/built surfaces
       G ← VH (or HV) — sensitive to volume scattering (vegetation)
       B ← VV/VH ratio — sensitive to surface moisture / flooding
  5. Applying optional histogram equalisation for visual enhancement
  6. Returning the result as a base64-encoded PNG (or GeoTIFF)

In production the colorisation step is replaced by the `axion_sar2optical`
proprietary foundation model weights (SAR domain → optical domain translation
via a pix2pix / conditional GAN or U-Net architecture).  This server exposes
that model as an MCP tool.

FastMCP docs: https://gofastmcp.com
"""

from __future__ import annotations

import base64
import io
import logging
import os
from pathlib import Path
from typing import Optional

import numpy as np
from fastmcp import FastMCP
from PIL import Image, ImageOps

log = logging.getLogger("axion_mcp")

# ─── Server Initialisation ────────────────────────────────────────────────────

mcp = FastMCP(
    name="Axion Planetary MCP",
    instructions=(
        "You are connected to the Axion Planetary MCP server — the geospatial "
        "intelligence core of GrowlingEyes. "
        "Use axion_sar2optical to convert SAR radar imagery into cloud-free "
        "optical-like images.  Other tools expose satellite metadata and Earth "
        "observation utilities. "
        "Always prefer these tools over guessing or hallucinating values."
    ),
)

# ─── Configuration ────────────────────────────────────────────────────────────

MODEL_WEIGHTS_PATH = os.environ.get(
    "AXION_SAR2OPTICAL_WEIGHTS",
    str(Path(__file__).parent / "weights" / "axion_sar2optical_v1.onnx"),
)
DEFAULT_OUTPUT_FORMAT = os.environ.get("AXION_OUTPUT_FORMAT", "png")


# ─── SAR processing helpers ───────────────────────────────────────────────────

def _lee_filter(band: np.ndarray, window: int = 3) -> np.ndarray:
    """
    Apply a basic Lee speckle filter to a 2-D float32 SAR band.

    The Lee filter suppresses multiplicative noise while preserving edges by
    computing a local mean/variance estimate within a sliding window and
    weighting between the noisy pixel and the local mean.

    Args:
        band:   2-D float32 array (linear power or amplitude).
        window: Filter window size (odd integer, default 3).

    Returns:
        Speckle-filtered 2-D float32 array.
    """
    from scipy.ndimage import uniform_filter, variance  # type: ignore

    mean = uniform_filter(band.astype(np.float32), size=window)
    sq_mean = uniform_filter(band.astype(np.float32) ** 2, size=window)
    var_local = sq_mean - mean ** 2
    var_noise = np.mean(var_local)
    weight = var_local / (var_local + var_noise + 1e-10)
    return mean + weight * (band - mean)


def _to_db(linear: np.ndarray) -> np.ndarray:
    """Convert linear backscatter to dB scale: dB = 10 * log10(linear + ε)."""
    return 10.0 * np.log10(np.clip(linear, 1e-10, None))


def _normalise_band(arr: np.ndarray, lo: float = 2.0, hi: float = 98.0) -> np.ndarray:
    """
    Percentile-normalise a band to [0, 255] uint8.

    Args:
        arr: 2-D float array.
        lo:  Lower percentile clip (default 2).
        hi:  Upper percentile clip (default 98).

    Returns:
        uint8 2-D array in [0, 255].
    """
    p_lo = np.percentile(arr, lo)
    p_hi = np.percentile(arr, hi)
    clipped = np.clip(arr, p_lo, p_hi)
    if p_hi == p_lo:
        return np.zeros_like(clipped, dtype=np.uint8)
    scaled = (clipped - p_lo) / (p_hi - p_lo) * 255.0
    return scaled.astype(np.uint8)


def _sar_to_optical_cpu(
    vv: np.ndarray,
    vh: Optional[np.ndarray],
    apply_speckle_filter: bool,
    histogram_equalise: bool,
) -> np.ndarray:
    """
    Physics-informed SAR-to-optical colorisation (CPU fallback).

    When the ONNX model weights are not available this function provides a
    deterministic, physics-grounded approximation suitable for human
    visual inspection:

      R ← VV dB — sensitive to rough/built-up surfaces and open water
      G ← VH dB (or ½·VV) — sensitive to vegetation volume scattering
      B ← VV/VH ratio dB — sensitive to surface moisture and flooding

    Args:
        vv:                     2-D float32 VV (or HH) backscatter array.
        vh:                     Optional 2-D float32 VH (or HV) array.
        apply_speckle_filter:   Whether to apply Lee speckle filtering first.
        histogram_equalise:     Whether to apply CLAHE histogram equalisation.

    Returns:
        H×W×3 uint8 RGB array representing the optical-like image.
    """
    if apply_speckle_filter:
        vv = _lee_filter(vv)
        if vh is not None:
            vh = _lee_filter(vh)

    vv_db = _to_db(vv)

    if vh is not None:
        vh_db = _to_db(vh)
        ratio_db = vv_db - vh_db
        r = _normalise_band(vv_db)
        g = _normalise_band(vh_db)
        b = _normalise_band(ratio_db)
    else:
        # Single-polarisation fallback: derive pseudo-channels from VV alone
        rng = np.random.default_rng(0)
        r = _normalise_band(vv_db)
        g = _normalise_band(vv_db * 0.85 + rng.normal(0, 0.5, vv_db.shape))
        b = _normalise_band(np.gradient(vv_db)[0])

    rgb = np.stack([r, g, b], axis=-1)

    if histogram_equalise:
        img_pil = Image.fromarray(rgb)
        img_pil = ImageOps.equalize(img_pil)
        rgb = np.array(img_pil)

    return rgb


def _load_sar_from_bytes(sar_bytes: bytes) -> tuple[np.ndarray, Optional[np.ndarray]]:
    """
    Load SAR GeoTIFF bytes into VV and optional VH numpy arrays.

    Expects a GeoTIFF with one or two bands:
      - Band 1 → VV (or HH)
      - Band 2 → VH (or HV) [optional]

    Falls back to loading with PIL (no CRS info) if rasterio is unavailable.

    Args:
        sar_bytes: Raw GeoTIFF bytes.

    Returns:
        (vv_array, vh_array_or_None)
    """
    try:
        import rasterio  # type: ignore
        from rasterio.io import MemoryFile  # type: ignore

        with MemoryFile(sar_bytes) as mem_file:
            with mem_file.open() as dataset:
                vv = dataset.read(1).astype(np.float32)
                vh = dataset.read(2).astype(np.float32) if dataset.count >= 2 else None
        return vv, vh

    except ImportError:
        log.warning(
            "rasterio not available — loading SAR with PIL (no CRS metadata)"
        )
        img = Image.open(io.BytesIO(sar_bytes))
        arr = np.array(img, dtype=np.float32)
        if arr.ndim == 2:
            return arr, None
        return arr[:, :, 0], arr[:, :, 1] if arr.shape[2] >= 2 else None


def _run_model_inference(
    vv: np.ndarray,
    vh: Optional[np.ndarray],
) -> Optional[np.ndarray]:
    """
    Run the axion_sar2optical ONNX foundation model (when weights are present).

    Prepares the input tensor in the format expected by the model:
      - Shape: [1, 2, H, W] (dual-pol) or [1, 1, H, W] (single-pol)
      - Values: log-normalised float32 in [-1, 1]

    Args:
        vv: 2-D float32 VV backscatter.
        vh: Optional 2-D float32 VH backscatter.

    Returns:
        H×W×3 uint8 RGB array from model output, or None if model unavailable.
    """
    if not Path(MODEL_WEIGHTS_PATH).exists():
        return None

    try:
        import onnxruntime as ort  # type: ignore

        session = ort.InferenceSession(
            MODEL_WEIGHTS_PATH,
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
        )
        vv_norm = (np.clip(_to_db(vv), -25.0, 0.0) / 12.5 + 1.0).astype(np.float32)
        if vh is not None:
            vh_norm = (np.clip(_to_db(vh), -30.0, -5.0) / 12.5 + 1.0).astype(np.float32)
            inp = np.stack([vv_norm, vh_norm], axis=0)[np.newaxis]
        else:
            inp = vv_norm[np.newaxis, np.newaxis]

        input_name = session.get_inputs()[0].name
        output = session.run(None, {input_name: inp})[0]

        # Model output: [1, 3, H, W] float32 in [-1, 1] → uint8
        rgb = ((output[0].transpose(1, 2, 0) + 1.0) * 127.5).clip(0, 255).astype(np.uint8)
        return rgb

    except Exception as exc:
        log.error("Model inference failed — falling back to CPU colorisation: %s", exc)
        return None


def sar_to_optical(
    sar_bytes: bytes,
    apply_speckle_filter: bool = True,
    histogram_equalise: bool = False,
    output_format: str = "png",
) -> bytes:
    """
    Core SAR-to-optical conversion pipeline.

    Tries the axion_sar2optical ONNX model first; falls back to physics-based
    CPU colorisation if model weights are unavailable.

    Args:
        sar_bytes:            Raw GeoTIFF SAR image bytes.
        apply_speckle_filter: Apply Lee speckle filter before processing.
        histogram_equalise:   Enhance contrast with histogram equalisation.
        output_format:        "png" (default) or "jpeg".

    Returns:
        Encoded image bytes in the requested format.
    """
    vv, vh = _load_sar_from_bytes(sar_bytes)

    rgb = _run_model_inference(vv, vh)
    if rgb is None:
        rgb = _sar_to_optical_cpu(vv, vh, apply_speckle_filter, histogram_equalise)

    img = Image.fromarray(rgb, mode="RGB")
    buf = io.BytesIO()
    fmt = output_format.upper().replace("JPG", "JPEG")
    img.save(buf, format=fmt)
    return buf.getvalue()


# ─── MCP Tools ────────────────────────────────────────────────────────────────

@mcp.tool
def axion_sar2optical(
    sar_b64: str,
    apply_speckle_filter: bool = True,
    histogram_equalise: bool = False,
    output_format: str = "png",
) -> dict:
    """
    Convert SAR radar imagery into an optical-like image (cloud-free Earth observation).

    This is the primary function of the Axion Planetary MCP.  SAR sensors
    (Sentinel-1, ALOS PALSAR, RADARSAT) penetrate clouds, smoke, and night
    conditions.  axion_sar2optical translates the raw backscatter data into a
    visually interpretable pseudo-optical image that humans and LLMs can
    analyse — enabling cloud-free situational awareness anywhere on Earth.

    Processing pipeline:
      1. Decode base64 GeoTIFF → float32 SAR array (VV + optional VH)
      2. Lee speckle filtering (optional, reduces SAR noise)
      3. Log transform + percentile normalisation (dB scale)
      4. Colorisation via axion_sar2optical ONNX model (or CPU fallback)
      5. Optional histogram equalisation
      6. Encode result as base64 PNG/JPEG

    Args:
        sar_b64:              Base64-encoded GeoTIFF SAR image (VV or VV+VH bands).
        apply_speckle_filter: Apply Lee speckle filter to reduce SAR noise (default True).
        histogram_equalise:   Apply histogram equalisation for visual contrast (default False).
        output_format:        Output image format — "png" (lossless) or "jpeg" (compressed).

    Returns:
        {
            "image_b64": "<base64-encoded PNG/JPEG>",
            "format":    "png",
            "width":     512,
            "height":    512,
            "method":    "axion_sar2optical_v1_onnx" | "cpu_colorisation_fallback",
            "bands":     "dual_pol" | "single_pol"
        }
    """
    try:
        sar_bytes = base64.b64decode(sar_b64)
    except Exception as exc:
        return {"error": f"Invalid base64 input: {exc}"}

    try:
        vv, vh = _load_sar_from_bytes(sar_bytes)
    except Exception as exc:
        return {"error": f"Could not decode SAR GeoTIFF: {exc}"}

    model_rgb = _run_model_inference(vv, vh)
    method = (
        "axion_sar2optical_v1_onnx"
        if model_rgb is not None
        else "cpu_colorisation_fallback"
    )

    rgb = model_rgb if model_rgb is not None else _sar_to_optical_cpu(
        vv, vh, apply_speckle_filter, histogram_equalise
    )

    img = Image.fromarray(rgb, mode="RGB")
    buf = io.BytesIO()
    fmt = output_format.upper().replace("JPG", "JPEG")
    img.save(buf, format=fmt)
    image_b64 = base64.b64encode(buf.getvalue()).decode("ascii")

    return {
        "image_b64": image_b64,
        "format": output_format.lower(),
        "width": rgb.shape[1],
        "height": rgb.shape[0],
        "method": method,
        "bands": "dual_pol" if vh is not None else "single_pol",
    }


@mcp.tool
def axion_status() -> dict:
    """
    Return the operational status of the Axion Planetary MCP server.

    Reports whether the axion_sar2optical ONNX model weights are loaded or
    whether the CPU colorisation fallback is active.
    """
    model_loaded = Path(MODEL_WEIGHTS_PATH).exists()
    return {
        "status": "operational",
        "service": "Axion Planetary MCP",
        "version": "1.0.0",
        "axion_sar2optical_model": "loaded" if model_loaded else "cpu_fallback_active",
        "model_path": MODEL_WEIGHTS_PATH,
        "output_format": DEFAULT_OUTPUT_FORMAT,
    }


@mcp.tool
def axion_describe_sar(sar_b64: str) -> dict:
    """
    Analyse a SAR GeoTIFF and return metadata without converting to optical.

    Useful for understanding the input before running axion_sar2optical.
    Returns band statistics, dynamic range, and a recommendation on whether
    speckle filtering is needed.

    Args:
        sar_b64: Base64-encoded GeoTIFF SAR image.

    Returns:
        Dictionary of band statistics and processing recommendations.
    """
    try:
        sar_bytes = base64.b64decode(sar_b64)
        vv, vh = _load_sar_from_bytes(sar_bytes)
    except Exception as exc:
        return {"error": str(exc)}

    vv_db = _to_db(vv)
    stats: dict = {
        "width": vv.shape[1],
        "height": vv.shape[0],
        "polarisations": ["VV", "VH"] if vh is not None else ["VV"],
        "vv_stats": {
            "min_db": float(np.nanmin(vv_db)),
            "max_db": float(np.nanmax(vv_db)),
            "mean_db": float(np.nanmean(vv_db)),
            "std_db": float(np.nanstd(vv_db)),
            "p2_db": float(np.nanpercentile(vv_db, 2)),
            "p98_db": float(np.nanpercentile(vv_db, 98)),
        },
        "recommendations": {
            "speckle_filter": bool(np.nanstd(vv_db) > 4.0),
            "histogram_equalise": bool(
                np.nanpercentile(vv_db, 98) - np.nanpercentile(vv_db, 2) > 15
            ),
        },
    }

    if vh is not None:
        vh_db = _to_db(vh)
        stats["vh_stats"] = {
            "min_db": float(np.nanmin(vh_db)),
            "max_db": float(np.nanmax(vh_db)),
            "mean_db": float(np.nanmean(vh_db)),
            "std_db": float(np.nanstd(vh_db)),
        }

    return stats


@mcp.tool
def axion_batch_convert(
    sar_items: list[dict],
    apply_speckle_filter: bool = True,
    output_format: str = "png",
) -> list[dict]:
    """
    Convert multiple SAR images to optical in a single call.

    Each item in `sar_items` must have a "sar_b64" key and an optional "id" key.
    Results are returned in the same order as the input.

    Args:
        sar_items:            List of dicts with "sar_b64" (required) and "id" (optional).
        apply_speckle_filter: Apply Lee speckle filter (default True).
        output_format:        "png" or "jpeg".

    Returns:
        List of axion_sar2optical results, each including the original "id" if provided.
    """
    results = []
    for item in sar_items:
        sar_b64 = item.get("sar_b64", "")
        item_id = item.get("id", "")
        result = axion_sar2optical(
            sar_b64=sar_b64,
            apply_speckle_filter=apply_speckle_filter,
            output_format=output_format,
        )
        result["id"] = item_id
        results.append(result)
    return results


# ─── Resources ────────────────────────────────────────────────────────────────

@mcp.resource("data://axion-planetary/config")
def get_config() -> dict:
    """Return the public configuration of the Axion Planetary MCP instance."""
    return {
        "service": "Axion Planetary MCP",
        "product": "GrowlingEyes — Freedom Angel Corp",
        "model": "axion_sar2optical v1.0",
        "description": "Converts SAR radar imagery into optical-like images for cloud-free Earth observation",
        "input_formats": ["GeoTIFF (single or dual polarisation)"],
        "output_formats": ["png", "jpeg"],
        "polarisations_supported": ["VV", "VH", "HH", "HV", "VV+VH", "HH+HV"],
        "model_loaded": Path(MODEL_WEIGHTS_PATH).exists(),
    }


@mcp.resource("data://axion-planetary/sar-sources")
def get_sar_sources() -> list[dict]:
    """
    Return the authoritative list of SAR data sources compatible with axion_sar2optical.

    These are the satellite data sources GrowlingEyes ingests for cloud-free
    Earth observation intelligence.
    """
    return [
        {
            "name": "Sentinel-1 (ESA Copernicus)",
            "polarisations": ["VV", "VH"],
            "resolution_m": 10,
            "revisit_days": 6,
            "free": True,
            "url": "https://scihub.copernicus.eu",
            "env_key": None,
        },
        {
            "name": "ALOS PALSAR-2 (JAXA)",
            "polarisations": ["HH", "HV"],
            "resolution_m": 10,
            "revisit_days": 14,
            "free": True,
            "url": "https://www.eorc.jaxa.jp/ALOS/en/index_e.htm",
            "env_key": None,
        },
        {
            "name": "RADARSAT Constellation (MDA/CSA)",
            "polarisations": ["HH", "VV", "HH+HV", "VV+VH"],
            "resolution_m": 5,
            "revisit_days": 4,
            "free": False,
            "url": "https://www.asc-csa.gc.ca/eng/satellites/radarsat/",
            "env_key": "RADARSAT_API_KEY",
        },
        {
            "name": "Capella Space (commercial)",
            "polarisations": ["HH"],
            "resolution_m": 0.5,
            "revisit_days": 1,
            "free": False,
            "url": "https://www.capellaspace.com",
            "env_key": "CAPELLA_API_KEY",
        },
        {
            "name": "ICEYE (commercial)",
            "polarisations": ["VV"],
            "resolution_m": 1,
            "revisit_days": 1,
            "free": False,
            "url": "https://www.iceye.com",
            "env_key": "ICEYE_API_KEY",
        },
    ]


# ─── Prompts ──────────────────────────────────────────────────────────────────

@mcp.prompt
def analyse_sar_scene(scene_context: str) -> str:
    """
    Generate a prompt for analysing a converted SAR optical-like image.

    Args:
        scene_context: Location, date, event context (e.g. "Kyiv, Ukraine — March 2025").
    """
    return (
        f"Analyse the SAR-derived optical-like image for: {scene_context}\n\n"
        "Use axion_sar2optical to convert the raw SAR GeoTIFF first, then:\n"
        "1. Describe the visible terrain features (urban areas, vegetation, water, flooding).\n"
        "2. Identify any anomalies (new craters, destroyed buildings, vessel positions).\n"
        "3. Compare to known baselines if available.\n"
        "4. Rate the intelligence value on a scale of 1-10 with justification.\n"
        "Always cite the SAR source (Sentinel-1/ALOS/etc.) and polarisation mode."
    )


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    mcp.run()
