"""Tests for edl_shade.py. numpy only, except the CLI test (rasterio)."""

import importlib.util
import json
import os
import sys
import tempfile
import unittest

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import edl_shade as es  # noqa: E402

HAS_RASTERIO = importlib.util.find_spec("rasterio") is not None


class Shading(unittest.TestCase):
    def test_flat_ground_is_unshaded(self):
        s = es.edl(np.full((20, 20), 100.0), 1.0)
        self.assertTrue(np.allclose(s, 1.0))

    def test_pit_is_dark_and_rim_is_not(self):
        z = np.full((41, 41), 10.0)
        z[18:23, 18:23] = 9.0  # 1 m deep, 5 m wide pit
        s = es.edl(z, 1.0, camera_height=60.0)
        self.assertLess(s[18, 18], 0.5)       # pit edge, higher ground next to it
        self.assertAlmostEqual(s[17, 17], 1.0)  # rim: nothing nearby is higher
        self.assertAlmostEqual(s[5, 5], 1.0)

    def test_stronger_setting_shades_more(self):
        z = np.full((21, 21), 10.0)
        z[10, 10] = 9.8
        a = es.edl(z, 1.0, strength=1.0, camera_height=60.0)[10, 10]
        b = es.edl(z, 1.0, strength=3.0, camera_height=60.0)[10, 10]
        self.assertLess(b, a)
        self.assertLess(a, 1.0)

    def test_nodata_stays_nodata_and_does_not_occlude(self):
        z = np.full((15, 15), 10.0)
        z[:, :5] = np.nan
        s = es.edl(z, 1.0)
        self.assertTrue(np.isnan(s[:, :5]).all())
        self.assertTrue(np.allclose(s[:, 5:], 1.0))

    def test_default_camera_makes_a_1m_step_visible_at_1m(self):
        z = np.full((400, 400), 5.0)
        z[200:, :] = 4.0  # 1 m step across a 400 m grid
        self.assertLess(es.edl(z, 1.0)[200, 100], 0.5)

    def test_bad_input(self):
        with self.assertRaises(ValueError):
            es.edl(np.full((5, 5), np.nan), 1.0)
        with self.assertRaises(ValueError):
            es.edl(np.full((5, 5), 10.0), 1.0, camera_height=5.0)


class Points(unittest.TestCase):
    def test_binning_keeps_highest_or_lowest(self):
        x = np.array([0.1, 0.2, 1.1, 1.2])
        y = np.array([0.9, 0.8, 0.9, 0.9])
        z = np.array([5.0, 7.0, 3.0, 2.0])
        hi, (x0, y1) = es.grid_points(x, y, z, 1.0, "max")
        lo, _ = es.grid_points(x, y, z, 1.0, "min")
        self.assertEqual((x0, y1), (0.0, 1.0))
        self.assertEqual(hi.tolist(), [[7.0, 3.0]])
        self.assertEqual(lo.tolist(), [[5.0, 2.0]])


@unittest.skipUnless(HAS_RASTERIO, "needs rasterio")
class Cli(unittest.TestCase):
    def test_raster_round_trip(self):
        import rasterio
        from rasterio.transform import from_origin
        z = np.full((60, 60), 50.0, dtype="float32")
        z[28:32, 28:32] = 49.0
        with tempfile.TemporaryDirectory() as d:
            src = os.path.join(d, "dem.tif")
            with rasterio.open(src, "w", driver="GTiff", width=60, height=60, count=1, dtype="float32",
                               crs="EPSG:27700", transform=from_origin(400000, 405000, 1, 1)) as dst:
                dst.write(z, 1)
            out = os.path.join(d, "dem_edl")
            self.assertEqual(es.main(["raster", src, "--out", out]), 0)
            with rasterio.open(out + ".tif") as r:
                s = r.read(1)
                self.assertEqual(r.crs.to_epsg(), 27700)
                self.assertEqual(r.transform, from_origin(400000, 405000, 1, 1))
            self.assertLess(s[28, 28], s[10, 10])
            self.assertTrue(os.path.getsize(out + ".png") > 0)
            with open(out + "_manifest.json") as fh:
                self.assertEqual(len(json.load(fh)["input"]["sha256"]), 64)
            self.assertEqual(es.main(["raster", os.path.join(d, "missing.tif"), "--out", out]), 2)


if __name__ == "__main__":
    unittest.main()
