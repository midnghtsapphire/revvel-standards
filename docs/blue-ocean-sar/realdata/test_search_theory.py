"""Tests for search_theory.py, using the WiSAR calculator workbook's example rows."""

import csv
import json
import math
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import search_theory as st  # noqa: E402

# Workbook coverage table: name, area km2, TTL km, W km.
WORKBOOK = [
    ("A", 2.5, 12, 0.15),
    ("B", 1.2, 18, 0.08),
    ("C", 0.8, 10, 0.12),
    ("D", 3.0, 15, 0.05),
    ("E", 1.5, 8, 0.20),
]


class Coverage(unittest.TestCase):
    def test_coverage_one_gives_pod_0632(self):
        z, c, pod = st.coverage_pod(10, 0.1, 1.0)
        self.assertAlmostEqual(z, 1.0)
        self.assertAlmostEqual(c, 1.0)
        self.assertAlmostEqual(pod, 1 - math.exp(-1), places=9)
        self.assertAlmostEqual(pod, 0.632, places=3)

    def test_workbook_segment_a(self):
        z, c, pod = st.coverage_pod(12, 0.15, 2.5)
        self.assertAlmostEqual(z, 1.8)
        self.assertAlmostEqual(c, 0.72)
        self.assertAlmostEqual(pod, 0.5132, places=4)

    def test_rejects_bad_inputs(self):
        with self.assertRaises(ValueError):
            st.coverage_pod(1, 1, 0)
        with self.assertRaises(ValueError):
            st.coverage_pod(-1, 1, 1)
        with self.assertRaises(ValueError):
            st.sweep_width_from_add(0)

    def test_sweep_width_from_add(self):
        self.assertAlmostEqual(st.sweep_width_from_add(0.05), 0.1)
        self.assertAlmostEqual(st.sweep_width_from_add(0.05, 1.5), 0.075)

    def test_cumulative_pod(self):
        self.assertAlmostEqual(st.cumulative_pod([0.5, 0.5]), 0.75)
        self.assertAlmostEqual(st.cumulative_pod([]), 0.0)
        with self.assertRaises(ValueError):
            st.cumulative_pod([1.2])


class Bayes(unittest.TestCase):
    def segs(self):
        return [{"name": n, "poa": p} for n, p in
                zip("ABCDE", (0.35, 0.25, 0.2, 0.1, 0.1))]

    def test_workbook_update_renormalises(self):
        pods = {"A": 0.6, "B": 0.4, "C": 0.7}
        out, pos = st.bayes_update(self.segs(), pods)
        self.assertAlmostEqual(pos, 0.35 * 0.6 + 0.25 * 0.4 + 0.2 * 0.7)
        self.assertAlmostEqual(sum(s["poa"] for s in out), 1.0)
        rem = 1 - pos
        self.assertAlmostEqual(out[0]["poa"], 0.35 * 0.4 / rem)
        self.assertAlmostEqual(out[3]["poa"], 0.1 / rem)
        self.assertEqual(out[0]["poa_before"], 0.35)
        # Unsearched segments gain probability, searched ones lose it.
        self.assertGreater(out[3]["poa"], 0.1)
        self.assertLess(out[2]["poa"], 0.2)

    def test_row_segment_absorbs_probability_and_cannot_be_searched(self):
        segs = [{"name": "A", "poa": 0.8}, {"name": "ROW", "poa": 0.2}]
        out, _ = st.bayes_update(segs, {"A": 0.9})
        self.assertAlmostEqual(out[1]["poa"], 0.2 / (1 - 0.72))
        with self.assertRaises(ValueError):
            st.bayes_update(segs, {"ROW": 0.5})

    def test_rejects_unknown_segment_bad_pod_and_total_search(self):
        with self.assertRaises(ValueError):
            st.bayes_update(self.segs(), {"Z": 0.5})
        with self.assertRaises(ValueError):
            st.bayes_update(self.segs(), {"A": 1.5})
        with self.assertRaises(ValueError):
            st.bayes_update([{"name": "A", "poa": 1.0}], {"A": 1.0})

    def test_poa_must_sum_to_one(self):
        with self.assertRaises(ValueError) as cm:
            st.check_poa([{"name": "A", "poa": 0.5}])
        self.assertIn("ROW", str(cm.exception))
        with self.assertRaises(ValueError):
            st.check_poa([{"name": "A", "poa": 1.2}, {"name": "B", "poa": -0.2}])


