"""Tests for evidence_fusion.py (SYSTEM_REVIEW upgrade B1)."""

import csv
import io
import json
import math
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import numpy as np
except ImportError:  # pragma: no cover
    np = None

import search_theory as st  # noqa: E402

if np is not None:
    import evidence_fusion as ef  # noqa: E402

try:
    import rasterio  # noqa: F401
    HAVE_RASTERIO = True
except ImportError:  # pragma: no cover
    HAVE_RASTERIO = False


def est(v, lo=None, hi=None):
    return {"value": v, "low": v if lo is None else lo, "high": v if hi is None else hi}


def bins_layer(name, lr, lo=None, hi=None, values=None, **kw):
    """One-bin-per-side table: raw >= 0.5 gets LR lr, below gets 1."""
    spec = {"name": name, "model": "bins", "edges": [0.5], "lr": [est(1.0), est(lr, lo, hi)],
            "source": "test fixture", "values": values or {}}
    spec.update(kw)
    return spec


def seg_prior(poa, row=0.0):
    segs = [{"name": n, "poa": p, "area_km2": 1.0} for n, p in poa.items()]
    if row:
        segs.append({"name": "ROW", "poa": row})
    return ef.prior_from_segments(segs)


def run(prior, specs, groups=None, policy=None, draws=0, seed=0):
    layers = [ef.Layer(s, i) for i, s in enumerate(specs)]
    ef.attach_values(layers, prior)
    return ef.fuse(prior, layers, groups, policy, draws=draws, seed=seed)


