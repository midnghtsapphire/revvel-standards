import tempfile
import unittest
import pathlib

# unused (flake8 F401), kept for reference: import json
# Original unconditional imports; they made discovery fail outright on a
# Python without numpy/rasterio instead of skipping this one test:
# import numpy as np
# import rasterio
# from rasterio.transform import from_origin
# from .historical import run, verify
try:
    import numpy as np
    import rasterio
    from rasterio.transform import from_origin
    from .historical import run, verify

    HAS_GEO = True
except ImportError:
    HAS_GEO = False


@unittest.skipUnless(HAS_GEO, "numpy and rasterio are required for the GeoTIFF pipeline test")
class HistoricalTests(unittest.TestCase):
    def test_real_geotiff_change_and_tampering(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            base = np.zeros((30, 30), dtype="float32")
            new = base.copy()
            new[12:16, 13:17] = 10
            profile = {
                "driver": "GTiff",
                "height": 30,
                "width": 30,
                "count": 1,
                "dtype": "float32",
                "crs": "EPSG:32617",
                "transform": from_origin(500000, 4400000, 1, 1),
                "nodata": -9999,
            }
            for name, arr in [("before.tif", base), ("after.tif", new)]:
                with rasterio.open(root / name, "w", **profile) as ds:
                    ds.write(arr, 1)
            m = run("TEST", root / "before.tif", root / "after.tif", root / "out")
            self.assertEqual(m["outputs"]["candidate_count"], 1)
            self.assertTrue(verify(root / "out"))
            with open(root / "out" / "candidates.geojson", "a") as f:
                f.write(" ")
            self.assertFalse(verify(root / "out"))

    def test_missing_crs(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = pathlib.Path(tmp) / "x.tif"
            with rasterio.open(
                p, "w", driver="GTiff", height=5, width=5, count=1, dtype="float32", transform=from_origin(0, 5, 1, 1)
            ) as d:
                d.write(np.ones((5, 5), dtype="float32"), 1)
            with self.assertRaises(ValueError):
                run("TEST", p, p, pathlib.Path(tmp) / "out")


if __name__ == "__main__":
    unittest.main()
