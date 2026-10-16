"""Tests for lost_person_sim.py (agent-based lost-person probability map).

The simulation tests need numpy, scipy and rasterio and are skipped when any
is missing. They use the flat synthetic grid (synthetic_flat_terrain), which
exists for tests only, or a small GeoTIFF DEM written to a temp directory for
the CLI. Grids and agent counts are small so the suite runs in seconds.
"""

import importlib.util
import json
import math
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import lost_person_sim as sim  # noqa: E402
import search_theory  # noqa: E402

HAS_DEPS = all(importlib.util.find_spec(m) is not None for m in ("numpy", "scipy", "rasterio"))
NEEDS = "needs numpy, scipy and rasterio"

LAT, LON = 54.5, -3.1

if HAS_DEPS:
    import numpy as np
    import rasterio
    from rasterio.warp import transform as warp_transform


def _params(**kw):
    base = dict(n_agents=600, seed=3, max_walk_hours=3.0)
    base.update(kw)
    return sim.SimParams(**base)


def _xy(terrain, r, c):
    t = terrain.transform
    return t.c + c * t.a, t.f + r * t.e


def _rect_lonlat(terrain, r0, r1, c0, c1):
    """GeoJSON Polygon (WGS84) covering grid rows r0..r1, cols c0..c1 (cell edges)."""
    corners = [(c0, r0), (c1, r0), (c1, r1), (c0, r1), (c0, r0)]
    xs, ys = zip(*(_xy(terrain, r, c) for c, r in corners))
    lons, lats = warp_transform(terrain.crs, "EPSG:4326", list(xs), list(ys))
    return {"type": "Polygon", "coordinates": [[[lo, la] for lo, la in zip(lons, lats)]]}


def _line_lonlat(terrain, pts_rc):
    xs, ys = zip(*(_xy(terrain, r, c) for r, c in pts_rc))
    lons, lats = warp_transform(terrain.crs, "EPSG:4326", list(xs), list(ys))
    return {"type": "LineString", "coordinates": [[lo, la] for lo, la in zip(lons, lats)]}


def _fc(geoms_props):
    return {"type": "FeatureCollection",
            "features": [{"type": "Feature", "geometry": g, "properties": p} for g, p in geoms_props]}


def _dump(path, obj):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(obj, fh)
    return path


class ToblerTest(unittest.TestCase):
    """Pure math: no dependencies."""

    def test_peak_at_minus_2_86_degrees(self):
        angles = [i / 1000.0 for i in range(-20000, 20001)]  # -20..20 degrees
        speeds = [sim.tobler_kmh(math.tan(math.radians(a))) for a in angles]
        best = angles[speeds.index(max(speeds))]
        self.assertAlmostEqual(best, -2.862, delta=0.01)
        self.assertAlmostEqual(max(speeds), 6.0, places=3)
        self.assertEqual(sim.tobler_kmh(-0.05), 6.0)  # exact peak at tan(theta) = -0.05

    def test_flat_and_steep(self):
        self.assertAlmostEqual(sim.tobler_kmh(0.0), 6 * math.exp(-0.175), places=9)  # ~5.04 km/h on the flat
        self.assertLess(sim.tobler_kmh(1.0), 0.2)  # 45 degrees uphill is slow
        self.assertGreater(sim.tobler_kmh(-0.05), sim.tobler_kmh(0.05))


