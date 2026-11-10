"""Tests for drift_envelope.py. Stdlib only; one cross-check uses numpy when installed."""

import csv
import importlib.util
import io
import json
import math
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import drift_envelope as de  # noqa: E402

CASES = os.path.normpath(os.path.join(HERE, "..", "..", "case-files", "general", "sar_case_records.json"))
HAS_NUMPY = importlib.util.find_spec("numpy") is not None


def probs(env):
    return [c["probability"] for c in env["cells"]]


class Decay(unittest.TestCase):
    def test_median_is_half_mass(self):
        for kind in ("exponential", "half_normal"):
            self.assertAlmostEqual(de.decay_cdf(de.DEFAULT_MEDIAN_M, kind, de.DEFAULT_MEDIAN_M), 0.5, places=9)

    def test_unknown_decay(self):
        with self.assertRaises(de.EnvelopeError):
            de.decay_cdf(10, "linear", 100)

    @unittest.skipUnless(HAS_NUMPY, "numpy not installed")
    def test_cell_mass_matches_numeric_integral(self):
        import numpy as np

        for kind in ("exponential", "half_normal"):
            env = de.build_envelope(decay=kind)
            c = env["cells"][7]
            x = np.linspace(c["start_m"], c["end_m"], 2001)
            y = np.array([de.decay_pdf(v, kind, de.DEFAULT_MEDIAN_M) for v in x])
            self.assertAlmostEqual(float(np.trapezoid(y, x)), c["base_decay"], places=8)


