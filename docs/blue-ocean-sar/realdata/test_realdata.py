"""Offline tests: synthetic rasters with known answers. Live data runs are
separate (see README).

Raster tests need numpy, scipy and rasterio; image tests also need Pillow.
They are skipped when those are missing. The qPCR, weather and registry
tests need only the standard library."""

import importlib.util
import math
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

HAS_GEO = all(importlib.util.find_spec(m) is not None for m in ("numpy", "scipy", "rasterio"))
HAS_PIL = HAS_GEO and importlib.util.find_spec("PIL") is not None

if HAS_GEO:
    import numpy as np
    import rasterio
    import rasterio.warp
    from rasterio.transform import from_origin

    import dem_terrain as dt
    import s2_change as s2c
    import s2_ndvi as s2


def _write(path, z, crs="EPSG:32611", x0=500000.0, y0=5640000.0, res=1.0):
    with rasterio.open(path, "w", driver="GTiff", height=z.shape[0], width=z.shape[1], count=1,
                       dtype="float32", crs=crs, transform=from_origin(x0, y0, res, res), nodata=-9999) as d:
        d.write(z.astype("float32"), 1)


@unittest.skipUnless(HAS_GEO, "numpy/scipy/rasterio not installed")
class Terrain(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        n = 201
        yy, xx = np.mgrid[0:n, 0:n].astype(float)
        self.plane = 100.0 + 0.10 * xx  # rises to the east, so downhill is west
        z = self.plane.copy()
        z[90:111, 140:161] -= 2.0  # 21x21 m pit, 2 m deep, east of centre
        self.path = os.path.join(self.tmp.name, "dem.tif")
        _write(self.path, z)
        with rasterio.open(self.path) as s:
            cx, cy = s.xy(100, 100)
        (self.lon,), (self.lat,) = rasterio.warp.transform("EPSG:32611", "EPSG:4326", [cx], [cy])

    def tearDown(self):
        self.tmp.cleanup()

    def test_pit_found_with_right_depth_and_area(self):
        r = dt.analyse_point(self.lat, self.lon, 100, 1.0, [self.path], min_depth_m=0.5)
        d = r["depressions"][0]
        # On a 10 % slope the pit only fills to its lowest (west) rim:
        # rim 100+0.1*139 = 113.9, deepest floor 98+... = 112.0 -> 1.9 m; cells
        # deeper than 0.5 m are x = 140..153 -> 14 x 21 = 294 m^2.
        self.assertAlmostEqual(d["max_depth_m"], 1.9, delta=0.1)
        self.assertAlmostEqual(d["area_m2"], 14 * 21, delta=25)

    def test_slope_of_plane(self):
        r = dt.analyse_point(self.lat, self.lon, 50, 1.0, [self.path])
        self.assertAlmostEqual(r["point"]["slope_deg"], math.degrees(math.atan(0.10)), delta=0.3)

    def test_downhill_path_goes_west_and_leaves_grid(self):
        r = dt.analyse_point(self.lat, self.lon, 60, 1.0, [self.path])
        c = r["downhill_path"]["coords_lon_lat_z"]
        self.assertEqual(r["downhill_path"]["end"], "left_grid")
        self.assertLess(c[-1][0], c[0][0])
        self.assertGreater(r["downhill_path"]["drop_m"], 5.0)

    def test_path_crosses_a_pit_instead_of_stopping(self):
        z = self.plane.copy()
        z[95:106, 60:80] -= 1.5  # pit directly downhill (west) of the centre
        p = os.path.join(self.tmp.name, "pit_west.tif")
        _write(p, z)
        r = dt.analyse_point(self.lat, self.lon, 90, 1.0, [p])
        self.assertEqual(r["downhill_path"]["end"], "left_grid")

    def test_partial_coverage_rejected_unless_allowed(self):
        z = self.plane.copy()
        z[:, :60] = -9999  # nodata strip on the west side, inside a 90 m window
        p = os.path.join(self.tmp.name, "partial.tif")
        _write(p, z)
        with self.assertRaises(ValueError):
            dt.analyse_point(self.lat, self.lon, 90, 1.0, [p])
        r = dt.analyse_point(self.lat, self.lon, 90, 1.0, [p], allow_partial=True)
        self.assertGreater(r["nodata_cells_filled"], 0)

    def test_dem_change_finds_only_real_change(self):
        n = 101
        before = np.full((n, n), 50.0) + np.random.default_rng(1).normal(0, 0.02, (n, n))
        after = before + np.random.default_rng(2).normal(0, 0.02, (n, n))
        after[40:46, 40:46] -= 0.4
        pb, pa = (os.path.join(self.tmp.name, f) for f in ("b.tif", "a.tif"))
        _write(pb, before)
        _write(pa, after)
        res = dt.dem_change(pb, pa, lod_m=0.10)
        self.assertEqual(len(res["patches"]), 1)
        self.assertAlmostEqual(res["patches"][0]["mean_change_m"], -0.4, delta=0.05)
        self.assertAlmostEqual(res["patches"][0]["area_m2"], 36, delta=4)

    def test_no_change_no_patches(self):
        n = 51
        z = np.full((n, n), 10.0)
        pb, pa = (os.path.join(self.tmp.name, f) for f in ("b2.tif", "a2.tif"))
        _write(pb, z)
        _write(pa, z + 0.05)
        self.assertEqual(dt.dem_change(pb, pa, lod_m=0.10)["patches"], [])

    def test_cop30_tile_names(self):
        self.assertTrue(dt.cop30_url(50, -120).endswith(
            "Copernicus_DSM_COG_10_N50_00_W120_00_DEM/Copernicus_DSM_COG_10_N50_00_W120_00_DEM.tif"))
        self.assertIn("S34_00_E018_00", dt.cop30_url(-34, 18))


@unittest.skipUnless(HAS_GEO, "numpy/scipy/rasterio not installed")
class Sentinel2Helpers(unittest.TestCase):
    def test_mgrs_matches_reference_library(self):
        try:
            import mgrs
        except ImportError:
            self.skipTest("mgrs not installed")
        m = mgrs.MGRS()
        for lat, lon in [(50.8782, -119.9075), (36.62, -94.41), (39.9985, -83.0064), (-33.9, 18.4), (46.2, -74.6)]:
            zone = int((lon + 180) // 6) + 1
            self.assertEqual(s2.mgrs_tile(lat, lon, zone), m.toMGRS(lat, lon, MGRSPrecision=0))

    def test_sun_peaks_neighbour_zone_tile(self):
        # The native tile 11UKS is not in the archive; the zone-10 overlap tile is.
        self.assertIn("10UGB", s2.candidate_tiles(50.8782, -119.9075))

    def test_circle_masks_disjoint(self):
        inner, ring = s2._circle_masks((41, 41), (20, 20), 10.0, 20.0, 150.0)
        self.assertFalse((inner & ring).any())
        self.assertEqual(int(inner.sum()), 13)

    def test_scene_url(self):
        self.assertEqual(
            s2.scene_url("15SUA", "S2B_15SUA_20260912_0_L2A"),
            "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/15/S/UA/2026/9/"
            "S2B_15SUA_20260912_0_L2A")


import csv as _csv  # noqa: E402

import qpcr_interpret as qi  # noqa: E402
import weather_history as wh  # noqa: E402

if HAS_PIL:
    from PIL import Image

    import image_phash as ih


@unittest.skipUnless(HAS_PIL, "Pillow/numpy/scipy not installed")
class Phash(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        rng = np.random.default_rng(0)
        base = (rng.random((240, 320, 3)) * 255).astype("uint8")
        base[60:180, 80:240] = [128, 0, 32]  # a burgundy block
        self.a = os.path.join(self.tmp.name, "a.png")
        Image.fromarray(base).save(self.a)
        self.a_small = os.path.join(self.tmp.name, "a_small.jpg")
        Image.fromarray(base).resize((160, 120)).save(self.a_small, quality=70)
        other = (np.random.default_rng(9).random((240, 320, 3)) * 255).astype("uint8")
        self.b = os.path.join(self.tmp.name, "b.png")
        Image.fromarray(other).save(self.b)

    def tearDown(self):
        self.tmp.cleanup()

    def test_resized_copy_is_close_different_image_is_far(self):
        a, s, b = (ih.describe(p) for p in (self.a, self.a_small, self.b))
        self.assertLessEqual(ih.hamming(a["_ph"], s["_ph"]), 8)
        self.assertGreater(ih.hamming(a["_ph"], b["_ph"]), 14)
        self.assertEqual(ih.verdict(ih.hamming(a["_ph"], b["_ph"])), "different_images")

    def test_hash_is_of_the_file_contents(self):
        a1, a2 = ih.describe(self.a), ih.describe(self.a)
        self.assertEqual(a1["sha256"], a2["sha256"])
        self.assertEqual(len(a1["phash"]), 16)


class Qpcr(unittest.TestCase):
    def plate(self, extra=(), ntc_human="Undetermined", pos=24.0):
        rows = [
            ("NTC1", "ntc", "human", ntc_human), ("NTC1", "ntc", "ipc", 28.0),
            ("POS1", "positive", "human", pos), ("POS1", "positive", "ipc", 28.1),
            ("S1", "unknown", "human", 33.1), ("S1", "unknown", "human", 33.6), ("S1", "unknown", "human", 33.4),
            ("S1", "unknown", "ipc", 28.3),
            ("S2", "unknown", "human", "Undetermined"), ("S2", "unknown", "human", "Undetermined"),
            ("S2", "unknown", "ipc", 28.2),
            ("S3", "unknown", "human", 34.0), ("S3", "unknown", "ipc", 31.5),
            ("S4", "unknown", "human", 35.9), ("S4", "unknown", "human", "Undetermined"),
            ("S4", "unknown", "ipc", 28.0),
        ] + list(extra)
        return [{"sample_id": s, "role": r, "target": t, "ct": qi._ct(c)} for s, r, t, c in rows]

    def calls(self, rows):
        res = qi.interpret(rows, lod95_ct=36.0, loq_ct=33.0, pos_min=22.0, pos_max=26.0)
        return res, {s["sample_id"]: s["call"] for s in res["samples"]}

    def test_calls(self):
        res, c = self.calls(self.plate())
        self.assertTrue(res["run_valid"])
        self.assertEqual(c["S1"], "DETECTED_BELOW_LOQ")
        self.assertEqual(c["S2"], "NOT_DETECTED")
        self.assertEqual(c["S3"], "INHIBITED")
        self.assertEqual(c["S4"], "INCONCLUSIVE")

    def test_contaminated_ntc_invalidates_run(self):
        res, c = self.calls(self.plate(ntc_human=30.0))
        self.assertFalse(res["run_valid"])
        self.assertEqual(set(c.values()), {"RUN_INVALID"})

    def test_failed_positive_invalidates_run(self):
        res, _ = self.calls(self.plate(pos=31.0))
        self.assertFalse(res["run_valid"])

    def test_csv_loader(self):
        with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as f:
            w = _csv.writer(f)
            w.writerow(["sample_id", "role", "target", "ct"])
            w.writerow(["S1", "Unknown", "HUMAN", "Undetermined"])
        rows = qi.load(f.name)
        os.unlink(f.name)
        self.assertEqual(rows[0]["role"], "unknown")
        self.assertIsNone(rows[0]["ct"])

    def _load_rows(self, *rows):
        with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as f:
            w = _csv.writer(f)
            w.writerow(["sample_id", "role", "target", "ct"])
            w.writerows(rows)
        try:
            return qi.load(f.name)
        finally:
            os.unlink(f.name)

    def test_bad_ct_text_rejected_not_read_as_no_amplification(self):
        for bad in ("3O.1", "#VALUE!", "nan", "inf", "-1"):
            with self.assertRaises(ValueError, msg=bad):
                self._load_rows(["S1", "unknown", "human", bad])
        rows = self._load_rows(["S1", "unknown", "human", ""], ["S1", "unknown", "ipc", "28.2"])
        self.assertIsNone(rows[0]["ct"])
        self.assertEqual(rows[1]["ct"], 28.2)

    def test_unsupported_role_or_target_rejected(self):
        with self.assertRaises(ValueError):
            self._load_rows(["S1", "unkown", "human", "30"])
        with self.assertRaises(ValueError):
            self._load_rows(["S1", "unknown", "humna", "30"])

    def test_conflicting_roles_for_one_sample_rejected(self):
        rows = self.plate(extra=[("POS1", "unknown", "ipc", 28.0)])
        with self.assertRaises(ValueError):
            self.calls(rows)

    def test_missing_ntc_ipc_invalidates_run(self):
        rows = [r for r in self.plate() if not (r["sample_id"] == "NTC1" and r["target"] == "ipc")]
        res, c = self.calls(rows)
        self.assertFalse(res["run_valid"])
        self.assertTrue(any("IPC" in p for p in res["run_problems"]))
        self.assertEqual(set(c.values()), {"RUN_INVALID"})


class Weather(unittest.TestCase):
    def test_summary_from_saved_response(self):
        data = {"latitude": 50.9, "longitude": -119.9, "elevation": 1250.0, "timezone": "America/Vancouver",
                "hourly": {"time": ["2018-02-17T00:00", "2018-02-17T01:00", "2018-02-17T02:00"],
                           "temperature_2m": [-9.5, -11.2, -10.1], "snowfall": [0.7, 1.4, 0.0],
                           "snow_depth": [1.1, 1.12, 1.12]}}
        rows, s = wh.summarise(data)
        self.assertEqual(len(rows), 3)
        self.assertEqual(s["min_temp_c"], -11.2)
        self.assertEqual(s["min_temp_time"], "2018-02-17T01:00")
        self.assertEqual(s["total_snowfall_cm"], 2.1)


@unittest.skipUnless(HAS_GEO, "numpy/scipy/rasterio not installed")
class SlideRunout(unittest.TestCase):
    def profile(self, slope_len=140.0, angle=35.0, flat=200.0, step=1.0, lat=40.78):
        kx = 111_320 * math.cos(math.radians(lat))
        pts, x, z = [], 0.0, 1000.0
        dx = step * math.cos(math.radians(angle))
        dz = step * math.sin(math.radians(angle))
        for _ in range(int(slope_len / step) + 1):
            pts.append([-76.0 + x / kx, lat, z])
            x += dx
            z -= dz
        z += dz
        for _ in range(int(flat / step)):
            x += step
            pts.append([-76.0 + x / kx, lat, z])
        return pts

    def test_matches_closed_form_speed_at_slope_foot(self):
        a = 9.81 * (math.sin(math.radians(35)) - 0.45 * math.cos(math.radians(35)))
        r = dt.slide_runout(self.profile(flat=0.0), mu=0.45)
        self.assertAlmostEqual(r["max_speed_m_s"], math.sqrt(2 * a * 140.0), delta=0.3)  # ~23.7 m/s

    def test_stops_on_flat_where_energy_runs_out(self):
        a = 9.81 * (math.sin(math.radians(35)) - 0.45 * math.cos(math.radians(35)))
        v2 = 2 * a * 140.0
        expected_flat = v2 / (2 * 9.81 * 0.45)  # ~63.6 m of flat after the slope
        r = dt.slide_runout(self.profile(flat=200.0), mu=0.45)
        self.assertAlmostEqual(r["stopped_after_m"], 140.0 + expected_flat, delta=3.0)

    def test_high_friction_never_starts(self):
        r = dt.slide_runout(self.profile(), mu=0.8)  # tan 35 = 0.70 < 0.8
        self.assertEqual(r["stopped_after_m"], 0.0)


import build_case_registry as reg  # noqa: E402


class Registry(unittest.TestCase):
    def test_parse_gps_forms(self):
        self.assertEqual(reg.parse_gps("50.8782° N, 119.9075° W"), (50.8782, -119.9075))
        self.assertEqual(reg.parse_gps("39.9985° N, -83.0064° W"), (39.9985, -83.0064))  # sign not doubled
        self.assertEqual(reg.parse_gps("50.8831, -119.8842"), (50.8831, -119.8842))
        self.assertEqual(reg.parse_gps((40.7915, -75.9752)), (40.7915, -75.9752))
        self.assertEqual(reg.parse_gps({"lat": 1.5, "lon": 2.5}), (1.5, 2.5))
        self.assertIsNone(reg.parse_gps("no numbers"))

    def test_case_resolution(self):
        self.assertEqual(reg.norm_case("Target Delta near Sun Peaks"), "SHTUKA-2018-BC")
        self.assertEqual(reg.norm_case("x", "tamaqua_sharp_mountain_target_analysis.csv"), "FARBER-2015-PA")
        self.assertEqual(reg.norm_case("see LINDEMAN-2026-MO"), "LINDEMAN-2026-MO")
        self.assertIsNone(reg.norm_case("Shaffer and Shtuka compared"))  # ambiguous: not guessed

    def test_ingest_keeps_conflicting_versions(self):
        d = tempfile.mkdtemp()
        with open(os.path.join(d, "a.csv"), "w") as f:
            f.write("case_id,latitude,longitude,confidence_score_pct\nX-2020-AA,10.0,20.0,93\n")
        with open(os.path.join(d, "b.json"), "w") as f:
            f.write('{"cases":[{"case_id":"X-2020-AA","gps":"10.5, 20.0","confidence_score":0.5}]}')
        with open(os.path.join(d, "c.py"), "w") as f:
            f.write("R = {'X-2020-AA': {'gps': (10.0, 20.0005), 'depth_m': 1.2}}\nraise SystemExit('never run')\n")
        out = os.path.join(d, "out")
        claims, coords, summary, _ = reg.build([d], out)
        s = summary["X-2020-AA"]
        self.assertEqual(s["coordinate_groups"], 2)  # 10.0 and 10.5 kept apart; c.py joins the first
        self.assertAlmostEqual(s["max_distance_between_groups_km"], 55.6, delta=0.5)
        self.assertEqual(s["confidence_pct_values"], [50.0, 93.0])
        self.assertEqual(s["depth_m_values"], [1.2])
        self.assertTrue(os.path.exists(os.path.join(out, "case_registry.sqlite")))

    def test_nested_json_inherits_parent_case_id(self):
        d = tempfile.mkdtemp()
        with open(os.path.join(d, "targets.json"), "w") as f:
            f.write('{"cases": [{"case_id": "X-2020-AA", "targets": [{"target_id": "T1", "gps": "10.0, 20.0"}]},'
                    ' {"case_id": "Y-2021-BB", "targets": [{"target_id": "T2", "lat": 5.0, "lon": 6.0}]}],'
                    ' "by_case": {"Z-2019-CC": {"sites": [{"latitude": 1.5, "longitude": 2.5}]}}}')
        claims, _, summary, _ = reg.build([d], os.path.join(d, "out"))
        coords = {(c["case_id"], c["value"]) for c in claims if c["field"] == "coordinate"}
        self.assertEqual(coords, {("X-2020-AA", "10.000000,20.000000"), ("Y-2021-BB", "5.000000,6.000000"),
                                  ("Z-2019-CC", "1.500000,2.500000")})

    def test_same_named_files_in_different_folders_keep_distinct_sources(self):
        d1, d2 = tempfile.mkdtemp(), tempfile.mkdtemp()
        for d, lat in ((d1, 10.0), (d2, 30.0)):
            with open(os.path.join(d, "targets.csv"), "w") as f:
                f.write(f"case_id,latitude,longitude\nX-2020-AA,{lat},20.0\n")
        claims, _, summary, _ = reg.build([d1, d2], os.path.join(d1, "out"))
        sources = {c["source"].split(":")[0] for c in claims if c["field"] == "coordinate"}
        self.assertEqual(len(sources), 2)
        self.assertEqual(summary["X-2020-AA"]["files"], 2)


@unittest.skipUnless(HAS_GEO, "numpy/scipy/rasterio not installed")
class Sentinel2Change(unittest.TestCase):
    def test_pond_found_and_sized(self):
        ndwi = np.full((40, 40), -0.4)
        ndwi[10:15, 20:24] = 0.3  # 20 water pixels
        inside = np.ones_like(ndwi, dtype=bool)
        ponds = s2c.find_ponds(ndwi, inside, px_m=10.0)
        self.assertEqual(len(ponds), 1)
        self.assertEqual(ponds[0]["pixels"], 20)
        self.assertEqual(ponds[0]["area_m2"], 2000.0)
        self.assertAlmostEqual(ponds[0]["row"], 12.0)

    def test_pond_outside_radius_ignored(self):
        ndwi = np.full((40, 40), -0.4)
        ndwi[0:3, 0:3] = 0.3
        inside = np.zeros_like(ndwi, dtype=bool)
        inside[10:30, 10:30] = True
        self.assertEqual(s2c.find_ponds(ndwi, inside, px_m=10.0), [])

    def test_loss_judged_against_area_not_raw_drop(self):
        # Whole area browns by 0.10 (senescence); one 3x3 patch drops 0.40.
        rng = np.random.default_rng(0)
        d = -0.10 + rng.normal(0, 0.02, (60, 60))
        d[30:33, 30:33] = -0.40
        inside = np.ones_like(d, dtype=bool)
        clusters, stats = s2c.loss_clusters(d, inside, z_limit=-4.0, min_px=4)
        self.assertAlmostEqual(stats["median_dndvi"], -0.10, places=2)
        self.assertEqual(len(clusters), 1)
        self.assertEqual(clusters[0]["pixels"], 9)
        self.assertLess(clusters[0]["mean_z"], -10)


class RealtimeListener(unittest.TestCase):
    """Runs the webhook server on a free local port; standard library only."""

    def setUp(self):
        import threading
        import realtime_validation_listener as rl
        self.tmp = tempfile.TemporaryDirectory()
        self.db = os.path.join(self.tmp.name, "stage0.db")
        # Original: the gate fell back to the Shaffer logs on its own; it now needs them passed in.
        # self.srv = rl.make_server("127.0.0.1", 0, self.db)
        import stage2_validation_gate as sg
        self.srv = rl.make_server("127.0.0.1", 0, self.db, ground_truth=sg.DEFAULT_VERIFIED_GROUND_TRUTH)
        self.url = f"http://127.0.0.1:{self.srv.server_port}/"
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()

    def tearDown(self):
        self.srv.shutdown()
        self.srv.server_close()
        self.tmp.cleanup()

    def _post(self, body):
        import json
        import urllib.error
        import urllib.request
        req = urllib.request.Request(self.url, data=json.dumps(body).encode(), method="POST",
                                     headers={"Content-Type": "application/json"})
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        try:
            with opener.open(req, timeout=10) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())

    def test_ingest_validate_and_dedupe(self):
        import sqlite3
        rec = {"source_origin": "manual_ingest", "archive_timestamp": "2006-04-02T00:00:00Z",
               "source_identifier": "t-1", "raw_content": "seen near the river on April 2"}
        code, body = self._post([rec])
        self.assertEqual(code, 200)
        self.assertEqual(body["results"][0]["status"], "ingested_and_validated")
        self.assertIn("validation_status", body["results"][0])
        code, body = self._post(rec)
        self.assertEqual(body["results"][0]["status"], "duplicate_skipped")
        with sqlite3.connect(self.db) as c:
            n, unverified = c.execute("SELECT COUNT(*), SUM(verification_status = 'unverified') "
                                      "FROM stage0_historical_records").fetchone()
        self.assertEqual((n, unverified), (1, 0))

    def test_unknown_source_origin_rejected_not_reported_as_duplicate(self):
        rec = {"source_origin": "test", "archive_timestamp": "2006-04-02T00:00:00Z",
               "source_identifier": "t-2", "raw_content": "x"}
        code, body = self._post(rec)
        self.assertEqual(code, 400)
        self.assertIn("source_origin", body["message"])

    def test_collector_raises_on_check_violation_instead_of_duplicate(self):
        # Regression: save_record_to_db used to return False ("duplicate") for
        # any IntegrityError, hiding CHECK-constraint rejections.
        import sqlite3
        import archive_collector_cli as ac
        conn = ac.init_database(os.path.join(self.tmp.name, "direct.db"))
        bad = ac.normalize_record("not_a_source", "2006-04-02T00:00:00Z", "id", "body")
        with self.assertRaises(sqlite3.IntegrityError):
            ac.save_record_to_db(conn, bad)
        good = ac.normalize_record("manual_ingest", "2006-04-02T00:00:00Z", "id", "body")
        self.assertTrue(ac.save_record_to_db(conn, good))
        self.assertFalse(ac.save_record_to_db(conn, dict(good, record_id="other")))
        conn.close()

    def test_missing_fields_rejected_and_nothing_stored(self):
        import sqlite3
        code, body = self._post({"raw_content": "no source"})
        self.assertEqual(code, 400)
        if os.path.exists(self.db):
            with sqlite3.connect(self.db) as c:
                tables = c.execute("SELECT name FROM sqlite_master WHERE name='stage0_historical_records'").fetchall()
                if tables:
                    self.assertEqual(c.execute("SELECT COUNT(*) FROM stage0_historical_records").fetchone()[0], 0)

    def _raw_post(self, body=b"{}", headers=None):
        import http.client
        conn = http.client.HTTPConnection("127.0.0.1", self.srv.server_port, timeout=10)
        conn.putrequest("POST", "/")
        for k, v in (headers or {}).items():
            conn.putheader(k, v)
        conn.endheaders()
        if body:
            conn.send(body)
        r = conn.getresponse()
        out = r.status, r.read()
        conn.close()
        return out

    def test_bad_content_length_is_400_not_traceback(self):
        for cl in ("abc", "-1"):
            code, _ = self._raw_post(b"", {"Content-Length": cl, "Content-Type": "application/json"})
            self.assertEqual(code, 400, cl)

    def test_non_loopback_bind_refused_without_token_and_tls(self):
        import realtime_validation_listener as rl
        with self.assertRaises(ValueError):
            rl.make_server("0.0.0.0", 0, self.db)
        with self.assertRaises(ValueError):
            rl.make_server("0.0.0.0", 0, self.db, token="t")

    def test_token_required_when_set(self):
        import realtime_validation_listener as rl
        self.srv.shutdown()
        self.srv.server_close()
        self.srv = rl.make_server("127.0.0.1", 0, self.db, token="s3cret")
        threading = __import__("threading")
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        body = b'{"raw_content": "x"}'
        code, _ = self._raw_post(body, {"Content-Length": str(len(body))})
        self.assertEqual(code, 401)
        code, _ = self._raw_post(body, {"Content-Length": str(len(body)), "Authorization": "Bearer s3cret"})
        self.assertEqual(code, 400)  # authenticated; rejected only for the missing fields

    def test_second_server_does_not_rewrite_the_first_servers_settings(self):
        import json
        import threading
        import urllib.request
        import realtime_validation_listener as rl
        other_db = os.path.join(self.tmp.name, "other.db")
        other = rl.make_server("127.0.0.1", 0, other_db, token="other-token")
        threading.Thread(target=other.serve_forever, daemon=True).start()
        try:
            opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
            with opener.open(self.url, timeout=10) as r:
                self.assertEqual(json.loads(r.read())["db_path"], self.db)
            rec = {"source_origin": "manual_ingest", "archive_timestamp": "2006-04-02T00:00:00Z",
                   "source_identifier": "t-3", "raw_content": "first server, no token"}
            code, body = self._post(rec)
            self.assertEqual(code, 200)
            self.assertNotEqual(body["results"][0]["validation_status"], "unverified")  # still has its ground truth
            self.assertIsNone(rl.RealtimeWebhookHandler.token)
        finally:
            other.shutdown()
            other.server_close()


class ListenerCli(unittest.TestCase):
    """The listener's command line, with run_listener mocked so no server starts."""

    def setUp(self):
        import realtime_validation_listener as rl
        self.rl = rl
        self.tmp = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.tmp.cleanup()

    def _gt_file(self, text):
        p = os.path.join(self.tmp.name, "gt.json")
        with open(p, "w") as f:
            f.write(text)
        return p

    def _main(self, *argv):
        import contextlib
        import io
        from unittest import mock
        with mock.patch.object(self.rl, "run_listener") as run, contextlib.redirect_stderr(io.StringIO()):
            self.rl.main(list(argv))
        return run

    def test_ground_truth_and_shaffer_default_together_rejected(self):
        p = self._gt_file('{"case_id": "OTHER-CASE"}')
        with self.assertRaises(SystemExit) as cm:
            self._main("--ground-truth", p, "--use-shaffer-default")
        self.assertEqual(cm.exception.code, 2)
        run = self._main("--use-shaffer-default")
        self.assertIs(run.call_args.kwargs["ground_truth"], self.rl.DEFAULT_VERIFIED_GROUND_TRUTH)
        run = self._main("--ground-truth", p)
        self.assertEqual(run.call_args.kwargs["ground_truth"], {"case_id": "OTHER-CASE"})

    def test_ground_truth_that_is_not_an_object_rejected_before_start(self):
        for text in ("[]", '"x"', '{"cleared_sectors": [{"sector_id": "S"}]}', "{not json"):
            with self.assertRaises(SystemExit, msg=text) as cm:
                self._main("--ground-truth", self._gt_file(text))
            self.assertEqual(cm.exception.code, 2, text)
        with self.assertRaises(ValueError):
            self.rl.make_server("127.0.0.1", 0, os.path.join(self.tmp.name, "x.db"), ground_truth=[])
        self.rl.check_ground_truth(self.rl.DEFAULT_VERIFIED_GROUND_TRUTH)


class ServiceUnit(unittest.TestCase):
    def test_database_lives_in_a_state_directory_the_service_user_owns(self):
        unit = {}
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "realtime-listener.service")) as f:
            for line in f:
                if "=" in line and not line.lstrip().startswith("#"):
                    k, v = line.strip().split("=", 1)
                    unit[k] = v
        self.assertIn("StateDirectory", unit)
        db = unit["ExecStart"].split("--db ", 1)[1].split()[0]
        self.assertTrue(db.startswith(f"/var/lib/{unit['StateDirectory']}/"), db)