class CliArgumentTest(unittest.TestCase):
    """Argument checks run before any dependency is needed."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.out = os.path.join(self.tmp.name, "out")

    def test_unknown_category_exits_2(self):
        rc = sim.main(["simulate", "--lat", "54.5", "--lon", "-3.1", "--category", "astronauts", "--hours", "5",
                       "--dem", "x.tif", "--out", self.out])
        self.assertEqual(rc, 2)

    def test_missing_dem_argument_exits_2(self):
        rc = sim.main(["simulate", "--lat", "54.5", "--lon", "-3.1", "--category", "hikers", "--hours", "5",
                       "--out", self.out])
        self.assertEqual(rc, 2)

    def test_missing_dem_file_exits_2(self):
        rc = sim.main(["simulate", "--lat", "54.5", "--lon", "-3.1", "--category", "hikers", "--hours", "5",
                       "--dem", os.path.join(self.tmp.name, "nope.tif"), "--out", self.out])
        self.assertEqual(rc, 2)
        self.assertFalse(os.path.exists(self.out))

    def test_no_subcommand_or_bad_flag_exits_2(self):
        self.assertEqual(sim.main([]), 2)
        self.assertEqual(sim.main(["simulate", "--bogus"]), 2)

    def test_bad_weights(self):
        with self.assertRaises(ValueError):
            sim.parse_weights("teleport=1")
        w = sim.parse_weights("random_walk=1,route_following=0,direction_sampling=0,downhill=0,stay_put=0")
        self.assertEqual(w["random_walk"], 1.0)


@unittest.skipUnless(HAS_DEPS, NEEDS)
class MovementTest(unittest.TestCase):
    def test_agents_never_cross_a_barrier(self):
        t = sim.synthetic_flat_terrain(LAT, LON, 30, 25.0)
        r0, c0 = t.ipp_rc
        wall = int(c0) + 6
        t.barrier[:, wall] = True  # a full-height wall one cell thick, 6 cells east of the IPP
        # and a diagonal (8-connected only) barrier line to the west
        for i in range(t.shape[0]):
            j = int(c0) - 8 - (i % 2)
            t.barrier[i, j] = True
        p = _params(weights={"random_walk": 1.0}, n_agents=800, max_walk_hours=4.0)
        res = sim.simulate(t, p)
        cols = res.ck_pos[..., 1]
        rows = res.ck_pos[..., 0]
        self.assertTrue((cols < wall).all(), "an agent crossed the wall")
        self.assertTrue((cols >= int(c0) - 8).all(), "an agent crossed the diagonal barrier")
        self.assertFalse(t.barrier[rows.astype(int), cols.astype(int)].any())
        self.assertGreater(res.blocked_steps, 0)  # the wall was actually reached
        rr, cc, _ = sim.final_positions(res, 5.0, 8.0)
        prob = sim.probability_raster(t, rr, cc, kernel_sigma_m=100.0)
        self.assertEqual(prob[:, wall:].sum(), 0.0)  # no smoothing leak across the wall
        self.assertAlmostEqual(prob.sum(), 1.0, places=12)

    def test_downhill_walkers_go_downhill(self):
        t = sim.synthetic_flat_terrain(LAT, LON, 40, 25.0, slope_east=0.1)  # z rises to the east
        res = sim.simulate(t, _params(weights={"downhill": 1.0}, max_walk_hours=1.0))
        _, c0 = t.ipp_rc
        cols = res.ck_pos[-1, :, 1]
        self.assertLess(float(np.mean(cols)), c0 - 10)

    def test_route_followers_stay_near_the_trail(self):
        t = sim.synthetic_flat_terrain(LAT, LON, 40, 25.0)
        r0, c0 = t.ipp_rc
        trail_row = int(r0) + 3
        with tempfile.TemporaryDirectory() as d:
            path = _dump(os.path.join(d, "trail.geojson"),
                         _fc([(_line_lonlat(t, [(trail_row + 0.5, 1.0), (trail_row + 0.5, t.shape[1] - 1.0)]), {})]))
            sim.add_inputs(t, trails=[path])
        self.assertTrue(t.paths[trail_row, 5:-5].all())
        res = sim.simulate(t, _params(weights={"route_following": 1.0}, max_walk_hours=0.5))
        rows = res.ck_pos[-1, :, 0]
        self.assertGreater(float(np.mean(np.abs(rows - (trail_row + 0.5)) <= 2.0)), 0.8)

    def test_stay_put_never_moves(self):
        t = sim.synthetic_flat_terrain(LAT, LON, 10, 25.0)
        res = sim.simulate(t, _params(weights={"stay_put": 1.0}, n_agents=50, max_walk_hours=0.5))
        self.assertTrue(np.allclose(res.ck_dist_km, 0.0))


@unittest.skipUnless(HAS_DEPS, NEEDS)
class CalibrationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.t = sim.synthetic_flat_terrain(LAT, LON, 100, 25.0)  # 5 km square
        cls.res = sim.run(cls.t, "children_1_6", 4.0, _params(n_agents=1500, max_walk_hours=6.0))

    def test_median_matches_lpb(self):
        cal = self.res["calibration"]
        self.assertTrue(cal["converged"], cal["message"])
        q50 = cal["quantiles"][50]
        self.assertEqual(q50["lpb_km"], 0.65)  # children 1-6, UK study, p6 "50% 0.65"
        self.assertLess(abs(q50["sim_km"] - 0.65), 0.05 * 0.65 + 0.0125)
        for p in sim.CALIBRATION_PERCENTILES:
            self.assertIn("residual_km", cal["quantiles"][p])
        self.assertEqual(cal["lpb_table"]["dataset"], "uk_study")

    def test_probability_sums_to_one(self):
        prob = self.res["prob"]
        self.assertAlmostEqual(float(prob.sum()), 1.0, places=12)
        self.assertGreaterEqual(float(prob.min()), 0.0)

    def test_contour_masses(self):
        masks = sim.hdr_masks(self.res["prob"])
        for lev, m in masks.items():
            self.assertGreaterEqual(float(self.res["prob"][m].sum()), lev - 1e-9)
        self.assertTrue((masks[0.5] <= masks[0.75]).all() and (masks[0.75] <= masks[0.95]).all())

    def test_no_table_refuses_calibration(self):
        with self.assertRaises(sim.CalibrationError):
            sim.lpb_targets("fishermen")
        with self.assertRaises(sim.CalibrationError):
            sim.run(self.t, "fishermen", 4.0, _params(n_agents=50))
        out = sim.run(self.t, "fishermen", 2.0, _params(n_agents=100, max_walk_hours=1.0), walk_scale_hours=0.5)
        self.assertFalse(out["calibration"]["calibrated"])
        self.assertAlmostEqual(float(out["prob"].sum()), 1.0, places=12)

    def test_reproducible_with_seed(self):
        p1 = sim.run(self.t, "children_1_6", 2.0, _params(n_agents=300, max_walk_hours=2.0, seed=11))["prob"]
        p2 = sim.run(self.t, "children_1_6", 2.0, _params(n_agents=300, max_walk_hours=2.0, seed=11))["prob"]
        p3 = sim.run(self.t, "children_1_6", 2.0, _params(n_agents=300, max_walk_hours=2.0, seed=12))["prob"]
        self.assertTrue(np.array_equal(p1, p2))
        self.assertFalse(np.array_equal(p1, p3))


@unittest.skipUnless(HAS_DEPS, NEEDS)
class SegmentAndUpdateTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.t = sim.synthetic_flat_terrain(LAT, LON, 40, 25.0)
        cls.prob = sim.run(cls.t, "children_1_6", 3.0, _params(n_agents=800, max_walk_hours=3.0))["prob"]
        r0, c0 = (int(v) for v in cls.t.ipp_rc)
        cls.polys = [
            ("A", _rect_lonlat(cls.t, r0 - 10, r0 + 1, c0 - 10, c0 + 1), {}),
            ("B", _rect_lonlat(cls.t, r0 + 1, r0 + 15, c0 - 10, c0 + 10), {}),
        ]

    def test_segment_poa_plus_row_is_one(self):
        rows = sim.segment_poa(self.t.shape, self.t.transform, self.t.crs, self.prob, self.polys)
        self.assertEqual([r["name"] for r in rows], ["A", "B", "ROW"])
        self.assertAlmostEqual(sum(r["poa"] for r in rows), 1.0, places=12)
        self.assertGreater(rows[0]["poa"], 0)
        self.assertAlmostEqual(rows[0]["area_km2"], 11 * 11 * 0.025 ** 2, places=3)
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "segments.csv")
            sim.write_segments_csv(path, rows)
            segs = search_theory.read_segments(path)
            search_theory.check_poa(segs)  # feeds search_theory.py directly
            result = search_theory.run(segs)
            self.assertAlmostEqual(sum(result["final_poa"].values()), 1.0, places=9)

    def test_pod_one_clears_and_renormalises(self):
        m = sim.rasterize_geoms([self.polys[0][1]], self.t.shape, self.t.transform, self.t.crs, all_touched=False)
        inside = float(self.prob[m].sum())
        post, pos, cleared = sim.bayes_update_raster(self.prob, [(m, 1.0)])
        self.assertTrue((post[m] == 0).all())
        self.assertTrue((cleared == m).all())
        self.assertAlmostEqual(float(post.sum()), 1.0, places=12)
        self.assertAlmostEqual(pos, inside, places=12)
        out = ~m & (self.prob > 0)
        self.assertTrue(np.allclose(post[out], self.prob[out] / (1 - inside)))
        # a second update keeps the cleared cells at exactly 0
        m2 = sim.rasterize_geoms([self.polys[1][1]], self.t.shape, self.t.transform, self.t.crs, all_touched=False)
        post2, _, _ = sim.bayes_update_raster(post, [(m2, 0.5)])
        self.assertTrue((post2[m] == 0).all())
        self.assertAlmostEqual(float(post2.sum()), 1.0, places=12)

    def test_partial_pod_formula(self):
        m = sim.rasterize_geoms([self.polys[1][1]], self.t.shape, self.t.transform, self.t.crs, all_touched=False)
        post, _, _ = sim.bayes_update_raster(self.prob, [(m, 0.6)])
        norm = 1 - 0.6 * float(self.prob[m].sum())
        self.assertTrue(np.allclose(post[m], self.prob[m] * 0.4 / norm))

    def test_everything_cleared_is_an_error(self):
        with self.assertRaises(ValueError):
            sim.bayes_update_raster(self.prob, [(np.ones(self.prob.shape, bool), 1.0)])


@unittest.skipUnless(HAS_DEPS, NEEDS)
class CliEndToEndTest(unittest.TestCase):
    """simulate -> segments.csv -> update, with a real GeoTIFF DEM (a tilted plane) on disk."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        d = self.tmp.name
        t = sim.synthetic_flat_terrain(LAT, LON, 60, 30.0, slope_east=0.05)
        self.dem = os.path.join(d, "dem.tif")
        with rasterio.open(self.dem, "w", driver="GTiff", height=t.shape[0], width=t.shape[1], count=1,
                           dtype="float32", crs=t.crs, transform=t.transform) as dst:
            dst.write(t.z.astype("float32"), 1)
        r0, c0 = (int(v) for v in t.ipp_rc)
        self.segments = _dump(os.path.join(d, "segs.geojson"), _fc([
            (_rect_lonlat(t, r0 - 8, r0 + 8, c0 - 20, c0 + 1), {"name": "west"}),
            (_rect_lonlat(t, r0 - 8, r0 + 8, c0 + 1, c0 + 20), {"name": "east"}),
        ]))
        self.searched = _dump(os.path.join(d, "searched.geojson"), _fc([
            (_rect_lonlat(t, r0 - 8, r0 + 8, c0 - 20, c0 + 1), {"name": "west", "cleared": True}),
        ]))
        self.barrier = _dump(os.path.join(d, "river.geojson"), _fc([
            (_line_lonlat(t, [(0.5, c0 + 25.5), (t.shape[0] - 0.5, c0 + 25.5)]), {}),
        ]))

    def _simulate(self, *extra):
        out = os.path.join(self.tmp.name, "sim")
        rc = sim.main(["simulate", "--lat", str(LAT), "--lon", str(LON), "--category", "children_1_6",
                       "--hours", "3", "--dem", self.dem, "--out", out, "--res-m", "30", "--radius-km", "1.8",
                       "--agents", "400", "--max-walk-hours", "3", "--segments", self.segments,
                       "--barriers", self.barrier, *extra])
        return rc, out

    def test_simulate_then_update(self):
        rc, out = self._simulate()
        self.assertEqual(rc, 0)
        for f in ("probability.tif", "contours.geojson", "containment_rings.geojson", "segments.csv",
                  "summary.json"):
            self.assertTrue(os.path.isfile(os.path.join(out, f)), f)
        with rasterio.open(os.path.join(out, "probability.tif")) as src:
            arr = src.read(1).astype("f8")
            tags = src.tags()
        self.assertAlmostEqual(float(arr.sum()), 1.0, places=5)
        inputs = json.loads(tags["inputs"])
        self.assertEqual(inputs["category"], "children_1_6")
        self.assertEqual(inputs["dem"], [os.path.abspath(self.dem)])
        self.assertIn("barriers", inputs["linear_features_and_barriers"])
        with open(os.path.join(out, "summary.json"), encoding="utf-8") as fh:
            summary = json.load(fh)
        self.assertIn("assumptions", summary)
        self.assertTrue(summary["calibration"]["converged"])
        for f in ("contours.geojson", "containment_rings.geojson"):
            with open(os.path.join(out, f), encoding="utf-8") as fh:
                self.assertEqual(json.load(fh)["inputs"]["category"], "children_1_6")
        search_theory.check_poa(search_theory.read_segments(os.path.join(out, "segments.csv")))

        out2 = os.path.join(self.tmp.name, "upd")
        rc = sim.main(["update", "--prior", os.path.join(out, "probability.tif"), "--searched", self.searched,
                       "--segments", self.segments, "--out", out2])
        self.assertEqual(rc, 0)
        segs = {s["name"]: s["poa"] for s in search_theory.read_segments(os.path.join(out2, "segments.csv"))}
        self.assertEqual(segs["west"], 0.0)
        self.assertAlmostEqual(sum(segs.values()), 1.0, places=9)
        with rasterio.open(os.path.join(out2, "posterior.tif")) as src:
            self.assertIn("prior_inputs", json.loads(src.tags()["inputs"]))

    def test_no_table_exits_3(self):
        out = os.path.join(self.tmp.name, "f")
        rc = sim.main(["simulate", "--lat", str(LAT), "--lon", str(LON), "--category", "fishermen", "--hours", "3",
                       "--dem", self.dem, "--out", out])
        self.assertEqual(rc, 3)
        self.assertFalse(os.path.exists(out))

    def test_bad_pod_exits_2(self):
        rc, out = self._simulate()
        self.assertEqual(rc, 0)
        bad = _dump(os.path.join(self.tmp.name, "bad.geojson"), json.loads(open(self.searched).read()))
        with open(bad, encoding="utf-8") as fh:
            gj = json.load(fh)
        gj["features"][0]["properties"] = {"name": "west", "pod": 1.5}
        _dump(bad, gj)
        rc = sim.main(["update", "--prior", os.path.join(out, "probability.tif"), "--searched", bad,
                       "--out", os.path.join(self.tmp.name, "u")])
        self.assertEqual(rc, 2)

    def test_ipp_outside_dem_exits_2(self):
        rc = sim.main(["simulate", "--lat", "10.0", "--lon", "10.0", "--category", "children_1_6", "--hours", "3",
                       "--dem", self.dem, "--out", os.path.join(self.tmp.name, "o"), "--radius-km", "1"])
        self.assertEqual(rc, 2)


if __name__ == "__main__":
    unittest.main()