class Envelope(unittest.TestCase):
    def test_sums_to_one(self):
        for kind in ("exponential", "half_normal"):
            env = de.build_envelope(decay=kind, features=[de.make_feature("eddy", 900)])
            self.assertAlmostEqual(sum(probs(env)), 1.0, places=12)
            self.assertAlmostEqual(sum(c["search_priority"] for c in env["cells"]), 1.0, places=12)
            # self.assertAlmostEqual(env["cells"][-1]["cumulative"], 1.0, places=12)
            # SYSTEM_REVIEW C3: cumulative is unconditional; the beyond-reach bucket holds the rest
            self.assertAlmostEqual(env["cells"][-1]["cumulative"] + env["beyond_reach"]["posterior_mass"], 1.0,
                                   places=12)
            self.assertAlmostEqual(sum(c["prior_share_within_reach"] for c in env["cells"]), 1.0, places=12)

    def test_cells_cover_reach(self):
        env = de.build_envelope()
        self.assertEqual(len(env["cells"]), 49)  # 4828 m / 100 m
        self.assertAlmostEqual(env["cells"][-1]["end_m"], 3 * de.M_PER_MI)

    def test_default_half_mass_in_first_half_mile(self):
        env = de.build_envelope()
        # SYSTEM_REVIEW C3: mass beyond the reach is no longer renormalised in, so no lift.
        # # un-truncated median is 0.5 mi; renormalising within 3 mi lifts it slightly
        # expected = 0.5 / (1 - 2.0**-6)
        # self.assertAlmostEqual(de.mass_within(env["cells"], 0.5 * de.M_PER_MI), expected, delta=2e-4)
        # # exact at a cell boundary
        # exact_800 = de.decay_cdf(800, "exponential", de.DEFAULT_MEDIAN_M) / (1 - 2.0**-6)
        # self.assertAlmostEqual(de.mass_within(env["cells"], 800), exact_800, places=12)
        self.assertAlmostEqual(de.mass_within(env["cells"], 0.5 * de.M_PER_MI), 0.5, delta=2e-4)
        exact_800 = de.decay_cdf(800, "exponential", de.DEFAULT_MEDIAN_M)
        self.assertAlmostEqual(de.mass_within(env["cells"], 800), exact_800, places=12)
        self.assertAlmostEqual(env["prior_mass_beyond_reach"], 2.0**-6, places=12)

    def test_monotone_decay_between_features(self):
        feats = [de.make_feature("strainer_logjam", 650), de.make_feature("bend_inside", 2050)]
        env = de.build_envelope(features=feats)
        cells = env["cells"]
        for a, b in zip(cells, cells[1:]):
            if not a["features"] and not b["features"]:
                self.assertGreaterEqual(a["probability"], b["probability"], (a["cell"], b["cell"]))

    def test_snag_spike_raises_local_cell(self):
        plain = de.build_envelope()
        spiked = de.build_envelope(features=[de.make_feature("strainer_logjam", 1250)])
        k = 12
        self.assertEqual(spiked["cells"][k]["features"], ["strainer_logjam@1250m"])
        # cell k is now above its upstream neighbour, which a pure decay never allows
        self.assertGreater(spiked["cells"][k]["probability"], spiked["cells"][k - 1]["probability"])
        self.assertGreater(spiked["cells"][k]["probability"], plain["cells"][k]["probability"])
        # relative to an untouched cell the ratio grows by exactly the multiplier
        r_plain = plain["cells"][k]["probability"] / plain["cells"][3]["probability"]
        r_spike = spiked["cells"][k]["probability"] / spiked["cells"][3]["probability"]
        self.assertAlmostEqual(r_spike / r_plain, de.DEFAULT_MULTIPLIERS["strainer_logjam"], places=9)

    def test_shared_cell_uses_max_multiplier(self):
        env = de.build_envelope(features=[de.make_feature("eddy", 510), de.make_feature("bend_inside", 560)])
        self.assertEqual(env["cells"][5]["snag_multiplier"], 3.0)
        self.assertEqual(len(env["cells"][5]["features"]), 2)

    # SYSTEM_REVIEW C3: cleared cells are no longer zeroed; replaced by the POD tests below.
    # def test_cleared_cells_zero_and_renormalise(self):
    #     plain = de.build_envelope()
    #     cleared = de.build_envelope(cleared=[(0, 300)])
    #     for i in range(3):
    #         self.assertEqual(cleared["cells"][i]["probability"], 0.0)
    #         self.assertIsNone(cleared["cells"][i]["rank"])
    #     self.assertAlmostEqual(sum(probs(cleared)), 1.0, places=12)
    #     removed = sum(plain["cells"][i]["probability"] for i in range(3))
    #     for i in (3, 10, 40):
    #         self.assertAlmostEqual(cleared["cells"][i]["probability"],
    #                                plain["cells"][i]["probability"] / (1 - removed))
    #     self.assertEqual(cleared["cells"][3]["rank"], 1)

    def test_cleared_pod_one_reproduces_old_within_reach_numbers(self):
        # With POD stated as 1 the deprecated within-reach column matches the old zero-and-renormalise output.
        plain = de.build_envelope()
        cleared = de.build_envelope(cleared=[(0, 300)], cleared_pod=1.0)
        for i in range(3):
            self.assertEqual(cleared["cells"][i]["probability"], 0.0)
            self.assertEqual(cleared["cells"][i]["posterior_mass"], 0.0)
            self.assertIsNone(cleared["cells"][i]["rank"])
        self.assertAlmostEqual(sum(probs(cleared)), 1.0, places=12)
        removed = sum(plain["cells"][i]["probability"] for i in range(3))
        for i in (3, 10, 40):
            self.assertAlmostEqual(cleared["cells"][i]["probability"], plain["cells"][i]["probability"] / (1 - removed))
        self.assertEqual(cleared["cells"][3]["rank"], 1)

    def test_cleared_uses_pod_bayes_update_not_zero(self):
        import search_theory as st

        plain = de.build_envelope()
        env = de.build_envelope(cleared=[(0, 300)])  # default POD 0.8, never 1
        self.assertEqual(de.DEFAULT_CLEARED_POD, 0.8)
        for i in range(3):
            c = env["cells"][i]
            self.assertEqual(c["pod"], 0.8)
            self.assertGreater(c["posterior_mass"], 0.0)
        # P' = P (1 - POD) / (1 - sum P*POD), over the cells and the beyond-reach bucket
        searched = sum(plain["cells"][i]["prior_mass"] * 0.8 for i in range(3))
        for i in (0, 2, 3, 40):
            pod = 0.8 if i < 3 else 0.0
            want = plain["cells"][i]["prior_mass"] * (1 - pod) / (1 - searched)
            self.assertAlmostEqual(env["cells"][i]["posterior_mass"], want, places=12)
        self.assertAlmostEqual(env["beyond_reach"]["posterior_mass"], plain["prior_mass_beyond_reach"] / (1 - searched),
                               places=12)
        total = sum(c["posterior_mass"] for c in env["cells"]) + env["beyond_reach"]["posterior_mass"]
        self.assertAlmostEqual(total, 1.0, places=12)
        self.assertAlmostEqual(env["probability_of_detection_so_far"], searched, places=12)
        # same numbers as search_theory.bayes_update on the same segments
        segs = [{"name": str(c["cell"]), "poa": c["prior_mass"]} for c in plain["cells"]]
        segs.append({"name": "ROW", "poa": plain["prior_mass_beyond_reach"]})
        post, _ = st.bayes_update(segs, {"0": 0.8, "1": 0.8, "2": 0.8})
        for c, s_ in zip(env["cells"], post):
            self.assertAlmostEqual(c["posterior_mass"], s_["poa"], places=12)

    def test_cleared_range_pod_and_repeat_passes(self):
        env = de.build_envelope(cleared=[(0, 100, 0.5), (0, 100, 0.5), (100, 200, 0.3)])
        self.assertAlmostEqual(env["cells"][0]["pod"], 0.75)  # two independent 0.5 passes
        self.assertAlmostEqual(env["cells"][1]["pod"], 0.3)
        self.assertEqual(env["cells"][2]["pod"], 0.0)
        with self.assertRaises(de.EnvelopeError):
            de.build_envelope(cleared=[(0, 100, 1.5)])
        with self.assertRaises(de.EnvelopeError):
            de.build_envelope(cleared=[(0, 100, 0.5, 9)])

    # def test_all_cleared_errors(self):  # SYSTEM_REVIEW C3: the beyond-reach bucket keeps mass; see below
    #     with self.assertRaises(de.EnvelopeError):
    #         de.build_envelope(reach_m=500, cleared=[(0, 500)])

    def test_all_cleared_moves_mass_beyond_reach(self):
        env = de.build_envelope(reach_m=500, cleared=[(0, 500)])
        self.assertTrue(all(c["posterior_mass"] > 0 for c in env["cells"]))  # POD 0.8 leaves some
        self.assertGreater(env["beyond_reach"]["posterior_mass"], env["prior_mass_beyond_reach"])
        env = de.build_envelope(reach_m=500, cleared=[(0, 500)], cleared_pod=1.0)
        self.assertAlmostEqual(env["beyond_reach"]["posterior_mass"], 1.0, places=12)
        self.assertTrue(any("beyond the reach" in w for w in env["warnings"]))
        # nothing left anywhere: half-normal with a short median puts ~0 beyond the reach
        with self.assertRaises(de.EnvelopeError):
            de.build_envelope(decay="half_normal", median_m=100, cleared=[(0, 1e9)], cleared_pod=1.0)

    def test_beyond_reach_kept_not_renormalised(self):
        env = de.build_envelope(median_m=2 * de.M_PER_MI)  # median near the 3 mi reach end
        b = env["beyond_reach"]
        self.assertAlmostEqual(b["prior_mass"], 1 - de.decay_cdf(3 * de.M_PER_MI, "exponential", 2 * de.M_PER_MI))
        self.assertGreater(b["prior_mass"], 0.3)
        self.assertFalse(env["renormalised_within_reach"])
        in_reach = sum(c["posterior_mass"] for c in env["cells"])
        self.assertAlmostEqual(in_reach, 1 - b["prior_mass"], places=12)
        # cell 0 carries its own decay mass, not a share inflated by the missing tail
        self.assertAlmostEqual(env["cells"][0]["posterior_mass"], env["cells"][0]["base_decay"], places=12)
        self.assertAlmostEqual(de.mass_within(env["cells"], 3 * de.M_PER_MI), 1 - b["prior_mass"], places=12)
        self.assertTrue(any("beyond the" in w for w in env["warnings"]))

    def test_snags_move_mass_within_reach_only(self):
        plain = de.build_envelope()
        spiked = de.build_envelope(features=[de.make_feature("strainer_logjam", 1250)])
        self.assertAlmostEqual(spiked["beyond_reach"]["prior_mass"], plain["beyond_reach"]["prior_mass"], places=15)
        self.assertAlmostEqual(sum(c["prior_mass"] for c in spiked["cells"]),
                               sum(c["prior_mass"] for c in plain["cells"]), places=12)

    def test_accessibility_changes_rank_not_probability(self):
        plain = de.build_envelope()
        env = de.build_envelope(accessibility=[(0, 200, 0.0)])
        self.assertEqual(probs(env), probs(plain))
        self.assertIsNone(env["cells"][0]["rank"])
        self.assertEqual(env["cells"][2]["rank"], 1)
        self.assertAlmostEqual(sum(c["search_priority"] for c in env["cells"]), 1.0)

    def test_rank_follows_priority(self):
        env = de.build_envelope(features=[de.make_feature("strainer_logjam", 1250)])
        ranked = sorted((c for c in env["cells"] if c["rank"]), key=lambda c: c["rank"])
        pr = [c["search_priority"] for c in ranked]
        self.assertEqual(pr, sorted(pr, reverse=True))
        # 6x logjam at 1.25 km outweighs the LKP cell (decay there is ~0.35 of cell 0)
        self.assertEqual(ranked[0]["cell"], 12)
        self.assertEqual(ranked[1]["cell"], 0)

    def test_feature_beyond_reach_warns(self):
        env = de.build_envelope(features=[de.make_feature("eddy", 99999)])
        self.assertTrue(env["warnings"])
        self.assertTrue(all(c["snag_multiplier"] == 1.0 for c in env["cells"]))

    def test_bad_inputs(self):
        with self.assertRaises(de.EnvelopeError):
            de.make_feature("waterfall", 10)
        with self.assertRaises(de.EnvelopeError):
            de.make_feature("eddy", -5)
        with self.assertRaises(de.EnvelopeError):
            de.build_envelope(accessibility=[(0, 100, 1.5)])
        self.assertEqual(de.make_feature("logjam", 10).type, "strainer_logjam")


