"""Tests for optimal_search.py, using the WiSAR calculator workbook's segments A-E."""

import contextlib
import csv
import io
import json
import math
import os
import random
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import optimal_search as os_  # noqa: E402

# Workbook: name, area km2, sweep width km, POA, speed km/h.
WORKBOOK = [
    ("A", 2.5, 0.15, 0.35, 1.5),
    ("B", 1.2, 0.08, 0.25, 1.2),
    ("C", 0.8, 0.12, 0.20, 2.0),
    ("D", 3.0, 0.05, 0.10, 1.0),
    ("E", 1.5, 0.20, 0.10, 1.8),
]


def workbook_segments(row_poa=0.0):
    segs = [{"name": n, "area_km2": a, "sweep_width_km": w, "poa": p, "speed_kmh": v}
            for n, a, w, p, v in WORKBOOK]
    if row_poa:
        scale = 1.0 - row_poa
        for s in segs:
            s["poa"] *= scale
        segs.append({"name": "ROW", "poa": row_poa})
    return segs


def random_segments(rng, n, with_row):
    raw = [rng.uniform(0.01, 1.0) for _ in range(n + (1 if with_row else 0))]
    tot = sum(raw)
    segs = [{"name": f"S{i}", "area_km2": rng.uniform(0.2, 5.0),
             "sweep_width_km": rng.uniform(0.02, 0.3), "poa": raw[i] / tot,
             "speed_kmh": rng.uniform(0.5, 3.0)} for i in range(n)]
    if with_row:
        segs.append({"name": "ROW", "poa": raw[-1] / tot})
    return segs


class Optimal(unittest.TestCase):
    def assert_kkt(self, segs, budget, unit="km"):
        res = os_.optimal_allocation(segs, budget, unit)
        lam = res["lambda"]
        for r in res["segments"]:
            if r["name"] == "ROW":
                continue
            if r["funded"]:
                self.assertAlmostEqual(r["marginal_gain"] / lam, 1.0, places=9, msg=r["name"])
            else:
                self.assertLessEqual(r["marginal_gain"], lam * (1 + 1e-12), msg=r["name"])
        self.assertAlmostEqual(math.fsum(res["effort"].values()), budget, places=9)
        return res

    def test_kkt_and_budget_on_workbook(self):
        for budget in (0.5, 5, 40, 400):
            res = self.assert_kkt(workbook_segments(), budget)
            self.assertGreater(res["total_pos"], 0)
            self.assertLess(res["total_pos"], 1)

    def test_small_budget_funds_only_best_segment(self):
        # Highest POA * W / A is C (0.2*0.12/0.8 = 0.03); a tiny budget goes there only.
        res = self.assert_kkt(workbook_segments(), 0.1)
        funded = [r["name"] for r in res["segments"] if r["funded"]]
        self.assertEqual(funded, ["C"])
        self.assertAlmostEqual(res["effort"]["C"], 0.1)

    def test_kkt_on_random_instances(self):
        rng = random.Random(1234)
        for _ in range(50):
            segs = random_segments(rng, rng.randint(1, 8), rng.random() < 0.5)
            self.assert_kkt(segs, rng.uniform(0.1, 200))
            self.assert_kkt(segs, rng.uniform(0.1, 50), "hours")

    def test_row_gets_zero(self):
        res = os_.optimal_allocation(workbook_segments(row_poa=0.2), 40)
        row = [r for r in res["segments"] if r["name"] == "ROW"][0]
        self.assertEqual(row["effort_km"], 0.0)
        self.assertEqual(row["pos"], 0.0)
        self.assertNotIn("ROW", res["effort"])
        self.assertLessEqual(res["total_pos"], 0.8)
        for plan in os_.NAIVE_PLANS.values():
            self.assertNotIn("ROW", plan(workbook_segments(row_poa=0.2), 40))
        with self.assertRaises(ValueError):
            os_.evaluate_plan(workbook_segments(row_poa=0.2), {"ROW": 1.0})

    def test_beats_every_naive_plan_on_random_instances(self):
        rng = random.Random(42)
        for _ in range(100):
            segs = random_segments(rng, rng.randint(1, 8), rng.random() < 0.5)
            budget = rng.uniform(0.1, 150)
            best = os_.optimal_allocation(segs, budget)["total_pos"]
            for name, v in os_.compare_plans(segs, budget).items():
                self.assertGreaterEqual(best, v["total_pos"] - 1e-12, msg=name)
                self.assertAlmostEqual(math.fsum(v["effort"].values()), budget, places=9, msg=name)

    def test_two_segment_brute_force(self):
        segs = [{"name": "X", "area_km2": 2.0, "sweep_width_km": 0.1, "poa": 0.6},
                {"name": "Y", "area_km2": 0.5, "sweep_width_km": 0.05, "poa": 0.3},
                {"name": "ROW", "poa": 0.1}]
        for budget in (1.0, 10.0, 60.0):
            res = os_.optimal_allocation(segs, budget)
            n = 20000
            best_pos, best_x = -1.0, None
            for i in range(n + 1):
                x = budget * i / n
                _, pos = os_.evaluate_plan(segs, {"X": x, "Y": budget - x})
                if pos > best_pos:
                    best_pos, best_x = pos, x
            self.assertGreaterEqual(res["total_pos"], best_pos - 1e-12)
            self.assertAlmostEqual(res["total_pos"], best_pos, places=7)
            self.assertLessEqual(abs(res["effort"]["X"] - best_x), budget / n * 2)

    def test_hours_mode_uses_speed(self):
        segs = workbook_segments()
        res = os_.optimal_allocation(segs, 10, "hours")
        for r in res["segments"]:
            v = dict((s["name"], s["speed_kmh"]) for s in segs)[r["name"]]
            self.assertAlmostEqual(r["effort_km"], r["effort_hours"] * v)
            w = dict((s["name"], s["sweep_width_km"]) for s in segs)[r["name"]]
            a = dict((s["name"], s["area_km2"]) for s in segs)[r["name"]]
            self.assertAlmostEqual(r["coverage"], w * r["effort_km"] / a)
        segs[0]["speed_kmh"] = None
        with self.assertRaises(ValueError):
            os_.optimal_allocation(segs, 10, "hours")

    def test_rejects_bad_inputs(self):
        segs = workbook_segments()
        with self.assertRaises(ValueError):
            os_.optimal_allocation(segs, -1)
        with self.assertRaises(ValueError):
            os_.optimal_allocation(segs, float("nan"))
        with self.assertRaises(ValueError):
            os_.optimal_allocation(segs[:2], 10)  # POA does not sum to 1
        with self.assertRaises(ValueError):
            os_.optimal_allocation([{"name": "ROW", "poa": 1.0}], 10)
        with self.assertRaises(ValueError):
            os_.uniformly_optimal_plan(segs, 10, 0)
        bad = workbook_segments()
        bad[1]["sweep_width_km"] = None
        with self.assertRaises(ValueError):
            os_.optimal_allocation(bad, 10)


