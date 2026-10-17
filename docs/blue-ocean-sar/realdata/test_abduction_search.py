"""Tests for abduction_search.py and abduction_prior.json.

Standard library only, except the DEM test, which needs numpy, scipy and
rasterio and is skipped without them.
"""

import contextlib
import datetime as dt
import importlib.util
import io
import json
import os
import sqlite3
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import abduction_search as ab  # noqa: E402
import lost_person_behavior as lpb  # noqa: E402

HAS_RASTER = all(importlib.util.find_spec(m) for m in ("numpy", "scipy", "rasterio"))
NOW = dt.datetime(2026, 10, 17, 12, 0, tzinfo=dt.timezone.utc)
LAT, LON = 28.3200, -80.6080


def run(argv):
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = ab.main(argv, now=NOW)
    return code, out.getvalue(), err.getvalue()


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def write_prior(d, entries):
    p = os.path.join(d, "prior.json")
    with open(p, "w", encoding="utf-8") as fh:
        json.dump({"entries": entries}, fh)
    return p


def entry(**over):
    e = {"id": "x", "anchor": "last_known_location", "percent": 50, "distance_m": 100.0,
         "measures_to": "t", "source": "s", "verified": False}
    e.update(over)
    return e


class Prior(unittest.TestCase):
    def test_shipped_prior_loads_and_is_marked_unverified(self):
        data = ab.load_prior()
        ids = {e["id"]: e for e in data["entries"]}
        self.assertEqual(ids["lkl_to_contact_site"]["distance_m"], 402.336)  # 1/4 mile
        self.assertEqual(ids["murder_site_to_body_recovery"]["distance_m"], 60.96)  # 200 ft
        # Nobody has read these against the printed page yet; the file must say so.
        self.assertTrue(all(e["verified"] is False and e["page"] is None for e in data["entries"]))

    def test_bad_priors_are_refused(self):
        with tempfile.TemporaryDirectory() as d:
            for bad in ([entry(anchor="suspect_home")], [entry(verified="yes")], [entry(distance_m=0)],
                        [entry(percent=150)], [entry(verified=True)], [entry(), entry()], [],
                        [entry(distance_m=True)]):
                with self.subTest(bad=bad):
                    with self.assertRaises(ValueError):
                        ab.load_prior(write_prior(d, bad))


class Outputs(unittest.TestCase):
    def test_rings_are_geodesic_and_labelled_with_source(self):
        with tempfile.TemporaryDirectory() as d:
            code, out, err = run(["--case-id", "test", "--lat", str(LAT), "--lon", str(LON), "--out", d])
            self.assertEqual(code, 0)
            self.assertIn("unverified", err)
            gj = json.loads(read(os.path.join(d, "rings.geojson")))
            ring = gj["features"][1]
            self.assertIn("UNVERIFIED", ring["properties"]["label"])
            for lo, la in ring["geometry"]["coordinates"][0][:-1]:
                self.assertAlmostEqual(lpb.haversine_km(LAT, LON, la, lo) * 1000, 402.336, delta=1.5)
            ET.fromstring(read(os.path.join(d, "rings.kml")).split("?>", 1)[1])
            s = json.loads(read(os.path.join(d, "summary.json")))
            self.assertEqual(s["run_utc"], NOW.isoformat())
            self.assertIsNone(s["depressions"])

    def test_require_verified_fails_on_unverified_and_passes_once_checked(self):
        with tempfile.TemporaryDirectory() as d:
            base = ["--case-id", "t", "--lat", "1", "--lon", "1", "--out", d, "--require-verified"]
            self.assertEqual(run(base)[0], 1)
            p = write_prior(d, [entry(verified=True, page=12)])
            self.assertEqual(run(base + ["--prior", p])[0], 0)

    def test_bad_input_is_exit_2(self):
        with tempfile.TemporaryDirectory() as d:
            ok = ["--case-id", "t", "--lon", "1", "--out", d]
            self.assertEqual(run(ok + ["--lat", "95"])[0], 2)
            self.assertEqual(run(ok + ["--lat", "1", "--dem", os.path.join(d, "missing.tif")])[0], 2)
            p = write_prior(d, [entry()])
            self.assertEqual(run(ok + ["--lat", "1", "--prior", p, "--anchor", "murder_site"])[0], 2)

    def test_log_appends_a_real_row_and_no_mock_rows(self):
        with tempfile.TemporaryDirectory() as d:
            db = os.path.join(d, "runs.sqlite")
            for _ in range(2):
                run(["--case-id", "case-a", "--lat", "1", "--lon", "1", "--out", d, "--log", db])
            con = sqlite3.connect(db)
            rows = con.execute("SELECT case_id, run_utc, rings FROM abduction_search_runs").fetchall()
            con.close()
            self.assertEqual(rows, [("case-a", NOW.isoformat(), 1)] * 2)