class ArchiveCollector(unittest.TestCase):
    def setUp(self):
        import archive_collector_cli as ac
        self.ac = ac
        self.tmp = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.tmp.cleanup()

    def test_cdx_row_with_bad_timestamp_skipped_not_stamped_now(self):
        import io
        import json
        from unittest import mock
        rows = [["timestamp", "original", "mimetype", "statuscode", "digest"],
                ["20060402031500", "http://a/", "text/html", "200", "D1"],
                ["garbage", "http://b/", "text/html", "200", "D2"],
                ["", "http://c/", "text/html", "200", "D3"]]
        resp = mock.MagicMock()
        resp.__enter__.return_value = io.BytesIO(json.dumps(rows).encode())
        with mock.patch.object(self.ac.urllib.request, "urlopen", return_value=resp):
            got = self.ac.WaybackCDXCollector().fetch_cdx_index("a/*")
        self.assertEqual([g["archive_timestamp"] for g in got], ["2006-04-02T03:15:00Z"])
        self.assertIsNone(self.ac.WaybackCDXCollector.parse_wayback_timestamp("garbage"))

    def test_nntp_uses_article_date_and_skips_undated(self):
        from types import SimpleNamespace
        from unittest import mock
        arts = {
            "1": [b"From: a@b", b"Date: Sun, 02 Apr 2006 03:15:00 -0400", b"", b"body one"],
            "2": [b"From: a@b", b"", b"Date: in the body only"],
        }

        class FakeNNTP:
            def __init__(self, *a, **k):
                pass

            def group(self, name):
                return "211", 2, 1, 2, name

            def article(self, n):
                return "220", SimpleNamespace(lines=arts[n], message_id=f"<{n}@x>")

            def quit(self):
                pass

        with mock.patch.object(self.ac, "nntplib", SimpleNamespace(NNTP=FakeNNTP)):
            got = self.ac.UsenetNNTPCollector("news.example").fetch_articles("alt.test", 2)
        self.assertEqual([(g["source_identifier"], g["archive_timestamp"]) for g in got],
                         [("<1@x>", "2006-04-02T07:15:00Z")])

    def _db(self):
        return self.ac.init_database(os.path.join(self.tmp.name, "a.db"))

    def _file(self, name, text):
        p = os.path.join(self.tmp.name, name)
        with open(p, "w") as f:
            f.write(text)
        return p

    def test_ingest_file_reads_pretty_json_array_and_jsonl(self):
        conn = self._db()
        arr = self._file("a.json", '[\n  {"raw_content": "one", "archive_timestamp": "2006-04-02T00:00:00Z"},\n'
                                   '  {"raw_content": "two", "archive_timestamp": "2006-04-03T00:00:00Z"}\n]\n')
        obj = self._file("b.json", '{\n  "raw_content": "three",\n  "archive_timestamp": "2006-04-04T00:00:00Z"\n}\n')
        jl = self._file("c.jsonl", '{"raw_content": "four", "archive_timestamp": "2006-04-05T00:00:00Z"}\n\n'
                                   '{"raw_content": "five", "archive_timestamp": "2006-04-06T00:00:00Z"}\n')
        self.assertEqual(self.ac.ingest_file(conn, arr, "forum_archive")["saved"], 2)
        self.assertEqual(self.ac.ingest_file(conn, obj, "forum_archive")["saved"], 1)
        self.assertEqual(self.ac.ingest_file(conn, jl, "forum_archive")["saved"], 2)
        conn.close()

    def test_ingest_file_failures_counted_and_exit_nonzero(self):
        from unittest import mock
        conn = self._db()
        p = self._file("bad.jsonl", '{"raw_content": "ok", "archive_timestamp": "2006-04-02T00:00:00Z"}\n'
                                    '{"raw_content": "x", "source_origin": "not_a_source"}\n')
        counts = self.ac.ingest_file(conn, p, "forum_archive")
        conn.close()
        self.assertEqual((counts["saved"], counts["failed"]), (1, 1))
        argv = ["archive_collector_cli.py", "ingest-file", "--file", p, "--db", os.path.join(self.tmp.name, "m.db")]
        with mock.patch.object(sys, "argv", argv), self.assertRaises(SystemExit) as cm:
            self.ac.main()
        self.assertEqual(cm.exception.code, 1)

    def test_ingest_file_missing_path_counted_as_failed(self):
        from unittest import mock
        conn = self._db()
        missing = os.path.join(self.tmp.name, "nope.jsonl")
        self.assertEqual(self.ac.ingest_file(conn, missing, "forum_archive"),
                         {"saved": 0, "duplicate": 0, "failed": 1})
        conn.close()
        argv = ["archive_collector_cli.py", "ingest-file", "--file", missing,
                "--db", os.path.join(self.tmp.name, "m.db")]
        with mock.patch.object(sys, "argv", argv), self.assertRaises(SystemExit) as cm:
            self.ac.main()
        self.assertEqual(cm.exception.code, 1)

    def test_ingest_file_rejects_records_without_source_timestamp(self):
        conn = self._db()
        p = self._file("undated.jsonl", '{"raw_content": "dated", "archive_timestamp": "2006-04-02T00:00:00Z"}\n'
                                        '{"raw_content": "undated"}\n'
                                        '{"raw_content": "blank", "archive_timestamp": "  "}\n')
        counts = self.ac.ingest_file(conn, p, "forum_archive")
        self.assertEqual((counts["saved"], counts["failed"]), (1, 2))
        stored = [r[0] for r in conn.execute("SELECT raw_content FROM stage0_historical_records")]
        conn.close()
        self.assertEqual(stored, ["dated"])