@unittest.skipIf(np is None, "numpy not installed")
class Core(unittest.TestCase):
    def test_lr_one_layers_leave_prior_unchanged(self):
        prior = seg_prior({"A": 0.5, "B": 0.3, "C": 0.1}, row=0.1)
        specs = [bins_layer("flat", 1.0, 0.5, 2.0, values={"A": 1, "B": 0, "C": 1}),
                 {"name": "det_uninformative", "model": "detector", "source": "fixture",
                  "sensitivity": est(0.3), "false_positive_rate": est(0.3), "values": {"A": 1, "B": 0}}]
        res = run(prior, specs, draws=200)
        np.testing.assert_allclose(res["point"], [0.5, 0.3, 0.1], atol=1e-12)
        self.assertAlmostEqual(res["row_point"], 0.1, places=12)
        # The median of the bins layer is 1, so the MC median stays at the prior too.
        np.testing.assert_allclose(res["median"], [0.5, 0.3, 0.1], atol=0.03)

    def test_two_cell_bayes(self):
        # prior 0.5 / 0.5, LR 4 in A: posterior A = 0.5*4 / (0.5*4 + 0.5) = 0.8.
        prior = seg_prior({"A": 0.5, "B": 0.5})
        res = run(prior, [bins_layer("x", 4.0, values={"A": 1, "B": 0})])
        np.testing.assert_allclose(res["point"], [0.8, 0.2], atol=1e-12)
        # With ROW 0.2 and A = B = 0.4: weights 1.6, 0.4, 0.2 -> 0.727..., 0.1818..., 0.0909...
        prior = seg_prior({"A": 0.4, "B": 0.4}, row=0.2)
        res = run(prior, [bins_layer("x", 4.0, values={"A": 1, "B": 0})])
        np.testing.assert_allclose(res["point"], [1.6 / 2.2, 0.4 / 2.2], atol=1e-12)
        self.assertAlmostEqual(res["row_point"], 0.2 / 2.2, places=12)
        # Odds form: posterior odds(A vs ROW) = prior odds * LR.
        self.assertAlmostEqual(res["point"][0] / res["row_point"], (0.4 / 0.2) * 4.0, places=9)

    def test_detector_hit_and_miss(self):
        prior = seg_prior({"A": 0.5, "B": 0.5})
        spec = {"name": "d", "model": "detector", "source": "fixture",
                "sensitivity": est(0.8), "false_positive_rate": est(0.1), "values": {"A": 1, "B": 0}}
        res = run(prior, [spec])
        wa, wb = 0.5 * 0.8 / 0.1, 0.5 * 0.2 / 0.9
        np.testing.assert_allclose(res["point"], [wa / (wa + wb), wb / (wa + wb)], atol=1e-12)

    def test_logistic_lr(self):
        # logit P = -1 + 2x, training prevalence 0.5 -> LR(x) = exp(-1 + 2x).
        prior = seg_prior({"A": 0.5, "B": 0.5})
        spec = {"name": "l", "model": "logistic", "source": "fixture", "intercept": est(-1.0),
                "slope": est(2.0), "training_prevalence": 0.5, "values": {"A": 1.0, "B": 0.0}}
        res = run(prior, [spec])
        wa, wb = math.exp(1.0), math.exp(-1.0)
        np.testing.assert_allclose(res["point"], [wa / (wa + wb), wb / (wa + wb)], atol=1e-12)

    def test_dependency_group_not_double_counted(self):
        prior = seg_prior({"A": 0.5, "B": 0.5})
        v = {"A": 1, "B": 0}
        one = run(prior, [bins_layer("x", 4.0, values=v)])["point"]
        indep = run(prior, [bins_layer("x", 4.0, values=v), bins_layer("y", 4.0, values=v)])["point"]
        np.testing.assert_allclose(indep, [16 / 17, 1 / 17], atol=1e-12)  # multiplied: LR 16
        for combine in ("strongest", "max"):
            grouped = run(prior, [bins_layer("x", 4.0, values=v, group="g"), bins_layer("y", 4.0, values=v, group="g")],
                          groups={"g": {"combine": combine}})["point"]
            np.testing.assert_allclose(grouped, one, atol=1e-12)
        # strongest keeps a strong negative member; max would drop it.
        neg = [bins_layer("x", 4.0, values=v, group="g"), bins_layer("y", 0.1, values=v, group="g")]
        s = run(prior, neg, groups={"g": {"combine": "strongest"}})["point"]
        np.testing.assert_allclose(s, [0.05 / 0.55, 0.5 / 0.55], atol=1e-12)
        # joint: only the user-given combined LR counts.
        joint = [bins_layer("x", 4.0, values=v, group="g"), bins_layer("y", 4.0, values=v, group="g"),
                 bins_layer("xy_joint", 6.0, values=v, group="g")]
        j = run(prior, joint, groups={"g": {"combine": "joint", "use_layer": "xy_joint"}})["point"]
        np.testing.assert_allclose(j, [6 / 7, 1 / 7], atol=1e-12)

    def test_pod_negative_evidence_equals_bayes_update(self):
        segs = [{"name": "A", "poa": 0.4, "area_km2": 1.0}, {"name": "B", "poa": 0.3, "area_km2": 2.0},
                {"name": "C", "poa": 0.2, "area_km2": 1.5}, {"name": "ROW", "poa": 0.1}]
        pods = {"A": 0.6, "C": 0.35}
        expect, _ = st.bayes_update(segs, pods)
        expect = {s["name"]: s["poa"] for s in expect}
        prior = ef.prior_from_segments(segs)
        spec = {"name": "search1", "model": "pod", "source": "fixture", "pod_factor": est(1.0), "values": pods}
        res = run(prior, [spec])
        for i, n in enumerate(prior.names):
            self.assertAlmostEqual(res["point"][i], expect[n], places=12)
        self.assertAlmostEqual(res["row_point"], expect["ROW"], places=12)

    def test_pod_one_clears_unit(self):
        prior = seg_prior({"A": 0.5, "B": 0.5})
        spec = {"name": "s", "model": "pod", "source": "f", "pod_factor": est(1.0), "values": {"A": 1.0}}
        res = run(prior, [spec])
        np.testing.assert_allclose(res["point"], [0.0, 1.0])

    def test_intervals_widen_with_wider_lr_intervals(self):
        prior = seg_prior({"A": 0.4, "B": 0.4}, row=0.2)
        v = {"A": 1, "B": 0}
        narrow = run(prior, [bins_layer("x", 4.0, 3.5, 4.5, values=v)], draws=2000, seed=1)
        wide = run(prior, [bins_layer("x", 4.0, 1.0, 16.0, values=v)], draws=2000, seed=1)
        wn = narrow["p95"][0] - narrow["p05"][0]
        ww = wide["p95"][0] - wide["p05"][0]
        self.assertGreater(wn, 0.0)
        self.assertGreater(ww, 3 * wn)
        self.assertLessEqual(wide["p05"][0], wide["median"][0])
        self.assertLessEqual(wide["median"][0], wide["p95"][0])
        # The interval of LR 4 is [1, 16]: at the 5th percentile A's posterior is the LR-1 value 0.4.
        self.assertAlmostEqual(wide["p05"][0], 0.4, delta=0.02)

    def test_seeded_monte_carlo_is_reproducible(self):
        prior = seg_prior({"A": 0.5, "B": 0.5})
        v = {"A": 1}
        a = run(prior, [bins_layer("x", 4.0, 1.0, 9.0, values=v)], draws=300, seed=7)
        b = run(prior, [bins_layer("x", 4.0, 1.0, 9.0, values=v)], draws=300, seed=7)
        np.testing.assert_array_equal(a["p95"], b["p95"])

    def test_row_retained(self):
        prior = seg_prior({"A": 0.3, "B": 0.3, "C": 0.2}, row=0.2)
        up = run(prior, [bins_layer("x", 5.0, values={"A": 1, "B": 1, "C": 1})])
        self.assertGreater(up["row_point"], 0.0)
        self.assertLess(up["row_point"], 0.2)
        self.assertAlmostEqual(float(up["point"].sum()) + up["row_point"], 1.0, places=12)
        # Every searched segment comes up empty: probability moves to ROW, it is not spread over the map.
        spec = {"name": "s", "model": "pod", "source": "f", "pod_factor": est(1.0),
                "values": {"A": 0.8, "B": 0.8, "C": 0.8}}
        down = run(prior, [spec])
        self.assertAlmostEqual(down["row_point"], 0.2 / (0.8 * 0.2 + 0.2), places=12)

    def test_raster_prior_row_from_missing_mass(self):
        w = []
        p = ef._grid_prior(np.array([[0.2, 0.3], [0.1, 0.2]]), None, "raster", None, None, w)
        self.assertAlmostEqual(p.row, 0.2)
        self.assertFalse(w)
        w = []
        p = ef._grid_prior(np.array([[1.0, 3.0]]), 0.1, "raster", None, None, w)
        np.testing.assert_allclose(p.prob, [0.225, 0.675])
        w = []
        ef._grid_prior(np.array([[0.5, 0.5]]), None, "raster", None, None, w)
        self.assertTrue(any("ROW prior is 0" in x for x in w))
        with self.assertRaises(ef.FusionError):
            ef._grid_prior(np.array([[1.0, 3.0]]), None, "raster", None, None, [])

    def test_raster_chunks_match_one_pass(self):
        rng = np.random.default_rng(3)
        a = rng.random((7, 9))
        prior = ef._grid_prior(a, 0.1, "raster", None, None, [])
        spec = {"name": "x", "model": "bins", "edges": [0.3, 0.7], "source": "f",
                "lr": [est(0.5, 0.2, 0.9), est(1.0), est(3.0, 1.5, 6.0)], "array": rng.random((7, 9))}
        layers = [ef.Layer(spec, 0)]
        ef.attach_values(layers, prior)
        big = ef.fuse(prior, layers, draws=50, seed=2)
        small = ef.fuse(prior, layers, draws=50, seed=2, budget=60)
        np.testing.assert_allclose(big["point"], small["point"], atol=1e-14)
        np.testing.assert_allclose(big["p95"], small["p95"], atol=1e-14)
        self.assertAlmostEqual(float(big["point"].sum()) + big["row_point"], 1.0, places=12)

    def test_missing_value_is_lr_one(self):
        prior = seg_prior({"A": 0.5, "B": 0.5})
        spec = {"name": "d", "model": "detector", "source": "f", "sensitivity": est(0.9),
                "false_positive_rate": est(0.1), "values": {"A": ""}}
        np.testing.assert_allclose(run(prior, [spec])["point"], [0.5, 0.5])


