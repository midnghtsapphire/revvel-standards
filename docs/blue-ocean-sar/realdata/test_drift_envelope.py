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
from contextlib import redirect_stdout

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
            self.assertAlmostEqual(env["cells"][-1]["cumulative"], 1.0, places=12)

    def test_cells_cover_reach(self):
        env = de.build_envelope()
        self.assertEqual(len(env["cells"]), 49)  # 4828 m / 100 m
        self.assertAlmostEqual(env["cells"][-1]["end_m"], 3 * de.M_PER_MI)

    def test_default_half_mass_in_first_half_mile(self):
        env = de.build_envelope()
        # un-truncated median is 0.5 mi; renormalising within 3 mi lifts it slightly
        expected = 0.5 / (1 - 2.0**-6)
        self.assertAlmostEqual(de.mass_within(env["cells"], 0.5 * de.M_PER_MI), expected, delta=2e-4)
        # exact at a cell boundary
        exact_800 = de.decay_cdf(800, "exponential", de.DEFAULT_MEDIAN_M) / (1 - 2.0**-6)
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

    def test_cleared_cells_zero_and_renormalise(self):
        plain = de.build_envelope()
        cleared = de.build_envelope(cleared=[(0, 300)])
        for i in range(3):
            self.assertEqual(cleared["cells"][i]["probability"], 0.0)
            self.assertIsNone(cleared["cells"][i]["rank"])
        self.assertAlmostEqual(sum(probs(cleared)), 1.0, places=12)
        removed = sum(plain["cells"][i]["probability"] for i in range(3))
        for i in (3, 10, 40):
            self.assertAlmostEqual(cleared["cells"][i]["probability"], plain["cells"][i]["probability"] / (1 - removed))
        self.assertEqual(cleared["cells"][3]["rank"], 1)

    def test_all_cleared_errors(self):
        with self.assertRaises(de.EnvelopeError):
            de.build_envelope(reach_m=500, cleared=[(0, 500)])

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

    def test_envelope_ignores_naive_inputs(self):
        with tempfile.TemporaryDirectory() as d1, tempfile.TemporaryDirectory() as d2:
            with redirect_stdout(io.StringIO()):
                de.main(["--discharge-cfs", "5200", "--elapsed-hours", "1", "--out-dir", d1])
                de.main(["--discharge-cfs", "52000", "--elapsed-hours", "500", "--out-dir", d2])
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
            self.assertAlmostEqual(s["mass_within"]["3 mi"], 1.0)
            with open(os.path.join(d, "envelope.csv")) as f:
                rows = list(csv.DictReader(f))
            self.assertEqual(rows[0]["rank"], "1")
            self.assertEqual(rows[0]["lat"], "")


if __name__ == "__main__":
    unittest.main()