class NaiveAndRefloat(unittest.TestCase):
    def test_naive_present_but_rejected(self):
        n = de.naive_estimate(5200, 25)
        self.assertEqual(n["status"], "REJECTED")
        self.assertFalse(n["used_for_envelope"])
        self.assertGreaterEqual(len(n["reasons"]), 4)
        # the bracket reproduces the note's "45-250 miles"
        self.assertAlmostEqual(n["distance_mi_low"], 44.3, delta=1)
        self.assertAlmostEqual(n["distance_mi_high"], 253, delta=5)

    # SYSTEM_REVIEW C3: identical output at 1 h and 500 h was the bug. Replaced by the TimeScaling tests.
    # def test_envelope_ignores_naive_inputs(self):
    #     with tempfile.TemporaryDirectory() as d1, tempfile.TemporaryDirectory() as d2:
    #         with redirect_stdout(io.StringIO()):
    #             de.main(["--discharge-cfs", "5200", "--elapsed-hours", "1", "--out-dir", d1])
    #             de.main(["--discharge-cfs", "52000", "--elapsed-hours", "500", "--out-dir", d2])
    #         with open(os.path.join(d1, "envelope.csv")) as f1, open(os.path.join(d2, "envelope.csv")) as f2:
    #             self.assertEqual(f1.read(), f2.read())

    def test_naive_figure_still_not_used_for_the_envelope(self):
        # With the median stated, discharge only changes the rejected naive figure, not the envelope.
        with tempfile.TemporaryDirectory() as d1, tempfile.TemporaryDirectory() as d2:
            with redirect_stdout(io.StringIO()):
                de.main(["--median-mi", "0.5", "--discharge-cfs", "5200", "--elapsed-hours", "1", "--out-dir", d1])
                de.main(["--median-mi", "0.5", "--discharge-cfs", "52000", "--elapsed-hours", "500", "--out-dir", d2])
            with open(os.path.join(d1, "envelope.csv")) as f1, open(os.path.join(d2, "envelope.csv")) as f2:
                self.assertEqual(f1.read(), f2.read())

    def test_refloat_bands(self):
        self.assertEqual(de.refloat_note(20)["band"], "warm")
        self.assertIn("days rather than weeks", de.refloat_note(20)["timing"])
        self.assertEqual(de.refloat_note(4)["band"], "cold")
        self.assertEqual(de.refloat_note(10)["band"], "cool")
        self.assertEqual(de.refloat_note(None)["band"], "unknown")
        self.assertIn("ROUGH", de.refloat_note(20)["label"])
        for t in (-1, 0, 6.99, 7, 14.99, 15, 17.99, 18, 22, 35):
            self.assertIn(de.refloat_note(t)["band"], ("cold", "cool", "mild", "warm"))


