"""Offline tests for microtopo.py (M-TMAT) on synthetic GeoTIFFs with known
answers. Skipped when numpy, scipy or rasterio is missing.

Run: python -m unittest test_microtopo
"""

import csv
import hashlib
import importlib.util
import json
import math
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

HAS_GEO = all(importlib.util.find_spec(m) is not None for m in ("numpy", "scipy", "rasterio"))

if HAS_GEO:
    import numpy as np
    import rasterio
    from rasterio.transform import from_origin
    from rasterio.warp import transform

    import microtopo as mt

# UTM 15N, grid centred on the central meridian (x = 500000) so grid north is
# true north to within 0.001 degrees and expected bearings are plain atan2.
CRS = "EPSG:32615"
CX, CY = 500000.0, 3420000.0
N = 120  # cells; 1 m
X0, Y0 = CX - N / 2, CY + N / 2

MOUND = {"dx": 20, "dy": 30, "w": 8, "h": 5, "dz": 0.5}  # centre offset from grid centre, metres
PIT = {"dx": -25, "dy": -15, "w": 6, "h": 6, "dz": -0.6}
BIAS = 0.40  # larger than the LoD, so a missing bias removal floods the window


def _write(path, z, x0=X0, y0=Y0, crs=CRS):
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=z.shape[0],
        width=z.shape[1],
        count=1,
        dtype="float32",
        crs=crs,
        transform=from_origin(x0, y0, 1.0, 1.0),
        nodata=-9999,
    ) as d:
        d.write(z.astype("float32"), 1)


def _box(z, spec):
    """Add a flat-topped box of spec['dz'] centred spec['dx'], spec['dy'] metres from the grid centre."""
    c0 = int(N / 2 + spec["dx"] - spec["w"] / 2)
    r0 = int(N / 2 - spec["dy"] - spec["h"] / 2)
    z[slice(r0, r0 + spec["h"]), slice(c0, c0 + spec["w"])] += spec["dz"]


def _latlon(x, y):
    (lon,), (lat,) = transform(CRS, "EPSG:4326", [x], [y])
    return lat, lon


