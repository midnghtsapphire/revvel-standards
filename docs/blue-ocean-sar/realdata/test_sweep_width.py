"""Tests for sweep_width.py (SYSTEM_REVIEW R3 + B3)."""

import csv
import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import optimal_search as os_  # noqa: E402
import search_theory as st  # noqa: E402
import sweep_width as sw  # noqa: E402

DOC = sw.load_tables()

# Two square segments (lon/lat degrees) and a ROW row.
SQ_A = [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], [0.0, 0.0]]
SQ_B = [[2.0, 0.0], [3.0, 0.0], [3.0, 1.0], [2.0, 1.0], [2.0, 0.0]]


def write_csv(d, name, header, rows):
    p = os.path.join(d, name)
    with open(p, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    return p


def write_polys(d, polys):
    p = os.path.join(d, "segs.geojson")
    feats = [{"type": "Feature", "properties": {"name": n}, "geometry": g} for n, g in polys.items()]
    with open(p, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": feats}, f)
    return p


def run_cli(args):
    err, out = io.StringIO(), io.StringIO()
    with redirect_stderr(err), redirect_stdout(out):
        code = sw.main(args)
    return code, out.getvalue(), err.getvalue()


class TableProvenance(unittest.TestCase):
    def test_every_value_has_a_source_or_is_null(self):
        for e in DOC["entries"]:
            if e["w_m"] is None:
                self.assertIsNone(e["source"])
                self.assertEqual(e["status"], "needs field calibration")
            else:
                self.assertIn(e["source"], DOC["sources"])
                self.assertTrue(e["verification"])
                self.assertGreater(e["w_m"], 0)

    def test_full_grid_present(self):
        ax = DOC["axes"]
        n = len(ax["resource"]) * len(ax["target"]) * len(ax["vegetation"]) * len(ax["visibility"])
        self.assertEqual(len(DOC["entries"]), n)
        for r in ("ground_searcher", "hasty_team", "airscent_dog", "trailing_dog", "uav_visual",
                  "uav_thermal", "helicopter"):
            self.assertIn(r, ax["resource"])
        for t in ("responsive_adult", "unresponsive_adult", "child", "clothing_clue"):
            self.assertIn(t, ax["target"])

    def test_sourced_values_as_published(self):
        w, src, _ = sw.table_width(DOC, "ground_searcher", "unresponsive_adult", "deciduous_leaf_off", "high")
        self.assertEqual((w, src), (142.0, "koester2004"))
        w, src, _ = sw.table_width(DOC, "ground_searcher", "unresponsive_adult", "forest_dense", "low")
        self.assertEqual((w, src), (17.0, "koester2004"))
        self.assertEqual(len(sw.sourced_summary(DOC)["sourced_entries"]), 2)

    def test_no_invented_values_for_dogs_and_aircraft(self):
        for e in DOC["entries"]:
            if e["resource"] != "ground_searcher":
                self.assertIsNone(e["w_m"], e)
        for s in DOC["speeds_kmh"].values():
            self.assertIsNone(s["speed_kmh"])

    def test_leads_are_never_used(self):
        for lead in DOC["leads"]:
            self.assertFalse(lead["used"])
        used = {e["w_m"] for e in DOC["entries"] if e["w_m"] is not None}
        self.assertFalse(used & {106, 95, 64, 22})

    def test_validator_rejects_unsourced_value(self):
        bad = json.loads(json.dumps(DOC))
        e = next(x for x in bad["entries"] if x["w_m"] is None)
        e.update(w_m=50.0, status="sourced", verification="secondary")
        with self.assertRaises(ValueError):
            sw.validate_tables(bad)
        e.update(source="made_up_2026")
        with self.assertRaises(ValueError):
            sw.validate_tables(bad)

    def test_validator_rejects_source_on_null(self):
        bad = json.loads(json.dumps(DOC))
        next(x for x in bad["entries"] if x["w_m"] is None)["source"] = "koester2004"
        with self.assertRaises(ValueError):
            sw.validate_tables(bad)

    def test_range_factors_are_koester_2014(self):
        f = DOC["range_to_sweep_width"]["factors"]
        self.assertEqual({k: v["factor"] for k, v in f.items()}, {"high": 1.8, "medium": 1.6, "low": 1.1})
        self.assertTrue(all(v["source"] == "koester2014" for v in f.values()))


class RangeTrial(unittest.TestCase):
    def test_visibility_factor(self):
        w, how = sw.sweep_width_from_range(50.0, "high", doc=DOC)
        self.assertAlmostEqual(w, 90.0)
        self.assertIn("koester2014", how)
        self.assertAlmostEqual(sw.sweep_width_from_range(50.0, "low", doc=DOC)[0], 55.0)

    def test_explicit_factor_matches_search_theory(self):
        w, _ = sw.sweep_width_from_range(50.0, factor=2.0)
        self.assertAlmostEqual(w / 1000.0, st.sweep_width_from_add(0.05, 2.0))

    def test_needs_factor_or_visibility(self):
        with self.assertRaises(ValueError):
            sw.sweep_width_from_range(50.0, doc=DOC)
        with self.assertRaises(ValueError):
            sw.sweep_width_from_range(0, "high", doc=DOC)
        with self.assertRaises(ValueError):
            sw.sweep_width_from_range(10, factor=-1)

    def test_calibration_file(self):
        with tempfile.TemporaryDirectory() as d:
            p = write_csv(d, "cal.csv", ["resource", "target", "vegetation", "visibility", "w_m", "range_m",
                                         "factor", "speed_kmh", "source"],
                          [("ground_searcher", "child", "forest_moderate", "medium", "", "40", "", "1.5",
                            "AMDR trial, County SAR, 2026-09-12"),
                           ("airscent_dog", "unresponsive_adult", "forest_moderate", "", "", "30", "2",
                            "", "ADD trial, K9 unit, 2026-08-01"),
                           ("uav_thermal", "unresponsive_adult", "open", "", "120", "", "", "30",
                            "lateral-range trial, 2026-07-04")])
            cal = sw.read_calibration(p, DOC)
        self.assertAlmostEqual(cal[0]["w_m"], 64.0)  # 1.6 x 40
        self.assertAlmostEqual(cal[1]["w_m"], 60.0)  # 2 x 30
        self.assertEqual(cal[2]["w_m"], 120.0)
        self.assertIn("AMDR trial", cal[0]["source"])
        hit = sw.match_calibration(cal, "airscent_dog", "unresponsive_adult", "forest_moderate", "low")
        self.assertIs(hit, cal[1])  # blank visibility matches any

    def test_calibration_requires_source(self):
        with tempfile.TemporaryDirectory() as d:
            p = write_csv(d, "cal.csv", ["resource", "target", "vegetation", "visibility", "w_m", "source"],
                          [("ground_searcher", "child", "open", "high", "80", "")])
            with self.assertRaises(ValueError):
                sw.read_calibration(p, DOC)


class CanopyModel(unittest.TestCase):
    def test_bounded(self):
        for c in (0.0, 0.1, 0.5, 0.9, 1.0):
            for k in (0.5, 1.0, 2.0, 5.0):
                f = sw.canopy_factor(c, k)
                self.assertGreaterEqual(f, 0.0)
                self.assertLessEqual(f, 1.0)
        self.assertEqual(sw.canopy_scaled_width(100.0, 0.0, 1.0), 100.0)
        self.assertEqual(sw.canopy_scaled_width(100.0, 1.0, 1.0), 0.0)

    def test_monotonic_in_cover_and_k(self):
        covers = [i / 20 for i in range(21)]
        for k in (0.5, 1.0, 1.5, 3.0):
            ws = [sw.canopy_scaled_width(100.0, c, k) for c in covers]
            self.assertTrue(all(a >= b for a, b in zip(ws, ws[1:])), k)
        ks = [0.5, 1.0, 2.0, 4.0]
        ws = [sw.canopy_factor(0.4, k) for k in ks]
        self.assertTrue(all(a >= b for a, b in zip(ws, ws[1:])))

    def test_view_zenith(self):
        self.assertAlmostEqual(sw.k_from_view_zenith(0), 1.0)
        self.assertAlmostEqual(sw.k_from_view_zenith(60), 2.0)
        with self.assertRaises(ValueError):
            sw.k_from_view_zenith(90)

    def test_rejects_bad_inputs(self):
        for c in (-0.1, 1.1, float("nan")):
            with self.assertRaises(ValueError):
                sw.canopy_factor(c, 1.0)
        for k in (0, -1, float("inf")):
            with self.assertRaises(ValueError):
                sw.canopy_factor(0.5, k)


class GediAggregation(unittest.TestCase):
    POLYS = {"A": {"type": "Polygon", "coordinates": [SQ_A]},
             "B": {"type": "MultiPolygon", "coordinates": [[SQ_B]]},
             "H": {"type": "Polygon",
                   "coordinates": [[[10, 0], [14, 0], [14, 4], [10, 4], [10, 0]],
                                   [[11, 1], [13, 1], [13, 3], [11, 3], [11, 1]]]}}

    def test_point_in_polygon_with_hole(self):
        g = self.POLYS["H"]
        self.assertTrue(sw.point_in_geometry(10.5, 0.5, g))
        self.assertFalse(sw.point_in_geometry(12.0, 2.0, g))  # in the hole
        self.assertFalse(sw.point_in_geometry(15.0, 2.0, g))

    def test_mean_per_polygon(self):
        shots = [(0.5, 0.5, 0.2), (0.2, 0.8, 0.6), (0.5, 2.5, 0.9), (0.5, 5.0, 0.1),  # last: outside all
                 (2.0, 12.0, 0.99), (0.5, 10.5, 0.3)]  # in H's hole, in H
        agg = sw.aggregate_shots(shots, self.POLYS)
        self.assertAlmostEqual(agg["A"][0], 0.4)
        self.assertEqual(agg["A"][1], 2)
        self.assertEqual(agg["B"], (0.9, 1))
        self.assertEqual(agg["H"], (0.3, 1))

    def test_empty_polygon_is_none(self):
        self.assertEqual(sw.aggregate_shots([], self.POLYS)["A"], (None, 0))

    def test_gedi_csv_quality_and_fill(self):
        with tempfile.TemporaryDirectory() as d:
            p = write_csv(d, "g.csv", ["lat_lowestmode", "lon_lowestmode", "cover", "l2b_quality_flag"],
                          [(0.5, 0.5, 0.3, 1), (0.5, 0.6, 0.9, 0), (0.5, 0.7, -9999, 1)])
            self.assertEqual(sw.read_gedi_csv(p), [(0.5, 0.5, 0.3)])
            bad = write_csv(d, "b.csv", ["lat", "lon", "cover"], [(0.5, 0.5, 45)])
            with self.assertRaises(ValueError):
                sw.read_gedi_csv(bad)

    def test_shots_from_h5_layout(self):
        class Ds:
            def __init__(self, v):
                self.v = v

            def __getitem__(self, _):
                return self.v

        beam = {"geolocation": {"lat_lowestmode": Ds([0.5, 0.6]), "lon_lowestmode": Ds([0.5, 0.6])},
                "cover": Ds([0.25, 0.75]), "l2b_quality_flag": Ds([1, 0])}
        shots = sw.shots_from_h5({"BEAM0000": beam, "METADATA": {}})
        self.assertEqual(shots, [(0.5, 0.5, 0.25)])

    def test_h5_without_h5py_is_a_clear_error(self):
        try:
            import h5py  # noqa: F401
            self.skipTest("h5py installed")
        except ImportError:
            with self.assertRaisesRegex(ValueError, "h5py"):
                sw.read_gedi_h5(["x.h5"])


class RasterCover(unittest.TestCase):
    def test_raster_mean(self):
        try:
            import numpy as np
            import rasterio
            from rasterio.transform import from_origin
        except ImportError:
            self.skipTest("rasterio not importable")
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "cc.tif")
            arr = np.zeros((4, 8), dtype="float32")
            arr[:, :4] = 50.0   # x 0..2 deg -> segment A covers x 0..1
            arr[:, 4:] = 80.0
            with rasterio.open(p, "w", driver="GTiff", width=8, height=4, count=1, dtype="float32",
                               crs="EPSG:4326", transform=from_origin(0, 1, 0.5, 0.25)) as ds:
                ds.write(arr, 1)
            polys = {"A": {"type": "Polygon", "coordinates": [SQ_A]},
                     "B": {"type": "Polygon", "coordinates": [SQ_B]}}
            out = sw.raster_cover(p, polys, percent=True)
            self.assertAlmostEqual(out["A"][0], 0.5)
            self.assertAlmostEqual(out["B"][0], 0.8)
            with self.assertRaises(ValueError):
                sw.raster_cover(p, polys, percent=False)


class SegmentResolution(unittest.TestCase):
    def test_air_canopy_scaled_from_calibrated_open_w(self):
        cal = [{"resource": "uav_thermal", "target": "unresponsive_adult", "vegetation": "open",
                "visibility": None, "w_m": 120.0, "method": "calibration: measured W", "source": "trial X",
                "speed_kmh": 30.0}]
        out = sw.resolve_segment({"name": "A", "vegetation": "forest_moderate"}, DOC, cal,
                                 {"resource": "uav_thermal", "target": "unresponsive_adult"},
                                 {"cover": 0.5, "source": "GEDI", "n": 4}, k=1.0)
        self.assertAlmostEqual(out["sweep_width_km"], 0.06)
        self.assertEqual(out["sweep_width_status"], "canopy-scaled")
        self.assertEqual(out["sweep_width_source"], "trial X")
        self.assertEqual(out["canopy_n"], 4)
        self.assertEqual(out["speed_kmh"], 30.0)  # aircraft speed does not depend on canopy
        self.assertEqual(out["speed_source"], "trial X")

    def test_in_vegetation_calibration_is_not_double_scaled(self):
        cal = [{"resource": "uav_visual", "target": "child", "vegetation": "forest_dense", "visibility": None,
                "w_m": 30.0, "method": "calibration: measured W", "source": "trial Y", "speed_kmh": None}]
        out = sw.resolve_segment({"name": "A", "vegetation": "forest_dense"}, DOC, cal,
                                 {"resource": "uav_visual", "target": "child"},
                                 {"cover": 0.9, "source": "GEDI", "n": 3})
        self.assertAlmostEqual(out["sweep_width_km"], 0.03)
        self.assertEqual(out["sweep_width_status"], "calibrated")

    def test_ground_ignores_canopy(self):
        out = sw.resolve_segment({"name": "A", "vegetation": "deciduous_leaf_off", "visibility": "high"}, DOC,
                                 None, {"resource": "ground_searcher", "target": "unresponsive_adult"},
                                 {"cover": 0.8, "source": "GEDI", "n": 2})
        self.assertAlmostEqual(out["sweep_width_km"], 0.142)
        self.assertIn("not applied", out["canopy_source"])
        self.assertIn("koester2004", out["sweep_width_source"])

    def test_null_stays_null(self):
        out = sw.resolve_segment({"name": "A", "vegetation": "forest_moderate", "visibility": "high"}, DOC,
                                 None, {"resource": "airscent_dog", "target": "child"})
        self.assertEqual(out["sweep_width_km"], "")
        self.assertEqual(out["sweep_width_status"], "needs field calibration")

    def test_unknown_class_rejected(self):
        with self.assertRaises(ValueError):
            sw.resolve_segment({"name": "A", "resource": "satellite"}, DOC)


class CliAndIntegration(unittest.TestCase):
    HEADER = ["name", "area_km2", "poa", "vegetation", "visibility"]
    ROWS = [("A", 2.0, 0.5, "forest_moderate", "high"), ("B", 1.0, 0.3, "open", "high"), ("ROW", "", 0.2, "", "")]

    def setup_files(self, d):
        seg = write_csv(d, "segs.csv", self.HEADER, self.ROWS)
        cal = write_csv(d, "cal.csv", ["resource", "target", "vegetation", "visibility", "range_m", "speed_kmh",
                                       "source"],
                        [("uav_thermal", "unresponsive_adult", "open", "high", "50", "20",
                          "AMDR trial, test fixture")])
        polys = write_polys(d, {"A": {"type": "Polygon", "coordinates": [SQ_A]},
                                "B": {"type": "Polygon", "coordinates": [SQ_B]}})
        gedi = write_csv(d, "gedi.csv", ["lat", "lon", "cover"], [(0.5, 0.5, 0.4), (0.6, 0.4, 0.6)])
        return seg, cal, polys, gedi

    def test_end_to_end_read_by_search_theory_and_optimal_search(self):
        with tempfile.TemporaryDirectory() as d:
            seg, cal, polys, gedi = self.setup_files(d)
            out = os.path.join(d, "out.csv")
            code, _, err = run_cli([seg, "--out", out, "--calibration", cal, "--polygons", polys,
                                    "--gedi-csv", gedi, "--resource", "uav_thermal",
                                    "--target", "unresponsive_adult"])
            self.assertEqual(code, 0, err)
            segs = st.read_segments(out)
            by = {s["name"]: s for s in segs}
            # open W = 1.8 x 50 m = 90 m; A: cover 0.5 -> 45 m; B: open, cover 0 -> 90 m
            self.assertAlmostEqual(by["A"]["sweep_width_km"], 0.045)
            self.assertAlmostEqual(by["B"]["sweep_width_km"], 0.090)
            self.assertEqual(by["A"]["speed_kmh"], 20.0)
            st.run(segs)
            res = os_.run(segs, 2.0, 1, "hours")
            self.assertGreater(res["optimal"]["total_pos"], 0)
            with open(out, newline="", encoding="utf-8") as f:
                rows = {r["name"]: r for r in csv.DictReader(f)}
            self.assertIn("GEDI CSV", rows["A"]["canopy_source"])
            self.assertEqual(rows["A"]["canopy_n"], "2")
            self.assertIn("AMDR trial", rows["A"]["sweep_width_source"])
            self.assertEqual(rows["ROW"]["sweep_width_km"], "")

    def test_exit_3_when_w_missing(self):
        with tempfile.TemporaryDirectory() as d:
            seg, _, _, _ = self.setup_files(d)
            out = os.path.join(d, "out.csv")
            code, _, err = run_cli([seg, "--out", out, "--resource", "helicopter", "--target", "child"])
            self.assertEqual(code, 3)
            self.assertTrue(os.path.exists(out))
            self.assertIn("no sweep width for A", err)
            code, _, _ = run_cli([seg, "--out", out, "--resource", "helicopter", "--target", "child",
                                  "--allow-missing"])
            self.assertEqual(code, 0)

    def test_exit_2_on_bad_input(self):
        with tempfile.TemporaryDirectory() as d:
            seg, cal, polys, gedi = self.setup_files(d)
            out = os.path.join(d, "out.csv")
            bad_gedi = write_csv(d, "bad.csv", ["lat", "lon", "cover"], [(0.5, 0.5, "x")])
            no_name = write_csv(d, "noname.csv", ["area_km2", "poa"], [(1, 1)])
            bad_cover = write_csv(d, "bc.csv", ["name", "area_km2", "poa", "canopy_cover"], [("A", 1, 1, 1.5)])
            cases = [
                [os.path.join(d, "missing.csv"), "--out", out],
                [seg, "--out", out, "--resource", "satellite"],
                [seg, "--out", out, "--gedi-csv", gedi],  # no polygons
                [seg, "--out", out, "--polygons", polys, "--gedi-csv", bad_gedi],
                [seg, "--out", out, "--canopy-k", "-1"],
                [seg, "--out", out, "--view-zenith-deg", "95"],
                [no_name, "--out", out],
                [bad_cover, "--out", out],
                [seg, "--out", out, "--speed-kmh", "0"],
                [seg],
            ]
            for args in cases:
                code, _, err = run_cli(args)
                self.assertEqual(code, 2, (args, err))
                self.assertIn("error:", err)

    def test_list_sourced(self):
        code, out, _ = run_cli(["--list-sourced"])
        self.assertEqual(code, 0)
        doc = json.loads(out)
        self.assertEqual(sorted(e["w_m"] for e in doc["sourced_entries"]), [17.0, 142.0])


if __name__ == "__main__":
    unittest.main()
