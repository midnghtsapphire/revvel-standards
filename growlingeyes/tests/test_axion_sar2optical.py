"""
Tests for growlingeyes/axion_mcp/server.py — axion_sar2optical.

These tests exercise the CPU-based colorisation fallback path so they run
without ONNX model weights or GPU hardware.
"""

from __future__ import annotations

import base64
import io
import struct
import zlib

import numpy as np
import pytest
from PIL import Image


def _make_geotiff_bytes(
    width: int = 64,
    height: int = 64,
    bands: int = 2,
    dtype=np.float32,
) -> bytes:
    """
    Create a proper multi-band GeoTIFF in memory using rasterio.

    Band layout matches what axion_sar2optical expects:
      Band 1 → VV (or HH) backscatter
      Band 2 → VH (or HV) backscatter (only when bands=2)
    """
    import rasterio
    from rasterio.io import MemoryFile
    from rasterio.transform import from_bounds

    rng = np.random.default_rng(42)
    data = rng.uniform(0.001, 0.5, (bands, height, width)).astype(dtype)
    transform = from_bounds(0, 0, 1, 1, width, height)

    buf = io.BytesIO()
    with MemoryFile() as mem_file:
        with mem_file.open(
            driver="GTiff",
            height=height,
            width=width,
            count=bands,
            dtype=dtype,
            transform=transform,
        ) as dataset:
            dataset.write(data)
        buf.write(mem_file.read())
    return buf.getvalue()


class TestSARProcessingHelpers:
    def test_to_db_positive(self):
        from growlingeyes.axion_mcp.server import _to_db

        arr = np.array([[1.0, 10.0, 100.0]], dtype=np.float32)
        result = _to_db(arr)
        np.testing.assert_allclose(result[0, 0], 0.0, atol=1e-4)
        np.testing.assert_allclose(result[0, 1], 10.0, atol=1e-4)
        np.testing.assert_allclose(result[0, 2], 20.0, atol=1e-4)

    def test_to_db_near_zero(self):
        """Values ≤ 0 are clamped to ε — should not produce -inf or NaN."""
        from growlingeyes.axion_mcp.server import _to_db

        arr = np.array([[0.0, -1.0]], dtype=np.float32)
        result = _to_db(arr)
        assert np.all(np.isfinite(result)), "Expected finite output for zero/negative inputs"

    def test_normalise_band_range(self):
        from growlingeyes.axion_mcp.server import _normalise_band

        arr = np.linspace(-30.0, 0.0, 1000).reshape(20, 50).astype(np.float32)
        result = _normalise_band(arr)
        assert result.dtype == np.uint8
        assert result.min() >= 0
        assert result.max() <= 255

    def test_lee_filter_shape_preserved(self):
        from growlingeyes.axion_mcp.server import _lee_filter

        arr = np.random.default_rng(7).uniform(0.01, 1.0, (64, 64)).astype(np.float32)
        result = _lee_filter(arr)
        assert result.shape == arr.shape

    def test_lee_filter_reduces_variance(self):
        from growlingeyes.axion_mcp.server import _lee_filter

        rng = np.random.default_rng(99)
        arr = rng.uniform(0.01, 1.0, (128, 128)).astype(np.float32)
        filtered = _lee_filter(arr)
        assert np.std(filtered) < np.std(arr), "Lee filter should reduce variance"


class TestLoadSAR:
    def test_single_band_load(self):
        from growlingeyes.axion_mcp.server import _load_sar_from_bytes

        tiff_bytes = _make_geotiff_bytes(bands=1)
        vv, vh = _load_sar_from_bytes(tiff_bytes)
        assert vv.ndim == 2
        assert vh is None

    def test_dual_band_load(self):
        from growlingeyes.axion_mcp.server import _load_sar_from_bytes

        tiff_bytes = _make_geotiff_bytes(bands=2)
        vv, vh = _load_sar_from_bytes(tiff_bytes)
        assert vv.ndim == 2
        assert vh is not None and vh.ndim == 2