class Centreline(unittest.TestCase):
    # a bent line south-west of the Okanogan LKP, [lon, lat]
    COORDS = [[-119.42, 48.93], [-119.421, 48.925], [-119.425, 48.918], [-119.43, 48.912], [-119.433, 48.90]]

    def test_chainage_zero_is_line_start_and_length_matches_haversine(self):
        line = de.Centreline(self.COORDS)
        self.assertEqual(line.point_at(0.0), tuple(self.COORDS[0]))
        expected = 0.0
        R = 6371008.8
        for (lo1, la1), (lo2, la2) in zip(self.COORDS, self.COORDS[1:]):
            p1, p2 = math.radians(la1), math.radians(la2)
            h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lo2 - lo1) / 2) ** 2
            expected += 2 * R * math.asin(math.sqrt(h))
        self.assertLess(abs(line.length_m - expected) / expected, 0.005)
        self.assertGreater(line.length_m, 3000)  # sanity: ~3.6 km, so the test is not vacuous
        end = line.point_at(line.length_m)
        self.assertAlmostEqual(end[0], self.COORDS[-1][0], places=9)
        self.assertAlmostEqual(end[1], self.COORDS[-1][1], places=9)
        self.assertIsNone(line.point_at(line.length_m + 10))

    def test_haversine_absolute_scale(self):
        # one degree of latitude on the mean-radius sphere is 111,195 m
        self.assertAlmostEqual(de.haversine_m(-119.42, 48.0, -119.42, 49.0), 111194.9, delta=1.0)

    def test_interpolation_on_first_segment(self):
        line = de.Centreline(self.COORDS)
        half = line.chain[1] / 2
        lon, lat = line.point_at(half)
        self.assertAlmostEqual(lon, -119.4205, places=6)
        self.assertAlmostEqual(lat, 48.9275, places=6)

    def test_lat_lon_swap_detected(self):
        with self.assertRaises(de.EnvelopeError):
            de.Centreline([[48.93, -119.42], [48.92, -119.43]])

    def test_cli_writes_geojson_and_kml(self):
        with tempfile.TemporaryDirectory() as d:
            cl = os.path.join(d, "line.geojson")
            with open(cl, "w") as f:
                json.dump({"type": "Feature", "geometry": {"type": "LineString", "coordinates": self.COORDS}}, f)
            with redirect_stdout(io.StringIO()):
                rc = de.main(
                    [
                        "--elapsed-hours",  # SYSTEM_REVIEW C3: required unless --median-mi
                        "24",
                        "--lat",
                        "48.93",
                        "--lon",
                        "-119.42",
                        "--centreline",
                        cl,
                        "--feature",
                        "bridge_piling:1500:Bridge",
                        "--out-dir",
                        d,
                    ]
                )
            self.assertEqual(rc, 0)
            with open(os.path.join(d, "envelope.geojson")) as f:
                gj = json.load(f)
            cells = [g for g in gj["features"] if g["geometry"]["type"] == "LineString"]
            first = [g for g in cells if g["properties"]["cell"] == 0][0]
            self.assertEqual(first["geometry"]["coordinates"][0], self.COORDS[0])
            pts = {g["properties"].get("kind") for g in gj["features"] if g["geometry"]["type"] == "Point"}
            self.assertEqual(pts, {"snag_feature", "LKP"})
            with open(os.path.join(d, "summary.json")) as f:
                s = json.load(f)
            self.assertTrue(any("shorter than" in w for w in s["warnings"]))  # 3.6 km line < 4.8 km reach
            with open(os.path.join(d, "envelope.kml")) as f:
                self.assertIn("<name>Bridge</name>", f.read())