class Stage2Gate(unittest.TestCase):
    def setUp(self):
        import archive_collector_cli as ac
        import stage2_validation_gate as sg
        self.sg = sg
        self.tmp = tempfile.TemporaryDirectory()
        self.db = os.path.join(self.tmp.name, "s0.db")
        self.conn = ac.init_database(self.db)
        self.ac = ac

    def tearDown(self):
        self.conn.close()
        self.tmp.cleanup()

    def _add(self, text):
        rec = self.ac.normalize_record("manual_ingest", "2006-04-02T00:00:00Z", "t", text)
        self.ac.save_record_to_db(self.conn, rec)
        return rec["record_id"]

    def _run(self, ground_truth):
        stats = self.sg.Stage2ValidationGate(self.db, ground_truth).validate_records()
        return {d["record_id"]: d["assigned_status"] for d in stats["details"]}, stats

    def test_without_ground_truth_gate_abstains(self):
        rid = self._add("he was buried in dirt near the gateway")
        got, stats = self._run(None)
        self.assertEqual(got[rid], "unverified")
        self.assertEqual(stats["abstained"], 1)
        import sqlite3
        with sqlite3.connect(self.db) as c:
            self.assertEqual(c.execute("SELECT verification_status FROM stage0_historical_records").fetchone()[0],
                             "unverified")

    def test_negated_or_search_report_mention_is_not_debunked(self):
        gt = self.sg.DEFAULT_VERIFIED_GROUND_TRUTH
        neg = self._add("Police searched the dirt pile and found nothing.")
        pos = self._add("I think he is buried in dirt behind the gateway.")
        got, _ = self._run(gt)
        self.assertEqual(got[neg], "flagged_speculative")
        self.assertEqual(got[pos], "debunked_by_official_log")

    def test_negation_is_scoped_to_the_claim_not_the_whole_sentence(self):
        gt = self.sg.DEFAULT_VERIFIED_GROUND_TRUTH
        near = self._add("He is buried not far from the dirt pile.")
        contrast = self._add("The police searched the bar but he is buried in dirt by the gateway.")
        searched = self._add("Police searched the dirt pile and found nothing.")
        comma = self._add("He was not, they say, buried in dirt.")
        got, _ = self._run(gt)
        self.assertEqual(got[near], "debunked_by_official_log")
        self.assertEqual(got[contrast], "debunked_by_official_log")
        self.assertEqual(got[searched], "flagged_speculative")
        self.assertEqual(got[comma], "flagged_speculative")

    def test_gap_uses_its_own_keywords_and_needs_affirmative_claim(self):
        gt = self.sg.DEFAULT_VERIFIED_GROUND_TRUTH
        exit_claim = self._add("He walked out the service exit toward the construction area.")
        blind = self._add("There is a blind spot on the camera at the parking garage.")
        denied = self._add("He did not use the service door.")
        got, _ = self._run(gt)
        self.assertEqual(got[exit_claim], "corroborated_by_log")
        self.assertEqual(got[blind], "flagged_speculative")
        self.assertEqual(got[denied], "flagged_speculative")

    def test_listener_without_ground_truth_leaves_records_unverified(self):
        import realtime_validation_listener as rl
        rec = {"source_origin": "manual_ingest", "archive_timestamp": "2006-04-02T00:00:00Z",
               "source_identifier": "t-9", "raw_content": "buried in dirt pile"}
        results, stats = rl.ingest_records(os.path.join(self.tmp.name, "l.db"), [rec])
        self.assertEqual(results[0]["validation_status"], "unverified")
        self.assertEqual(stats["abstained"], 1)

    def test_audit_report_without_ground_truth_has_null_case_id(self):
        import json
        self._add("seen near the river")
        gate = self.sg.Stage2ValidationGate(self.db, None)
        gate.validate_records()
        out = os.path.join(self.tmp.name, "audit.json")
        gate.export_audit_report(out)
        with open(out) as f:
            report = json.load(f)
        self.assertIsNone(report["ground_truth_case_id"])
        self.assertEqual(report["status_breakdown"], {"unverified": 1})

    def test_listener_abstention_not_reported_as_validated(self):
        import realtime_validation_listener as rl
        rec = {"source_origin": "manual_ingest", "archive_timestamp": "2006-04-02T00:00:00Z",
               "source_identifier": "t-10", "raw_content": "seen near the river"}
        results, _ = rl.ingest_records(os.path.join(self.tmp.name, "a.db"), [rec])
        self.assertEqual(results[0]["status"], "ingested_not_validated")
        results, _ = rl.ingest_records(os.path.join(self.tmp.name, "b.db"), [rec],
                                       self.sg.DEFAULT_VERIFIED_GROUND_TRUTH)
        self.assertEqual(results[0]["status"], "ingested_and_validated")


if __name__ == "__main__":
    unittest.main()
