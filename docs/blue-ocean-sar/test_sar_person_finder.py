"""Tests for the Blue Ocean SAR person finders.

Run: python3 -m unittest discover -s docs/blue-ocean-sar -p "test_*.py"
v1 needs numpy; v3 also needs scipy and rasterio (skipped when absent).
"""

import importlib.util
import os
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

HAS_NP = importlib.util.find_spec("numpy") is not None
HAS_V3 = HAS_NP and all(importlib.util.find_spec(m) is not None for m in ("scipy", "rasterio"))

if HAS_NP:
    import numpy as np

    import sar_person_finder as v1


def _scene():
    lat_vec = np.linspace(49.36, 49.41, 50)
    lon_vec = np.linspace(-122.97, -122.92, 50)
    glon, glat = np.meshgrid(lon_vec, lat_vec)
    rng = np.random.default_rng(42)
    inten = rng.gamma(2.0, 1.0, (50, 50))
    inten[22, 28] += 85.0
    inten[30, 20] += 60.0
    return inten, glat, glon


@unittest.skipUnless(HAS_NP, "numpy not installed")
class FinderV1(unittest.TestCase):
    def test_vectorised_lee_matches_original_loop(self):
        img = 10 * np.log10(np.random.default_rng(1).gamma(2.0, 1.0, (23, 31)))
        size = 5
        padded = np.pad(img, size // 2, mode="reflect")
        mean = np.zeros_like(img)
        var = np.zeros_like(img)
        for i in range(img.shape[0]):
            for j in range(img.shape[1]):
                patch = padded[i:i + size, j:j + size]
                mean[i, j] = patch.mean()
                var[i, j] = patch.var()
        expected = mean + var / (var + img.var() + 1e-6) * (img - mean)
        got = v1.SatelliteSARAnomalyDetector(size).lee_despeckle_filter(img)
        np.testing.assert_allclose(got, expected, rtol=1e-10, atol=1e-10)

    def test_targets_found_and_not_duplicated(self):
        inten, glat, glon = _scene()
        res = v1.BlueOceanSARPersonFinder(49.385, -122.945).process_sar_scene(inten, glat, glon, 6.0, top_n=5)
        cells = [tuple(np.argwhere((glat == r["latitude"]) & (glon == r["longitude"]))[0]) for r in res]
        self.assertEqual(cells[0], (22, 28))
        self.assertEqual(cells[1], (30, 20))
        for i, a in enumerate(cells):
            for b in cells[i + 1:]:
                self.assertGreater(max(abs(a[0] - b[0]), abs(a[1] - b[1])), 2, "neighbouring pixels reported twice")

    def test_separation_zero_restores_original_behaviour(self):
        inten, glat, glon = _scene()
        res = v1.BlueOceanSARPersonFinder(49.385, -122.945).process_sar_scene(
            inten, glat, glon, 6.0, top_n=10, min_separation_px=-1)
        cells = [tuple(np.argwhere((glat == r["latitude"]) & (glon == r["longitude"]))[0]) for r in res]
        near = [(a, b) for i, a in enumerate(cells) for b in cells[i + 1:]
                if max(abs(int(a[0]) - int(b[0])), abs(int(a[1]) - int(b[1]))) <= 2]
        self.assertTrue(near, "with suppression off, neighbouring pixels of one object reappear")

    def test_demo_writes_geojson(self):
        import json

        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, "c.geojson")
            v1.run_demo(out)
            with open(out) as f:
                self.assertEqual(json.load(f)["type"], "FeatureCollection")


@unittest.skipUnless(HAS_V3, "numpy/scipy/rasterio not installed")
class FinderV3(unittest.TestCase):
    def setUp(self):
        import sar_person_finder_v3 as v3

        self.v3 = v3
        self.tmp = tempfile.TemporaryDirectory()
        self.engine = v3.MultiBandSAREngine()
        self.raster = os.path.join(self.tmp.name, "r.tif")
        self.engine.generate_multiband_raster(self.raster)

    def tearDown(self):
        self.tmp.cleanup()

    def test_ranked_targets_are_separated(self):
        import rasterio

        targets = self.engine.process_multiband_sar(self.raster)
        with rasterio.open(self.raster) as src:
            cells = [src.index(t["longitude"], t["latitude"]) for t in targets]
        self.assertEqual(tuple(cells[0]), (52, 49))
        for i, a in enumerate(cells):
            for b in cells[i + 1:]:
                self.assertGreater(max(abs(a[0] - b[0]), abs(a[1] - b[1])), 2)

    def test_cot_uses_current_time_and_one_file_per_target(self):
        targets = self.engine.process_multiband_sar(self.raster)[:3]
        now = datetime(2027, 1, 2, 3, 4, 5, tzinfo=timezone.utc)
        paths = self.engine.export_cot_files(targets, os.path.join(self.tmp.name, "cot"), now=now)
        self.assertEqual(len(paths), 3)
        ev = ET.parse(paths[0]).getroot()
        self.assertEqual(ev.tag, "event")
        self.assertEqual(ev.get("time"), "2027-01-02T03:04:05Z")
        self.assertEqual(ev.get("stale"), "2027-01-03T03:04:05Z")

    def test_intensity_input_mode(self):
        amp = self.engine.process_multiband_sar(self.raster)
        self.engine.input_is_amplitude = False
        inten = self.engine.process_multiband_sar(self.raster)
        self.assertNotEqual(amp[0]["band_backscatter_db"], inten[0]["band_backscatter_db"])


if __name__ == "__main__":
    unittest.main()