@unittest.skipIf(np is None, "numpy not installed")
class Grades(unittest.TestCase):
    def test_no_policy_records_but_does_not_apply(self):
        prior = seg_prior({"A": 0.5, "B": 0.5})
        res = run(prior, [bins_layer("x", 4.0, values={"A": 1}, admiralty="E5")])
        np.testing.assert_allclose(res["point"], [0.8, 0.2])
        self.assertTrue(any("NOT applied" in w for w in res["warnings"]))

    def test_example_policy_shrinks_toward_one(self):
        prior = seg_prior({"A": 0.5, "B": 0.5})
        a1 = run(prior, [bins_layer("x", 4.0, values={"A": 1}, admiralty="A1")], policy="example")
        np.testing.assert_allclose(a1["point"], [0.8, 0.2])
        b2 = run(prior, [bins_layer("x", 4.0, values={"A": 1}, admiralty="B2")], policy="example")
        lr = 4.0 ** (0.8 * 0.8)
        np.testing.assert_allclose(b2["point"], [lr / (lr + 1), 1 / (lr + 1)])
        e = run(prior, [bins_layer("x", 4.0, values={"A": 1}, admiralty="E1")], policy="example")
        np.testing.assert_allclose(e["point"], [0.5, 0.5])
        self.assertIn("not measured", ef.EXAMPLE_GRADE_POLICY["name"])

    def test_zero_weight_on_cleared_unit_is_ignored_not_nan(self):
        prior = seg_prior({"A": 0.5, "B": 0.5})
        spec = {"name": "s", "model": "pod", "source": "f", "pod_factor": est(1.0), "values": {"A": 1.0},
                "admiralty": "F6"}
        res = run(prior, [spec], policy="example")
        np.testing.assert_allclose(res["point"], [0.5, 0.5])

    def test_user_policy_validated(self):
        with self.assertRaises(ef.FusionError):
            ef.resolve_grade_policy({"source": {"A": 1.0}, "credibility": {}})
        bad = {"source": dict.fromkeys("ABCDEF", 1.5), "credibility": dict.fromkeys("123456", 1.0)}
        with self.assertRaises(ef.FusionError):
            ef.resolve_grade_policy(bad)

    def test_bad_grade_rejected(self):
        with self.assertRaises(ef.FusionError):
            ef.Layer(bins_layer("x", 2.0, admiralty="G9"), 0)