class Geometry(unittest.TestCase):
    def test_distance_to_road_segment(self):
        road = [[[LON - 0.01, LAT + 0.001], [LON + 0.01, LAT + 0.001]]]  # east-west line ~110.6 m north
        self.assertAlmostEqual(ab.distance_to_lines_m(LAT, LON, road), 110.6, delta=0.5)
        self.assertAlmostEqual(ab.distance_to_lines_m(LAT + 0.001, LON, road), 0.0, delta=0.01)

    def test_bearing(self):
        self.assertAlmostEqual(ab.bearing_deg(0, 0, 1, 0), 0.0, places=6)
        self.assertAlmostEqual(ab.bearing_deg(0, 0, 0, 1), 90.0, places=6)


@unittest.skipUnless(HAS_RASTER, "needs numpy, scipy and rasterio")
class Terrain(unittest.TestCase):
    def test_pit_in_a_flat_dem_is_found_with_distance_and_road(self):
        import numpy as np
        import rasterio
        from rasterio.transform import from_origin
        from rasterio.warp import transform

        (cx,), (cy,) = transform("EPSG:4326", "EPSG:32617", [LON], [LAT])
        z = np.full((900, 900), 3.0, dtype="f4")
        z[491:495, 481:485] = 2.0  # 1 m deep, 4 x 4 m pit ~ 45 m south-east of the point
        with tempfile.TemporaryDirectory() as d:
            dem = os.path.join(d, "dem.tif")
            with rasterio.open(dem, "w", driver="GTiff", width=900, height=900, count=1, dtype="float32",
                               crs="EPSG:32617", transform=from_origin(cx - 450, cy + 450, 1, 1)) as dst:
                dst.write(z, 1)
            roads = os.path.join(d, "roads.geojson")
            line = {"type": "LineString", "coordinates": [[LON - 0.01, LAT], [LON + 0.01, LAT]]}
            with open(roads, "w", encoding="utf-8") as fh:
                json.dump({"type": "FeatureCollection",
                           "features": [{"type": "Feature", "properties": {}, "geometry": line}]}, fh)
            code, out, err = run(["--case-id", "t", "--lat", str(LAT), "--lon", str(LON), "--dem", dem,
                                  "--roads", roads, "--out", d])
            self.assertEqual(code, 0, err)
            s = json.loads(read(os.path.join(d, "summary.json")))
            self.assertEqual(len(s["depressions"]), 1)
            p = s["depressions"][0]
            self.assertAlmostEqual(p["max_depth_m"], 1.0, delta=0.05)
            self.assertAlmostEqual(p["distance_m"], 50.0, delta=8)
            self.assertTrue(90 < p["bearing_deg"] < 180)
            self.assertAlmostEqual(p["nearest_road_m"], 41.0, delta=3)
            self.assertEqual(p["inside_rings"], ["lkl_to_contact_site"])
            self.assertTrue(os.path.exists(os.path.join(d, "depressions.csv")))


if __name__ == "__main__":
    unittest.main()