class SeedCli(unittest.TestCase):
    def test_okanogan_case_chainage_only(self):
        with tempfile.TemporaryDirectory() as d:
            with redirect_stdout(io.StringIO()) as out:
                rc = de.main(
                    ["--case", CASES, "--case-id", "OKANOGAN-2026-05-27", "--elapsed-hours", "25", "--out-dir", d]
                )
            self.assertEqual(rc, 0)
            self.assertIn("chainage-only", out.getvalue())
            self.assertFalse(os.path.exists(os.path.join(d, "envelope.geojson")))
            with open(os.path.join(d, "summary.json")) as f:
                s = json.load(f)
            self.assertEqual(s["lkp"], {"lat": 48.93, "lon": -119.42, "chainage_m": 0.0})
            self.assertEqual(s["measured_inputs"]["discharge_cfs"], 5200)
            self.assertEqual(s["refloat"]["band"], "warm")
            self.assertEqual(s["rejected_naive_estimate"]["status"], "REJECTED")
            # self.assertAlmostEqual(s["mass_within"]["3 mi"], 1.0)  # SYSTEM_REVIEW C3: unconditional now
            self.assertAlmostEqual(s["mass_within"]["3 mi"], 1 - s["model"]["posterior_mass_beyond_reach"])
            self.assertLess(s["mass_within"]["3 mi"], 1.0)
            self.assertEqual(s["model"]["median_from"]["model"], "sqrt_time")
            self.assertEqual(s["model"]["median_from"]["elapsed_hours"], 25)
            with open(os.path.join(d, "envelope.csv")) as f:
                rows = list(csv.DictReader(f))
            self.assertEqual(rows[0]["rank"], "1")
            self.assertEqual(rows[0]["lat"], "")
            self.assertEqual(rows[-1]["cell"], "beyond_reach")
            self.assertAlmostEqual(float(rows[-1]["cumulative"]), 1.0, places=5)