@unittest.skipIf(np is None, "numpy not installed")
class Validation(unittest.TestCase):
    def test_source_required(self):
        spec = bins_layer("x", 2.0)
        spec["source"] = "  "
        with self.assertRaisesRegex(ef.FusionError, "source"):
            ef.Layer(spec, 0)

    def test_interval_required_and_ordered(self):
        spec = bins_layer("x", 2.0)
        spec["lr"][1] = {"value": 2.0}
        with self.assertRaises(ef.FusionError):
            ef.Layer(spec, 0)
        with self.assertRaises(ef.FusionError):
            ef.Layer(bins_layer("x", 2.0, 3.0, 4.0), 0)

    def test_detector_values_checked(self):
        prior = seg_prior({"A": 0.5, "B": 0.5})
        spec = {"name": "d", "model": "detector", "source": "f", "sensitivity": est(0.9),
                "false_positive_rate": est(0.1), "values": {"A": 0.5}}
        with self.assertRaises(ef.FusionError):
            run(prior, [spec])

    def test_joint_needs_member(self):
        prior = seg_prior({"A": 0.5, "B": 0.5})
        with self.assertRaises(ef.FusionError):
            run(prior, [bins_layer("x", 2.0, group="g")], groups={"g": {"combine": "joint", "use_layer": "z"}})