class TestSARToOpticalCPU:
    def test_output_shape_dual_pol(self):
        from growlingeyes.axion_mcp.server import _sar_to_optical_cpu

        rng = np.random.default_rng(1)
        vv = rng.uniform(0.001, 0.5, (64, 64)).astype(np.float32)
        vh = rng.uniform(0.0001, 0.1, (64, 64)).astype(np.float32)
        rgb = _sar_to_optical_cpu(vv, vh, apply_speckle_filter=True, histogram_equalise=False)
        assert rgb.shape == (64, 64, 3)
        assert rgb.dtype == np.uint8

    def test_output_shape_single_pol(self):
        from growlingeyes.axion_mcp.server import _sar_to_optical_cpu

        rng = np.random.default_rng(2)
        vv = rng.uniform(0.001, 0.5, (32, 32)).astype(np.float32)
        rgb = _sar_to_optical_cpu(vv, None, apply_speckle_filter=False, histogram_equalise=False)
        assert rgb.shape == (32, 32, 3)

    def test_histogram_equalise(self):
        from growlingeyes.axion_mcp.server import _sar_to_optical_cpu

        rng = np.random.default_rng(3)
        vv = rng.uniform(0.001, 0.5, (64, 64)).astype(np.float32)
        vh = rng.uniform(0.0001, 0.1, (64, 64)).astype(np.float32)
        rgb = _sar_to_optical_cpu(vv, vh, apply_speckle_filter=False, histogram_equalise=True)
        assert rgb.shape == (64, 64, 3)


class TestAxionSAR2OpticalTool:
    def _make_b64_tiff(self, bands: int = 2) -> str:
        tiff_bytes = _make_geotiff_bytes(bands=bands)
        return base64.b64encode(tiff_bytes).decode("ascii")

    def test_returns_image(self):
        from growlingeyes.axion_mcp.server import axion_sar2optical

        result = axion_sar2optical(sar_b64=self._make_b64_tiff(2))
        assert "image_b64" in result
        assert result["format"] == "png"
        assert result["width"] > 0
        assert result["height"] > 0
        assert result["method"] in ("axion_sar2optical_v1_onnx", "cpu_colorisation_fallback")
        assert result["bands"] == "dual_pol"

    def test_single_pol(self):
        from growlingeyes.axion_mcp.server import axion_sar2optical

        result = axion_sar2optical(sar_b64=self._make_b64_tiff(1))
        assert "image_b64" in result
        assert result["bands"] == "single_pol"

    def test_invalid_b64_returns_error(self):
        from growlingeyes.axion_mcp.server import axion_sar2optical

        result = axion_sar2optical(sar_b64="NOT_VALID_BASE64!!!")
        assert "error" in result

    def test_output_is_decodable_png(self):
        from growlingeyes.axion_mcp.server import axion_sar2optical

        result = axion_sar2optical(sar_b64=self._make_b64_tiff(2))
        png_bytes = base64.b64decode(result["image_b64"])
        img = Image.open(io.BytesIO(png_bytes))
        assert img.mode == "RGB"

    def test_jpeg_output_format(self):
        from growlingeyes.axion_mcp.server import axion_sar2optical

        result = axion_sar2optical(sar_b64=self._make_b64_tiff(2), output_format="jpeg")
        assert result["format"] == "jpeg"
        jpeg_bytes = base64.b64decode(result["image_b64"])
        img = Image.open(io.BytesIO(jpeg_bytes))
        assert img.format == "JPEG"


class TestAxionDescribeSAR:
    def test_stats_structure(self):
        from growlingeyes.axion_mcp.server import axion_describe_sar

        tiff_bytes = _make_geotiff_bytes(bands=2)
        b64 = base64.b64encode(tiff_bytes).decode("ascii")
        result = axion_describe_sar(b64)
        assert "vv_stats" in result
        assert "vh_stats" in result
        assert "recommendations" in result
        assert "speckle_filter" in result["recommendations"]
        assert "histogram_equalise" in result["recommendations"]

    def test_single_pol_no_vh_stats(self):
        from growlingeyes.axion_mcp.server import axion_describe_sar

        tiff_bytes = _make_geotiff_bytes(bands=1)
        b64 = base64.b64encode(tiff_bytes).decode("ascii")
        result = axion_describe_sar(b64)
        assert "vh_stats" not in result


class TestAxionStatus:
    def test_status_fields(self):
        from growlingeyes.axion_mcp.server import axion_status

        result = axion_status()
        assert result["status"] == "operational"
        assert "axion_sar2optical_model" in result
        assert result["axion_sar2optical_model"] in ("loaded", "cpu_fallback_active")


class TestAxionBatchConvert:
    def test_batch_returns_correct_count(self):
        from growlingeyes.axion_mcp.server import axion_batch_convert

        tiff_bytes = _make_geotiff_bytes(bands=2)
        b64 = base64.b64encode(tiff_bytes).decode("ascii")
        items = [{"sar_b64": b64, "id": f"scene_{i}"} for i in range(3)]
        results = axion_batch_convert(items)
        assert len(results) == 3
        assert results[0]["id"] == "scene_0"
        assert all("image_b64" in r for r in results)