class TimeScaling(unittest.TestCase):
    """SYSTEM_REVIEW C3: elapsed time (and, opt-in, velocity) must change the envelope."""

    def run_cli(self, *argv):
        d = tempfile.mkdtemp()
        self.addCleanup(lambda: __import__("shutil").rmtree(d, ignore_errors=True))
        with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()) as err:
            rc = de.main(list(argv) + ["--out-dir", d])
        out = {}
        if rc == 0:
            with open(os.path.join(d, "envelope.csv")) as f:
                out["csv"] = f.read()
            with open(os.path.join(d, "summary.json")) as f:
                out["summary"] = json.load(f)
        return rc, out, err.getvalue()

    def test_1h_and_240h_differ(self):
        rc1, a, _ = self.run_cli("--elapsed-hours", "1")
        rc2, b, _ = self.run_cli("--elapsed-hours", "240")
        self.assertEqual((rc1, rc2), (0, 0))
        self.assertNotEqual(a["csv"], b["csv"])
        ma, mb = a["summary"]["model"]["median_m"], b["summary"]["model"]["median_m"]
        self.assertAlmostEqual(ma, de.DEFAULT_MEDIAN_M * math.sqrt(1 / 24), places=6)
        self.assertAlmostEqual(mb, de.DEFAULT_MEDIAN_M * math.sqrt(10), places=6)
        self.assertGreater(a["summary"]["mass_within"]["0.5 mi"], b["summary"]["mass_within"]["0.5 mi"] + 0.4)
        self.assertGreater(b["summary"]["model"]["prior_mass_beyond_reach"],
                           a["summary"]["model"]["prior_mass_beyond_reach"])

    def test_refuses_without_elapsed_or_stated_median(self):
        rc, _, err = self.run_cli()
        self.assertEqual(rc, 2)
        self.assertIn("--elapsed-hours", err)
        self.assertIn("--median-mi", err)
        self.assertEqual(self.run_cli("--elapsed-hours", "0")[0], 2)
        self.assertEqual(self.run_cli("--median-mi", "0")[0], 2)

    def test_stated_median_overrides_time(self):
        rc, a, _ = self.run_cli("--median-mi", "0.8", "--elapsed-hours", "1")
        rc2, b, _ = self.run_cli("--median-mi", "0.8", "--elapsed-hours", "240")
        self.assertEqual((rc, rc2), (0, 0))
        self.assertEqual(a["csv"], b["csv"])
        self.assertEqual(a["summary"]["model"]["median_from"]["model"], "user_stated")
        self.assertAlmostEqual(a["summary"]["model"]["median_m"], 0.8 * de.M_PER_MI)

    def test_time_model_parameters_are_overridable(self):
        m, d = de.median_from_time(96, ref_median_m=1000, ref_hours=24, exponent=1.0)
        self.assertAlmostEqual(m, 4000)
        self.assertEqual(d["model"], "sqrt_time")
        rc, s, _ = self.run_cli("--elapsed-hours", "96", "--ref-median-mi", "1", "--time-exponent", "1")
        self.assertEqual(rc, 0)
        self.assertAlmostEqual(s["summary"]["model"]["median_m"], 4 * de.M_PER_MI)

    def test_velocity_model_uses_discharge_and_needs_a_stated_fraction(self):
        m, d = de.median_from_time(10, "velocity", mean_velocity_mps=1.0, transport_fraction=0.01)
        self.assertAlmostEqual(m, 360.0)
        with self.assertRaises(de.EnvelopeError):
            de.median_from_time(10, "velocity", mean_velocity_mps=1.0)  # no default fraction
        with self.assertRaises(de.EnvelopeError):
            de.median_from_time(10, "velocity", transport_fraction=0.01)
        base = ["--elapsed-hours", "10", "--time-model", "velocity", "--xsec-ft2", "1000", "--transport-fraction",
                "0.02"]
        rc_lo, lo, _ = self.run_cli(*base, "--discharge-cfs", "1000")
        rc_hi, hi, _ = self.run_cli(*base, "--discharge-cfs", "5000")
        self.assertEqual((rc_lo, rc_hi), (0, 0))
        self.assertAlmostEqual(lo["summary"]["model"]["median_m"], 0.02 * 1.0 * 0.3048 * 36000)
        self.assertAlmostEqual(hi["summary"]["model"]["median_m"], 5 * lo["summary"]["model"]["median_m"])
        self.assertNotEqual(lo["csv"], hi["csv"])
        self.assertIn("discharge", hi["summary"]["model"]["median_from"]["velocity_source"])
        # gauge discharge alone (no reach cross-section) cannot feed it
        rc, _, err = self.run_cli("--elapsed-hours", "10", "--time-model", "velocity", "--discharge-cfs", "5000",
                                  "--transport-fraction", "0.02")
        self.assertEqual(rc, 2)
        self.assertIn("--xsec-ft2", err)
        rc, _, err = self.run_cli(*base[:6], "--discharge-cfs", "5000")
        self.assertEqual(rc, 2)
        self.assertIn("--transport-fraction", err)