@unittest.skipIf(np is None, "numpy not installed")
class Benchmark(unittest.TestCase):
    def test_toy_scoring(self):
        prob = [0.5, 0.2, 0.2, 0.0]
        res = ef.score_map(prob, 0.1, [0, 1, None, 3])
        a, b, row, z = res["finds"]
        self.assertEqual(a["rank"], 1.0)
        self.assertEqual(a["cum_prob_before"], 0.0)
        self.assertAlmostEqual(a["log_score"], math.log(0.5))
        self.assertEqual(b["rank"], 2.5)  # tied with unit 2
        self.assertAlmostEqual(b["cum_prob_before"], 0.5 + 0.1)
        self.assertEqual(row["unit"], "ROW")
        self.assertEqual(row["rank"], 5.0)
        self.assertAlmostEqual(row["cum_prob_before"], 0.9)
        self.assertAlmostEqual(row["log_score"], math.log(0.1))
        self.assertTrue(z["impossible"])
        self.assertIsNone(z["log_score"])
        self.assertIsNone(res["mean_log_score"])
        self.assertTrue(res["any_impossible"])
        ok = ef.score_map(prob, 0.1, [0, 1])
        self.assertAlmostEqual(ok["mean_log_score"], (math.log(0.5) + math.log(0.2)) / 2)

    def test_fusion_improves_score_when_lr_points_at_truth(self):
        prior = seg_prior({"A": 0.25, "B": 0.25, "C": 0.25, "D": 0.25})
        res = run(prior, [bins_layer("x", 9.0, values={"C": 1})])
        base = ef.score_map(prior.prob, prior.row, [2])
        fused = ef.score_map(res["point"], res["row_point"], [2])
        self.assertGreater(fused["mean_log_score"], base["mean_log_score"])
        self.assertEqual(fused["finds"][0]["rank"], 1.0)

    def test_sarenv_loader_and_orientation(self):
        with tempfile.TemporaryDirectory() as d:
            heat = np.zeros((3, 4))
            heat[0, 1] = 2.0  # row 0 = SOUTH edge in SAREnv
            heat[2, 3] = 6.0
            np.save(os.path.join(d, "heatmap.npy"), heat)
            meta = {"type": "FeatureCollection", "center_point": [10.4, 55.4], "meter_per_bin": 30,
                    "bounds": [1000.0, 2000.0, 1120.0, 2090.0], "climate": "temperate",
                    "environment_type": "flat", "features": []}
            with open(os.path.join(d, "features.geojson"), "w") as f:
                json.dump(meta, f)
            scn = ef.load_sarenv(d)
            self.assertEqual(scn["crs"], "EPSG:32632")
            prior = ef.prior_from_sarenv(scn, 0.0, [])
            self.assertAlmostEqual(prior.prob.reshape(3, 4)[2, 1], 0.25)  # south row is last when north-up
            self.assertAlmostEqual(prior.prob.reshape(3, 4)[0, 3], 0.75)
            self.assertEqual(ef.sarenv_world_to_cell(scn, 1045.0, 2010.0), (2, 1))
            self.assertIsNone(ef.sarenv_world_to_cell(scn, 0.0, 0.0))
            t = tuple(prior.transform)[:6]
            self.assertEqual(t, (30.0, 0.0, 1000.0, 0.0, -30.0, 2090.0))
            found = os.path.join(d, "found.csv")
            with open(found, "w") as f:
                f.write("x,y\n1105,2080\n1045,2010\n")
            out = os.path.join(d, "score.json")
            with redirect_stdout(io.StringIO()):
                rc = ef.main(["score", "--sarenv", d, "--found", found, "--out", out])
            self.assertEqual(rc, 0)
            with open(out) as f:
                s = json.load(f)["score"]
            self.assertEqual([r["rank"] for r in s["finds"]], [1.0, 2.0])