class Sequential(unittest.TestCase):
    def test_uniformly_optimal_increments_sum_to_one_shot(self):
        for segs in (workbook_segments(), workbook_segments(row_poa=0.15)):
            one = os_.optimal_allocation(segs, 40)
            plan = os_.uniformly_optimal_plan(segs, 40, 4)
            self.assertTrue(plan["nested"])
            self.assertAlmostEqual(plan["total_pos"], one["total_pos"], places=12)
            for n, z in one["effort"].items():
                self.assertAlmostEqual(sum(s["effort"][n] for s in plan["increments"]), z, places=9)
            cum = [s["cumulative_pos"] for s in plan["increments"]]
            self.assertEqual(cum, sorted(cum))

    def test_sequential_replan_matches_one_shot(self):
        rng = random.Random(7)
        cases = [(workbook_segments(), 40, 4), (workbook_segments(row_poa=0.2), 25, 5)]
        for _ in range(20):
            cases.append((random_segments(rng, rng.randint(1, 6), rng.random() < 0.5),
                          rng.uniform(1, 100), rng.randint(1, 6)))
        for segs, budget, k in cases:
            one = os_.optimal_allocation(segs, budget)
            seq = os_.sequential_replan(segs, budget, k)
            self.assertAlmostEqual(seq["total_pos"], one["total_pos"], places=9)
            for n, z in one["effort"].items():
                self.assertAlmostEqual(seq["total_effort"].get(n, 0.0), z, places=6)
            self.assertEqual(len(seq["increments"]), k)
            self.assertAlmostEqual(sum(seq["final_poa"].values()), 1.0)
            uni = os_.uniformly_optimal_plan(segs, budget, k)
            for a, b in zip(seq["increments"], uni["increments"]):
                self.assertAlmostEqual(a["cumulative_pos"], b["cumulative_pos"], places=9)

    def test_replan_moves_probability_to_row(self):
        seq = os_.sequential_replan(workbook_segments(row_poa=0.2), 40, 4)
        self.assertGreater(seq["final_poa"]["ROW"], 0.2)


class Cli(unittest.TestCase):
    def write(self, d, name, header, rows):
        p = os.path.join(d, name)
        with open(p, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(header)
            w.writerows(rows)
        return p

    def test_cli_end_to_end(self):
        with tempfile.TemporaryDirectory() as d:
            rows = [(n, a, p, w, v) for n, a, w, p, v in WORKBOOK]
            seg = self.write(d, "s.csv", ["name", "area_km2", "poa", "sweep_width_km", "speed_kmh"], rows)
            out = os.path.join(d, "r.json")
            self.assertEqual(os_.main([seg, "--effort-km", "40", "--increments", "4", "--out", out]), 0)
            with open(out, encoding="utf-8") as f:
                res = json.load(f)
            self.assertAlmostEqual(sum(res["optimal"]["effort"].values()), 40.0, places=9)
            self.assertEqual(len(res["sequential_replan"]["increments"]), 4)
            for v in res["naive_plans"].values():
                self.assertGreaterEqual(v["optimal_gain"], -1e-12)
            self.assertEqual(os_.main([seg, "--effort-hours", "12", "--out", out]), 0)

    def test_bad_input_exits_2(self):
        with tempfile.TemporaryDirectory() as d:
            bad = self.write(d, "bad.csv", ["name", "area_km2", "poa", "sweep_width_km"], [("A", 1, 0.5, 0.1)])
            good = self.write(d, "g.csv", ["name", "area_km2", "poa", "sweep_width_km"],
                              [("A", 1, 0.6, 0.1), ("ROW", "", 0.4, "")])
            nows = self.write(d, "nw.csv", ["name", "area_km2", "poa"], [("A", 1, 1.0)])
            with contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(os_.main([bad, "--effort-km", "10"]), 2)
                self.assertEqual(os_.main([os.path.join(d, "missing.csv"), "--effort-km", "10"]), 2)
                self.assertEqual(os_.main([good, "--effort-km", "-5"]), 2)
                self.assertEqual(os_.main([good, "--effort-km", "10", "--increments", "0"]), 2)
                self.assertEqual(os_.main([good, "--effort-hours", "10"]), 2)  # no speed column
                self.assertEqual(os_.main([nows, "--effort-km", "10"]), 2)
                with self.assertRaises(SystemExit) as cm:
                    os_.main([good])  # budget flag is required
                self.assertEqual(cm.exception.code, 2)


if __name__ == "__main__":
    unittest.main()