@unittest.skipUnless(HAS_GEO, "numpy/scipy/rasterio not installed")
class ChangeDetection(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        rng = np.random.default_rng(42)
        base = 10.0 + rng.normal(0, 0.03, (N, N))
        rec = 10.0 + BIAS + rng.normal(0, 0.03, (N, N))
        _box(rec, MOUND)
        _box(rec, PIT)
        # Below the LoD: a 0.15 m rise over 10 x 10 m, and a 1 m spike of a single cell (under min area).
        rec[85:95, 85:95] += 0.15
        rec[10, 100] += 1.0
        cls.base_p = os.path.join(cls.tmp.name, "base.tif")
        cls.rec_p = os.path.join(cls.tmp.name, "rec.tif")
        _write(cls.base_p, base)
        _write(cls.rec_p, rec)
        cls.ref = _latlon(CX, CY)
        cls.out = os.path.join(cls.tmp.name, "out")
        cls.rc = mt.main(
            [
                "--baseline",
                cls.base_p,
                "--recent",
                cls.rec_p,
                "--ref-lat",
                str(cls.ref[0]),
                "--ref-lon",
                str(cls.ref[1]),
                "--out-dir",
                cls.out,
            ]
        )
        with open(os.path.join(cls.out, "manifest.json")) as f:
            cls.man = json.load(f)
        with open(os.path.join(cls.out, "ledger.csv")) as f:
            cls.ledger = list(csv.DictReader(f))

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def _get(self, kind):
        rows = [r for r in self.ledger if r["type"] == kind]
        self.assertEqual(len(rows), 1, f"expected exactly one {kind}, got {self.ledger}")
        return {k: (float(v) if k not in ("id", "type") and v != "" else v) for k, v in rows[0].items()}

    def test_exit_zero_and_exactly_two_anomalies(self):
        self.assertEqual(self.rc, 0)
        self.assertEqual(len(self.ledger), 2, self.ledger)

    def _check(self, kind, spec):
        r = self._get(kind)
        area = spec["w"] * spec["h"]
        self.assertAlmostEqual(r["area_m2"], area, delta=0.2 * area)
        self.assertAlmostEqual(r["volume_m3"], area * spec["dz"], delta=0.2 * abs(area * spec["dz"]))
        self.assertEqual(math.copysign(1, r["mean_dz_m"]), math.copysign(1, spec["dz"]))
        self.assertEqual(math.copysign(1, r["volume_m3"]), math.copysign(1, spec["dz"]))
        dist = math.hypot(spec["dx"], spec["dy"])
        brg = math.degrees(math.atan2(spec["dx"], spec["dy"])) % 360
        self.assertAlmostEqual(r["distance_m"], dist, delta=0.6)
        self.assertAlmostEqual(r["distance_ft"], dist / 0.3048, delta=2.0)
        self.assertAlmostEqual(r["bearing_deg_true"], brg, delta=1.0)
        lat, lon = _latlon(CX + spec["dx"], CY + spec["dy"])
        self.assertAlmostEqual(r["centroid_lat"], lat, delta=1e-5)
        self.assertAlmostEqual(r["centroid_lon"], lon, delta=1e-5)

    def test_mound_found_with_positive_sign(self):
        self._check("fill_mound", MOUND)

    def test_pit_found_with_negative_sign(self):
        self._check("excavation_pit", PIT)

    def test_sorted_by_absolute_volume(self):
        vols = [abs(float(r["volume_m3"])) for r in self.ledger]
        self.assertEqual(vols, sorted(vols, reverse=True))
        self.assertEqual(self.ledger[0]["id"], "A001")

    def test_below_lod_and_tiny_changes_not_reported(self):
        # The 0.15 m rise sits at grid (rows 85-95, cols 85-95); the spike at (10, 100).
        for r in self.ledger:
            x, y = float(r["centroid_x"]), float(r["centroid_y"])
            self.assertFalse(X0 + 80 < x < X0 + 100 and Y0 - 100 < y < Y0 - 80, f"sub-LoD rise reported: {r}")
            self.assertFalse(abs(x - (X0 + 100.5)) < 3 and abs(y - (Y0 - 10.5)) < 3, f"1-cell spike reported: {r}")
        lod = 1.96 * math.sqrt(0.1**2 + 0.1**2)
        self.assertAlmostEqual(self.man["results"]["lod_m"], lod, places=3)
        self.assertEqual(self.man["parameters"]["t"], 1.96)

    def test_vertical_bias_removed(self):
        self.assertAlmostEqual(self.man["results"]["vertical_bias_removed_m"], BIAS, delta=0.01)
        with rasterio.open(os.path.join(self.out, "dz.tif")) as d:
            dz = d.read(1)
        self.assertLess(abs(float(np.nanmedian(dz))), 0.01)
        # Far from every feature the corrected change is noise around zero.
        self.assertLess(abs(float(np.nanmean(dz[0:20, 0:20]))), 0.02)

    def test_outputs_and_manifest_hashes(self):
        for name in ("dz.tif", "lrm.tif", "svf.tif", "anomalies.geojson", "anomalies.kml", "ledger.csv"):
            p = os.path.join(self.out, name)
            self.assertTrue(os.path.isfile(p), name)
            with open(p, "rb") as f:
                self.assertEqual(self.man["outputs_sha256"][name], hashlib.sha256(f.read()).hexdigest(), name)
        self.assertIn("ground verification", self.man["note"])
        self.assertEqual(self.man["inputs"]["baseline"]["path"], os.path.abspath(self.base_p))
        with open(os.path.join(self.out, "anomalies.geojson")) as f:
            gj = json.load(f)
        self.assertEqual(len(gj["features"]), 2)
        self.assertEqual({f["properties"]["type"] for f in gj["features"]}, {"fill_mound", "excavation_pit"})
        with open(os.path.join(self.out, "anomalies.kml")) as f:
            self.assertEqual(f.read().count("<Placemark>"), 2)


@unittest.skipUnless(HAS_GEO, "numpy/scipy/rasterio not installed")
class Surfaces(unittest.TestCase):
    def test_lrm_of_tilted_plane_is_zero(self):
        rr, cc = np.indices((80, 90), dtype="f8")
        z = 100 + 0.07 * cc - 0.03 * rr
        lrm = mt.local_relief(z, 1.0, 5.0)
        self.assertLess(float(np.abs(lrm).max()), 1e-6)

    def test_lrm_shows_a_bump_on_a_slope(self):
        rr, cc = np.indices((80, 90), dtype="f8")
        z = 100 + 0.07 * cc - 0.03 * rr + 0.3 * np.exp(-((rr - 40) ** 2 + (cc - 45) ** 2) / (2 * 1.5**2))
        lrm = mt.local_relief(z, 1.0, 5.0)
        self.assertGreater(lrm[40, 45], 0.2)
        self.assertLess(abs(lrm[5, 5]), 0.02)

    def test_svf_flat_is_one(self):
        svf = mt.sky_view_factor(np.full((40, 40), 5.0), 1.0, 10.0, 16)
        np.testing.assert_allclose(svf, 1.0, atol=1e-12)

    def test_svf_lower_in_pit(self):
        z = np.full((60, 60), 5.0)
        z[28:32, 28:32] -= 1.0
        svf = mt.sky_view_factor(z, 1.0, 10.0, 16)
        self.assertLess(svf[30, 30], 0.8)
        self.assertGreater(svf[30, 30], 0.2)
        self.assertAlmostEqual(float(svf[5, 5]), 1.0, places=9)

    def test_lod_threshold(self):
        self.assertAlmostEqual(mt.lod_threshold(0.1, 0.1, 1.96), 0.2772, places=4)
        self.assertAlmostEqual(mt.lod_threshold(0.05, 0.12, 1.0), 0.13, places=6)


@unittest.skipUnless(HAS_GEO, "numpy/scipy/rasterio not installed")
class InputsAndGeodesy(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.tmp.cleanup()

    def test_non_overlapping_inputs_exit_nonzero(self):
        a, b = os.path.join(self.tmp.name, "a.tif"), os.path.join(self.tmp.name, "b.tif")
        _write(a, np.full((30, 30), 10.0))
        _write(b, np.full((30, 30), 10.0), x0=X0 + 5000)
        rc = mt.main(["--baseline", a, "--recent", b, "--out-dir", os.path.join(self.tmp.name, "o")])
        self.assertEqual(rc, 2)

    def test_all_nodata_exits_nonzero(self):
        a, b = os.path.join(self.tmp.name, "a.tif"), os.path.join(self.tmp.name, "b.tif")
        _write(a, np.full((30, 30), 10.0))
        _write(b, np.full((30, 30), -9999.0))
        rc = mt.main(["--baseline", a, "--recent", b, "--out-dir", os.path.join(self.tmp.name, "o")])
        self.assertEqual(rc, 2)

    def test_recent_in_other_crs_is_reprojected(self):
        # Same flat ground plus a 0.5 m mound, recent delivered in WGS84 degrees.
        z = np.full((N, N), 10.0)
        a = os.path.join(self.tmp.name, "a.tif")
        _write(a, z)
        rec = z.copy()
        _box(rec, MOUND)
        tmp_utm = os.path.join(self.tmp.name, "r_utm.tif")
        _write(tmp_utm, rec)
        b = os.path.join(self.tmp.name, "r_wgs.tif")
        with rasterio.open(tmp_utm) as src:
            dst_t, w, h = rasterio.warp.calculate_default_transform(
                src.crs, "EPSG:4326", src.width, src.height, *src.bounds
            )
            arr = np.full((h, w), np.nan, dtype="f4")
            rasterio.warp.reproject(
                rasterio.band(src, 1),
                arr,
                dst_transform=dst_t,
                dst_crs="EPSG:4326",
                resampling=rasterio.warp.Resampling.nearest,
                dst_nodata=np.nan,
            )
        with rasterio.open(
            b,
            "w",
            driver="GTiff",
            height=h,
            width=w,
            count=1,
            dtype="float32",
            crs="EPSG:4326",
            transform=dst_t,
            nodata=np.nan,
        ) as d:
            d.write(arr, 1)
        out = os.path.join(self.tmp.name, "o")
        self.assertEqual(mt.main(["--baseline", a, "--recent", b, "--out-dir", out]), 0)
        with open(os.path.join(out, "manifest.json")) as f:
            man = json.load(f)
        self.assertEqual(man["grid"]["crs"], CRS)
        mounds = [x for x in man["results"]["top_anomalies"] if x["type"] == "fill_mound"]
        self.assertEqual(len(mounds), 1)
        self.assertAlmostEqual(mounds[0]["area_m2"], 40, delta=10)

    def test_geodesic_offset(self):
        d, b = mt.geodesic_offset(0.0, 0.0, 1 / 60, 0.0)
        self.assertAlmostEqual(d, 1842.9, delta=1.0)  # one arc-minute of latitude at the equator
        self.assertAlmostEqual(b, 0.0, delta=1e-6)
        d, b = mt.geodesic_offset(45.0, -90.0, 45.0, -89.99)
        self.assertAlmostEqual(b, 90.0, delta=0.01)
        self.assertAlmostEqual(d, 787.0, delta=2.0)  # 0.01 deg of longitude at 45 N
        _, b = mt.geodesic_offset(45.0, -90.0, 44.999, -90.001)
        self.assertGreater(b, 180)
        self.assertLess(b, 270)

    def test_3dep_tile_index(self):
        # Checked against the bucket: USGS_1M_15_x66y343_LA_CPRA_2019_C20.tif covers 30.910 N, 91.280 W.
        zone, cells = mt.tile_indices(30.910, -91.280, 50)
        self.assertEqual(zone, 15)
        self.assertEqual(cells, [(66, 343)])
        # USGS_one_meter_x58y535_WA_Western_North_2016.tif (easting 585464 m: floor, not round, gives 58).
        self.assertEqual(mt.tile_indices(48.282, -121.848, 50), (10, [(58, 535)]))
        # USGS_1M_10_x64y398_CA_AZ_FEMA_R9_Lidar_2017_D18.tif (northing 3970177 m: ceil gives 398).
        self.assertEqual(mt.tile_indices(35.8656, -121.4316, 50), (10, [(64, 398)]))

    def test_volume_and_area_scale_with_cell_size(self):
        # Half-metre grid: a 4 x 3 m box 0.5 m high is 48 cells, 12 m^2, 6 m^3.
        res = 0.5
        zb = np.zeros((100, 100))
        zr = zb.copy()
        zr[40:48, 50:56] += 0.5
        t = from_origin(X0, Y0, res, res)
        out = mt.analyse(zb, zr, res, t, rasterio.crs.CRS.from_string(CRS), ref=_latlon(CX, CY))
        (a,) = out["anomalies"]
        self.assertEqual(a["cells"], 48)
        self.assertAlmostEqual(a["area_m2"], 12.0, places=6)
        self.assertAlmostEqual(a["volume_m3"], 6.0, places=4)


if __name__ == "__main__":
    unittest.main()