@unittest.skipIf(np is None, "numpy not installed")
class Cli(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, name, text):
        p = os.path.join(self.d, name)
        with open(p, "w", encoding="utf-8") as f:
            f.write(text)
        return p

    def segments_config(self, **extra):
        self.write("segments.csv", "name,area_km2,poa,sweep_width_km,speed_kmh,pod\n"
                                   "A,1.0,0.4,0.1,2,0.5\nB,2.0,0.3,0.1,2,\nC,1.5,0.2,0.1,2,\nROW,,0.1,,,\n")
        self.write("values.csv", "name,dog,search1\nA,1,0.5\nB,0,\nC,,0.3\n")
        cfg = {"prior": {"type": "segments", "file": "segments.csv"}, "values": "values.csv",
               "monte_carlo": {"draws": 300, "seed": 4},
               "layers": [{"name": "dog", "model": "detector", "source": "fixture trial",
                           "sensitivity": est(0.7, 0.5, 0.85), "false_positive_rate": est(0.1, 0.04, 0.2)},
                          {"name": "search1", "model": "pod", "source": "fixture debrief",
                           "pod_factor": est(1.0, 0.8, 1.1)}]}
        cfg.update(extra)
        return self.write("cfg.json", json.dumps(cfg))

    def test_fuse_segments_end_to_end_and_optimal_search_reads_csv(self):
        cfg = self.segments_config()
        out, seg = os.path.join(self.d, "o.json"), os.path.join(self.d, "fused.csv")
        rc = ef.main(["fuse", "--config", cfg, "--out", out, "--csv", seg])
        self.assertEqual(rc, 0)
        with open(out) as f:
            rep = json.load(f)
        self.assertEqual(rep["n_units"], 3)
        self.assertIn("p05", rep["units"][0])
        segs = st.read_segments(seg)  # validates POA sums to 1 with ROW
        self.assertEqual([s["name"] for s in segs], ["A", "B", "C", "ROW"])
        self.assertIsNone(segs[0].get("pod"))  # the search is in the posterior; not passed on twice
        self.assertEqual(segs[0]["sweep_width_km"], 0.1)
        import optimal_search as osr
        res = osr.run(segs, 5.0)
        self.assertIn("optimal", json.dumps(res))
        with open(seg, newline="") as f:
            rows = list(csv.DictReader(f))
        self.assertIn("poa_p95", rows[0])
        # score the fused map against a find, with the prior as baseline
        found = self.write("found.csv", "name\nB\n")
        sc = os.path.join(self.d, "s.json")
        rc = ef.main(["score", "--map", seg, "--found", found, "--baseline",
                      os.path.join(self.d, "segments.csv"), "--out", sc])
        self.assertEqual(rc, 0)
        with open(sc) as f:
            self.assertIn("log_score_gain_over_baseline", json.load(f))

    def test_cli_exit_2_on_bad_input(self):
        err = io.StringIO()
        with redirect_stderr(err):
            self.assertEqual(ef.main(["fuse", "--config", os.path.join(self.d, "missing.json")]), 2)
            bad = self.write("bad.json", "{not json")
            self.assertEqual(ef.main(["fuse", "--config", bad]), 2)
            cfg = self.segments_config(layers=[{"name": "x", "model": "bins", "edges": [1], "lr": [est(1), est(2)]}])
            self.assertEqual(ef.main(["fuse", "--config", cfg]), 2)  # no source
            self.assertEqual(ef.main(["fuse"]), 2)  # argparse error
        self.assertIn("source", err.getvalue())

    @unittest.skipUnless(HAVE_RASTERIO, "rasterio not installed")
    def test_raster_round_trip(self):
        from rasterio.transform import from_origin
        tr = from_origin(500000.0, 4000090.0, 30.0, 30.0)
        prob = np.full((3, 3), 1.0 / 9)
        hit = np.full((3, 3), np.nan)
        hit[1, 1] = 1.0
        for name, arr in (("prior.tif", prob), ("hit.tif", hit)):
            with rasterio.open(os.path.join(self.d, name), "w", driver="GTiff", height=3, width=3, count=1,
                               dtype="float64", crs="EPSG:32612", transform=tr, nodata=np.nan) as dst:
                dst.write(arr, 1)
        cfg = self.write("r.json", json.dumps({
            "prior": {"type": "raster", "file": "prior.tif", "row_prior": 0.1},
            "monte_carlo": {"draws": 100, "seed": 0},
            "layers": [{"name": "hit", "model": "detector", "file": "hit.tif", "source": "fixture",
                        "sensitivity": est(0.8, 0.6, 0.9), "false_positive_rate": est(0.1, 0.05, 0.2)}]}))
        out, tif = os.path.join(self.d, "o.json"), os.path.join(self.d, "post.tif")
        self.assertEqual(ef.main(["fuse", "--config", cfg, "--out", out, "--tif", tif, "--top-k", "3"]), 0)
        with open(out) as f:
            rep = json.load(f)
        top = rep["units"][0]
        self.assertEqual((top["row"], top["col"]), (1, 1))
        self.assertAlmostEqual(top["x"], 500045.0)
        self.assertAlmostEqual(top["y"], 4000045.0)
        with rasterio.open(tif) as src:
            self.assertEqual(src.count, 4)
            row = float(src.tags()["row_probability"])
            self.assertAlmostEqual(float(src.read(1).sum()) + row, 1.0, places=9)
        found = self.write("f.csv", "x,y\n500045,4000045\n")
        sc = os.path.join(self.d, "s.json")
        self.assertEqual(ef.main(["score", "--map", tif, "--found", found, "--out", sc]), 0)
        with open(sc) as f:
            self.assertEqual(json.load(f)["score"]["finds"][0]["rank"], 1.0)
        # a layer on a different grid is refused, not resampled
        with rasterio.open(os.path.join(self.d, "hit.tif"), "w", driver="GTiff", height=2, width=3, count=1,
                           dtype="float64", crs="EPSG:32612", transform=tr) as dst:
            dst.write(np.ones((2, 3)), 1)
        with redirect_stderr(io.StringIO()):
            self.assertEqual(ef.main(["fuse", "--config", cfg, "--out", out]), 2)


if __name__ == "__main__":
    unittest.main()