class Columns(unittest.TestCase):
    """SYSTEM_REVIEW C3: renamed column, deprecated alias kept for dossier.py, POD on the CLI."""

    def test_csv_and_summary_columns(self):
        with tempfile.TemporaryDirectory() as d:
            with redirect_stdout(io.StringIO()):
                rc = de.main(["--elapsed-hours", "25", "--cleared", "0:300", "--cleared", "300:500:0.4",
                              "--out-dir", d])
            self.assertEqual(rc, 0)
            with open(os.path.join(d, "envelope.csv")) as f:
                rows = list(csv.DictReader(f))
            with open(os.path.join(d, "summary.json")) as f:
                s = json.load(f)
        for col in ("prior_share_within_reach", "prior_mass", "posterior_mass", "pod", "probability"):
            self.assertIn(col, rows[0])
        cells = rows[:-1]
        for r in cells:
            self.assertEqual(r["probability"], r["prior_share_within_reach"])  # deprecated alias
        self.assertEqual([float(r["pod"]) for r in cells[:5]], [0.8, 0.8, 0.8, 0.4, 0.4])
        self.assertAlmostEqual(sum(float(r["prior_share_within_reach"]) for r in cells), 1.0, places=4)
        beyond = rows[-1]
        self.assertEqual(beyond["cell"], "beyond_reach")
        self.assertAlmostEqual(sum(float(r["posterior_mass"]) for r in rows), 1.0, places=4)
        self.assertAlmostEqual(float(beyond["posterior_mass"]), s["model"]["posterior_mass_beyond_reach"], places=6)
        self.assertFalse(s["model"]["renormalised_within_reach"])
        self.assertIn("DEPRECATED", s["model"]["columns"]["probability"])
        self.assertEqual(s["cleared"][0]["pod"], 0.8)
        self.assertEqual(s["cleared"][1]["pod"], 0.4)
        self.assertTrue(any("0.8" in x and "assumption" in x for x in s["assumptions"]))
        for c in s["top_cells"]:
            self.assertEqual(c["probability"], c["prior_share_within_reach"])
        with redirect_stderr(io.StringIO()):
            self.assertEqual(de.main(["--elapsed-hours", "25", "--cleared-pod", "1.2", "--out-dir", d]), 2)
            self.assertEqual(de.main(["--elapsed-hours", "25", "--cleared", "0:1:2:3", "--out-dir", d]), 2)


if __name__ == "__main__":
    unittest.main()
