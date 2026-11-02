"""Tests for geotiff_export.py: round trip, verification and GCP georeferencing."""

import csv
import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import rasterio
except ImportError:  # pragma: no cover
    rasterio = None

import geotiff_export as ge  # noqa: E402


def _run(argv):
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        code = ge.main(argv)
    return code, out.getvalue(), err.getvalue()


@unittest.skipIf(rasterio is None, "rasterio not installed")
class WriteAndVerify(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def test_round_trip_keeps_crs_transform_names_units_and_values(self):
        rng = np.random.default_rng(1)
        arr = rng.normal(size=(2, 40, 50))
        arr[0, 3, 4] = np.nan
        xform = ge.transform_from_origin(412000, 4102000, 10)
        path = os.path.join(self.d, "x.tif")
        res = ge.write_geotiff(path, arr, crs="EPSG:32615", transform=xform, nodata=float("nan"),
                               band_names=["ndmi", "dndvi"], units=["1", "1"], description="test")
        self.assertEqual(res["driver"], "COG")
        with rasterio.open(path) as src:
            self.assertEqual(src.crs.to_epsg(), 32615)
            self.assertEqual(src.transform, xform)
            self.assertEqual(src.descriptions, ("ndmi", "dndvi"))
            self.assertEqual(src.dtypes[0], "float32")
            self.assertTrue(np.isnan(src.nodata))
            back = src.read()
            self.assertEqual(src.tags()["revvel_tool"], "geotiff_export.py")
            self.assertEqual(src.tags(1)["units"], "1")
        np.testing.assert_array_equal(back, arr.astype("float32"))
        ok, problems, _ = ge.verify_geotiff(path, crs="EPSG:32615", transform=xform)
        self.assertTrue(ok, problems)

    def test_verify_catches_changed_pixels_wrong_crs_and_untagged_files(self):
        arr = np.arange(20 * 20, dtype="int16").reshape(20, 20)
        xform = ge.transform_from_bounds(0, 0, 200, 200, 20, 20)
        path = os.path.join(self.d, "y.tif")
        ge.write_geotiff(path, arr, crs="EPSG:32615", transform=xform, cog=False)
        with rasterio.open(path, "r+") as dst:
            data = dst.read(1)
            data[5, 5] += 1
            dst.write(data, 1)
        ok, problems, _ = ge.verify_geotiff(path)
        self.assertFalse(ok)
        self.assertTrue(any("SHA-256" in p for p in problems))

        ge.write_geotiff(path, arr, crs="EPSG:32615", transform=xform, cog=False)
        ok, problems, _ = ge.verify_geotiff(path, crs="EPSG:4326")
        self.assertFalse(ok)
        self.assertTrue(any("CRS" in p for p in problems))

        plain = os.path.join(self.d, "plain.tif")
        with rasterio.open(plain, "w", driver="GTiff", width=4, height=4, count=1, dtype="uint8",
                           crs="EPSG:32615", transform=xform) as dst:
            dst.write(np.zeros((1, 4, 4), "uint8"))
        ok, problems, _ = ge.verify_geotiff(plain)
        self.assertFalse(ok)
        self.assertTrue(any("cannot verify" in p for p in problems))

    def test_refuses_missing_grid_nan_in_integer_and_bad_names(self):
        xform = ge.transform_from_origin(0, 10, 1)
        p = os.path.join(self.d, "z.tif")
        with self.assertRaises(ge.InputError):
            ge.write_geotiff(p, np.zeros((5, 5)), crs=None, transform=xform)
        with self.assertRaises(ge.InputError):
            ge.write_geotiff(p, np.array([[np.nan, 1.0]]), crs="EPSG:32615", transform=xform, dtype="int16")
        with self.assertRaises(ge.InputError):
            ge.write_geotiff(p, np.zeros((2, 5, 5)), crs="EPSG:32615", transform=xform, band_names=["a"])
        with self.assertRaises(ge.InputError):
            ge.transform_from_bounds(10, 0, 0, 10, 5, 5)
        self.assertFalse(os.path.exists(p))

    def test_lossy_integer_casts_and_bad_nodata_are_refused(self):
        xform = ge.transform_from_origin(0, 10, 1)
        p = os.path.join(self.d, "c.tif")
        for arr, dtype in ((np.array([[300.0, 1.0]]), "uint8"), (np.array([[1.5, 2.0]]), "int16"),
                           (np.array([[np.inf, 1.0]]), "int16"), (np.array([[70000, 1]]), "int16")):
            with self.subTest(arr=arr, dtype=dtype), self.assertRaises(ge.InputError):
                ge.write_geotiff(p, arr, crs="EPSG:32615", transform=xform, dtype=dtype)
        ge.write_geotiff(p, np.array([[3.0, 250.0]]), crs="EPSG:32615", transform=xform, dtype="uint8", cog=False)
        for nd in ("nope", "inf", "1e9"):
            with self.subTest(nd=nd), self.assertRaises(ge.InputError):
                ge.parse_nodata(nd, "int16")
        npy = os.path.join(self.d, "a.npy")
        np.save(npy, np.zeros((4, 4)))
        code, _, se = _run(["write", npy, "--crs", "EPSG:32615", "--origin", "0", "4", "--pixel-size", "1", "1", "1",
                            "--out", p])
        self.assertEqual(code, 2)
        self.assertIn("--pixel-size", se)
        code, _, _ = _run(["write", npy, "--crs", "EPSG:32615", "--origin", "0", "4", "--pixel-size", "1",
                           "--nodata", "nope", "--out", p])
        self.assertEqual(code, 2)

    def test_no_temp_files_left_behind(self):
        p = os.path.join(self.d, "t.tif")
        ge.write_geotiff(p, np.ones((600, 600), "float32"), crs="EPSG:32615",
                         transform=ge.transform_from_origin(0, 600, 1))
        self.assertEqual(os.listdir(self.d), ["t.tif"])
        with rasterio.open(p) as src:
            self.assertTrue(src.overviews(1))

    def test_cli_write_npz_and_verify(self):
        npz = os.path.join(self.d, "layers.npz")
        np.savez(npz, ndmi=np.full((30, 30), 0.2), dndvi=np.full((30, 30), -0.1))
        out = os.path.join(self.d, "layers.tif")
        code, so, se = _run(["write", npz, "--crs", "EPSG:27700", "--origin", "400000", "500000",
                             "--pixel-size", "10", "--out", out])
        self.assertEqual(code, 0, se)
        res = json.loads(so)
        self.assertTrue(res["verified"])
        self.assertEqual([b["name"] for b in res["bands"]], ["ndmi", "dndvi"])
        self.assertEqual(len(res["sources"]), 1)
        code, so, _ = _run(["verify", out, "--crs", "EPSG:27700"])
        self.assertEqual(code, 0)
        code, _, se = _run(["write", npz, "--crs", "EPSG:27700", "--out", out])
        self.assertEqual(code, 2)
        self.assertIn("grid is undefined", se)
        code, _, se = _run(["write", os.path.join(self.d, "missing.npy"), "--crs", "EPSG:27700",
                            "--bounds", "0", "0", "1", "1", "--out", out])
        self.assertEqual(code, 2)


class GcpFit(unittest.TestCase):
    def test_order3_envelope_covers_every_input_pixel(self):
        # A strongly curved order-3 map: every image pixel must land inside the output grid.
        rng = np.random.default_rng(5)
        c = rng.uniform(0, 199, 30)
        r = rng.uniform(0, 149, 30)
        x = 1000 + c + 0.004 * (c - 100) ** 2 * (r / 150.0) ** 3 * 50
        y = 5000 - r + 0.00002 * (c - 100) ** 3
        gcps = [(c[i], r[i], x[i], y[i], str(i)) for i in range(30)]
        img = np.ones((150, 200))
        out, xform, _ = ge.georeference(img, gcps, 3, pixel_size=1.0)
        fwd, _, _ = ge.fit_gcps(gcps, 3)
        cc, rr = np.meshgrid(np.arange(200.0), np.arange(150.0))
        gx, gy = fwd(cc.ravel(), rr.ravel())
        west, north = xform.c, xform.f
        self.assertTrue((gx >= west).all() and (gx <= west + out.shape[2] * xform.a).all())
        self.assertTrue((gy <= north).all() and (gy >= north + out.shape[1] * xform.e).all())

    def test_report_has_no_nan(self):
        # Dropping "d" leaves three collinear points, so that leave-one-out fold is degenerate.
        gcps = [(0, 0, 0, 0, "a"), (10, 0, 10, 0, "b"), (20, 0, 20, 0, "c"), (0, 10, 0, -10, "d")]
        _, _, rep = ge.fit_gcps(gcps, 1)
        self.assertIsNone(rep["points"][3]["loo_residual"])
        json.dumps(rep, allow_nan=False)

    def affine_gcps(self, n=8, noise=0.0, seed=0):
        rng = np.random.default_rng(seed)
        c = rng.uniform(0, 99, n)
        r = rng.uniform(0, 79, n)
        # 0.5 m pixels, 3 degree rotation, UTM-sized origin.
        th = np.radians(3)
        x = 412000 + 0.5 * (c * np.cos(th) + r * np.sin(th)) + rng.normal(0, noise, n)
        y = 4102000 + 0.5 * (c * np.sin(th) - r * np.cos(th)) + rng.normal(0, noise, n)
        return [(c[i], r[i], x[i], y[i], f"g{i}") for i in range(n)]

    def test_exact_affine_recovered_with_zero_residuals(self):
        fwd, inv, rep = ge.fit_gcps(self.affine_gcps(), 1)
        self.assertLess(rep["rmse_map_units"], 1e-6)
        self.assertLess(rep["loo_rmse_map_units"], 1e-6)
        x, y = fwd(np.array([10.0]), np.array([20.0]))
        c, r = inv(x, y)
        self.assertAlmostEqual(c[0], 10.0, places=6)
        self.assertAlmostEqual(r[0], 20.0, places=6)

    def test_loo_error_exceeds_fit_error_with_noise(self):
        _, _, rep = ge.fit_gcps(self.affine_gcps(n=10, noise=2.0), 1)
        self.assertGreater(rep["rmse_map_units"], 0.5)
        self.assertGreater(rep["loo_rmse_map_units"], rep["rmse_map_units"])

    def test_exact_fit_is_flagged_and_too_few_points_refused(self):
        _, _, rep = ge.fit_gcps(self.affine_gcps(n=6, noise=1.0), 2)
        self.assertEqual(rep["redundancy"], 0)
        self.assertIsNone(rep["loo_rmse_map_units"])
        self.assertLess(rep["rmse_map_units"], 1e-6)
        self.assertTrue(any("by construction" in w for w in rep["warnings"]))
        with self.assertRaises(ge.InputError):
            ge.fit_gcps(self.affine_gcps(n=5), 2)
        with self.assertRaises(ge.InputError):
            ge.fit_gcps([(0, 0, 0, 0, "a"), (1, 1, 1, 1, "b"), (2, 2, 2, 2, "c")], 1)

    @unittest.skipIf(rasterio is None, "rasterio not installed")
    def test_georeference_places_known_pixel_at_known_ground_point(self):
        gcps = self.affine_gcps()
        img = np.zeros((80, 100))
        img[40, 50] = 100.0
        out, xform, rep = ge.georeference(img, gcps, 1, pixel_size=0.5)
        b = out[0]
        i, j = np.unravel_index(np.nanargmax(b), b.shape)
        gx, gy = rasterio.transform.xy(xform, i, j)
        th = np.radians(3)
        ex = 412000 + 0.5 * (50 * np.cos(th) + 40 * np.sin(th))
        ey = 4102000 + 0.5 * (50 * np.sin(th) - 40 * np.cos(th))
        self.assertLess(np.hypot(gx - ex, gy - ey), 0.75)
        self.assertTrue(np.isnan(b).any())  # rotated image leaves empty corners
        self.assertEqual(rep["output_shape"], list(b.shape))

    def test_nan_input_cells_do_not_bleed(self):
        gcps = self.affine_gcps()
        img = np.ones((80, 100))
        img[:, :50] = np.nan
        out, _, _ = ge.georeference(img, gcps, 1, pixel_size=0.5)
        finite = out[0][np.isfinite(out[0])]
        self.assertGreater(finite.size, 0)
        np.testing.assert_allclose(finite, 1.0)


@unittest.skipIf(rasterio is None, "rasterio not installed")
class GeorefCli(unittest.TestCase):
    def test_cli_georef_writes_report_and_enforces_max_rmse(self):
        with tempfile.TemporaryDirectory() as d:
            gcps = GcpFit().affine_gcps(n=8, noise=1.0, seed=3)
            gp = os.path.join(d, "gcps.csv")
            with open(gp, "w", newline="", encoding="utf-8") as f:
                w = csv.writer(f)
                w.writerow(["id", "col", "row", "x", "y"])
                for c, r, x, y, i in gcps:
                    w.writerow([i, c, r, x, y])
            arr = os.path.join(d, "img.npy")
            np.save(arr, np.random.default_rng(0).random((80, 100)))
            out = os.path.join(d, "img.tif")
            rep = os.path.join(d, "rep.json")
            code, so, se = _run(["georef", arr, "--gcps", gp, "--crs", "EPSG:32615", "--pixel-size", "0.5",
                                 "--out", out, "--report", rep])
            self.assertEqual(code, 0, se)
            with open(rep, encoding="utf-8") as f:
                res = json.load(f)
            self.assertEqual(len(res["georef"]["points"]), 8)
            self.assertEqual(len(res["sources"]), 2)
            with rasterio.open(out) as src:
                self.assertEqual(src.tags()["revvel_georef_n_gcp"], "8")
                self.assertIn("revvel_gcps_json", src.tags())
            code, _, se = _run(["georef", arr, "--gcps", gp, "--crs", "EPSG:32615", "--pixel-size", "0.5",
                                "--out", out, "--max-rmse", "0.01"])
            self.assertEqual(code, 1)
            self.assertIn("--max-rmse", se)


if __name__ == "__main__":
    unittest.main()