class Tasking(unittest.TestCase):
    def test_psr_ranking_matches_workbook(self):
        areas = dict((n, a) for n, a, _, _ in WORKBOOK)
        widths = dict((n, w) for n, _, _, w in WORKBOOK)
        poa = dict(zip("ABCDE", (0.35, 0.25, 0.2, 0.1, 0.1)))
        speed = dict(zip("ABCDE", (1.5, 1.2, 2.0, 1.0, 1.8)))
        segs = [{"name": n, "poa": poa[n], "area_km2": areas[n],
                 "sweep_width_km": widths[n], "speed_kmh": speed[n]} for n in "ABCDE"]
        rows = st.tasking_table(segs + [{"name": "ROW", "poa": 0.0}])
        self.assertEqual(len(rows), 5)  # ROW skipped
        by = {r["name"]: r for r in rows}
        self.assertAlmostEqual(by["C"]["psr"], 0.12 * 2.0 * 0.2 / 0.8)
        psrs = [r["psr"] for r in rows]
        self.assertEqual(psrs, sorted(psrs, reverse=True))
        self.assertEqual([r["rank"] for r in rows], [1, 2, 3, 4, 5])


class RunAndCli(unittest.TestCase):
    def write(self, d, name, header, rows):
        p = os.path.join(d, name)
        with open(p, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(header)
            w.writerows(rows)
        return p

    def test_run_with_passes_accumulates_pod(self):
        segs = [{"name": "A", "poa": 0.6, "area_km2": 1.0, "pod": 0.5},
                {"name": "ROW", "poa": 0.4}]
        res = st.run(segs, passes=[{"name": "A", "pod": "0.5"}])
        self.assertEqual(len(res["rounds"]), 2)
        self.assertAlmostEqual(res["cumulative_pod"]["A"], 0.75)
        self.assertAlmostEqual(sum(res["final_poa"].values()), 1.0)
        # POA left in A after two 0.5 passes: 0.6*0.25 / (0.6*0.25 + 0.4)
        self.assertAlmostEqual(res["final_poa"]["A"], 0.15 / 0.55)

    def test_cli_end_to_end_and_error_exit(self):
        with tempfile.TemporaryDirectory() as d:
            rows = [(n, a, p, t, w, v) for (n, a, t, w), p, v in
                    zip(WORKBOOK, (0.3, 0.2, 0.2, 0.1, 0.1), (1.5, 1.2, 2.0, 1.0, 1.8))]
            rows.append(("ROW", "", 0.1, "", "", ""))
            seg = self.write(d, "s.csv", ["name", "area_km2", "poa", "ttl_km",
                                          "sweep_width_km", "speed_kmh"], rows)
            out = os.path.join(d, "r.json")
            self.assertEqual(st.main([seg, "--out", out]), 0)
            with open(out, encoding="utf-8") as f:
                res = json.load(f)
            self.assertAlmostEqual(res["rounds"][0]["pod"]["A"], 1 - math.exp(-0.72))
            self.assertIn("ROW", res["final_poa"])

            bad = self.write(d, "bad.csv", ["name", "area_km2", "poa"], [("A", 1, 0.5)])
            self.assertEqual(st.main([bad]), 2)
            self.assertEqual(st.main([os.path.join(d, "missing.csv")]), 2)


if __name__ == "__main__":
    unittest.main()
