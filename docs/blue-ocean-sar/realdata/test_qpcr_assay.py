"""Offline tests for qpcr_assay.py on simulated dilution series with known
answers. Standard library only, so nothing is skipped.

Run: python -m unittest test_qpcr_assay
"""

import contextlib
import csv
import io
import json
import math
import os
import random
import statistics
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import qpcr_assay as qa  # noqa: E402

SLOPE, INTERCEPT = -3.32, 38.0
TRUE_EFF = 10 ** (-1 / SLOPE) - 1


def ct_of(copies, slope=SLOPE, intercept=INTERCEPT):
    return slope * math.log10(copies) + intercept


def sim_curve(rng, levels=(1e1, 1e2, 1e3, 1e4, 1e5, 1e6), reps=3, sd=0.2, slope=SLOPE):
    return [(c, ct_of(c, slope) + rng.gauss(0, sd)) for c in levels for _ in range(reps)]


def good_standards(seed=7):
    """Curve levels plus a low-copy detection series with Poisson dropouts."""
    rng = random.Random(seed)
    st = sim_curve(rng, levels=(1e2, 1e3, 1e4, 1e5), reps=4, sd=0.15)
    for c in (1, 2, 5, 10, 20, 50):
        for _ in range(12):
            k = _poisson(rng, c)
            st.append((c, None if k == 0 else ct_of(k) + rng.gauss(0, 0.15)))
    return st


def _poisson(rng, lam):
    lim, k, p = math.exp(-lam), 0, 1.0
    while True:
        p *= rng.random()
        if p < lim:
            return k
        k += 1


class Distributions(unittest.TestCase):
    def test_t_quantiles_match_tables(self):
        for df, want in ((1, 12.7062), (2, 4.3027), (10, 2.2281), (30, 2.0423), (1000, 1.9623)):
            self.assertAlmostEqual(qa.t_ppf(0.975, df), want, places=3)
        self.assertAlmostEqual(qa.t_ppf(0.025, 10), -2.2281, places=3)


class StandardCurve(unittest.TestCase):
    def test_exact_points_give_exact_fit(self):
        st = [(c, ct_of(c)) for c in (1e2, 1e3, 1e4, 1e5) for _ in range(2)]
        c = qa.fit_standard_curve(st)
        self.assertAlmostEqual(c["slope"], SLOPE, places=10)
        self.assertAlmostEqual(c["intercept"], INTERCEPT, places=9)
        self.assertAlmostEqual(c["r2"], 1.0, places=12)
        self.assertAlmostEqual(c["efficiency"], TRUE_EFF, places=10)
        self.assertTrue(c["passed"])

    def test_recovers_slope_and_efficiency_from_noisy_data(self):
        c = qa.fit_standard_curve(sim_curve(random.Random(42)))
        self.assertLess(abs(c["slope"] - SLOPE), 3 * c["se_slope"])
        self.assertLess(abs(c["efficiency"] - TRUE_EFF), 3 * c["se_efficiency"])
        self.assertLess(abs(c["efficiency"] - TRUE_EFF), 0.05)
        self.assertGreater(c["r2"], 0.99)
        self.assertEqual(c["flags"], [])

    def test_bad_efficiency_and_low_r2_are_flagged(self):
        c = qa.fit_standard_curve(sim_curve(random.Random(1), slope=-4.0, sd=0.05))
        self.assertAlmostEqual(c["efficiency"], 10 ** 0.25 - 1, places=2)  # ~0.78
        self.assertFalse(c["passed"])
        self.assertTrue(any("efficiency" in f for f in c["flags"]))
        noisy = qa.fit_standard_curve(sim_curve(random.Random(1), levels=(1e3, 1e4, 1e5), sd=1.5))
        self.assertTrue(any("R^2" in f for f in noisy["flags"]))

    def test_too_few_levels_is_an_error(self):
        with self.assertRaises(ValueError):
            qa.fit_standard_curve([(10, 30.0), (10, 30.1), (100, 27.0), (1000, None)])


class Lod(unittest.TestCase):
    B1 = 5.0           # logistic slope per log10 copy
    TRUE_X = 1.0       # true LOD95 = 10 copies

    def sim(self, seed, reps=16):
        rng = random.Random(seed)
        b0 = math.log(19) - self.B1 * self.TRUE_X
        st = []
        for x in (0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0):
            p = 1 / (1 + math.exp(-(b0 + self.B1 * x)))
            st += [(10 ** x, 30.0 if rng.random() < p else None) for _ in range(reps)]
        return st

    def test_recovers_known_lod_within_ci(self):
        lod = qa.estimate_lod(self.sim(2026))
        self.assertEqual(lod["status"], "ok")
        self.assertTrue(lod["converged"])
        lo, hi = lod["ci95_copies"]
        self.assertLess(lo, 10.0)
        self.assertGreater(hi, 10.0)
        self.assertLess(abs(math.log10(lod["lod95_copies"]) - self.TRUE_X), 0.3)

    def test_ci_coverage_over_seeds(self):
        hits = 0
        for s in range(60):
            lo, hi = qa.estimate_lod(self.sim(s))["ci95_copies"]
            hits += lo <= 10.0 <= hi
        self.assertGreaterEqual(hits / 60, 0.85)

    def test_probit_link_agrees_roughly(self):
        a = qa.estimate_lod(self.sim(5))["lod95_copies"]
        b = qa.estimate_lod(self.sim(5), link="probit")["lod95_copies"]
        self.assertLess(abs(math.log10(a / b)), 0.15)

    def test_assay_that_never_reaches_95_percent(self):
        rng = random.Random(3)
        st = [(10 ** x, 30.0 if rng.random() < p else None)
              for x, p in ((0, 0.1), (1, 0.3), (2, 0.5), (3, 0.7)) for _ in range(20)]
        lod = qa.estimate_lod(st)
        self.assertEqual(lod["status"], "not_reached")
        self.assertIsNone(lod["lod_for_calls"])

    def test_separation_and_full_detection_edge_cases(self):
        sep = [(1, None)] * 8 + [(10, 30.0)] * 8 + [(100, 27.0)] * 8
        lod = qa.estimate_lod(sep)
        self.assertEqual(lod["status"], "separation")
        self.assertEqual(lod["bracket_copies"], [1.0, 10.0])
        self.assertAlmostEqual(lod["lod_for_calls"], 10.0)
        full = qa.estimate_lod([(c, 30.0) for c in (10, 100) for _ in range(4)])
        self.assertEqual(full["status"], "below_range")
        self.assertAlmostEqual(full["lod_for_calls"], 10.0)
        self.assertEqual(qa.estimate_lod([(10, None)] * 4)["status"], "never_detected")


class Loq(unittest.TestCase):
    def series(self, sds):
        """Exact Ct SD per level: replicates at mean-sd, mean, mean+sd."""
        st = []
        for copies, sd in sds:
            m = ct_of(copies)
            st += [(copies, m - sd), (copies, m), (copies, m + sd)]
        return st

    def test_picks_lowest_contiguous_level_under_35_percent(self):
        st = self.series([(10, 1.0), (50, 0.6), (100, 0.25), (1000, 0.15), (1e4, 0.10), (1e5, 0.10)])
        curve = qa.fit_standard_curve(st)
        loq = qa.estimate_loq(st, curve)
        self.assertEqual(loq["loq_copies"], 100.0)
        cvs = {r["copies"]: r["cv"] for r in loq["cv_curve"]}
        self.assertGreater(cvs[50.0], 0.35)
        self.assertLessEqual(cvs[100.0], 0.35)

    def test_cv_is_from_back_calculated_copies_and_matches_forootan(self):
        st = self.series([(10, 1.0), (50, 0.6), (100, 0.25), (1000, 0.15), (1e4, 0.10), (1e5, 0.10)])
        curve = qa.fit_standard_curve(st)
        row = [r for r in qa.estimate_loq(st, curve)["cv_curve"] if r["copies"] == 100.0][0]
        want = qa.cv_from_ct_sd(row["sd_ct"], curve["efficiency"])
        self.assertAlmostEqual(row["cv"], want, places=3)
        back = [10 ** ((c - curve["intercept"]) / curve["slope"]) for k, c in st if k == 100]
        self.assertAlmostEqual(row["cv_arithmetic"], statistics.stdev(back) / statistics.mean(back), places=3)

    def test_fluke_low_pass_does_not_set_loq(self):
        st = self.series([(10, 0.1), (50, 0.8), (100, 0.2), (1000, 0.1), (1e4, 0.1)])
        loq = qa.estimate_loq(st, qa.fit_standard_curve(st))
        self.assertEqual(loq["loq_copies"], 100.0)

    def test_level_with_dropouts_cannot_be_loq(self):
        st = self.series([(100, 0.1), (1000, 0.1), (1e4, 0.1)]) + [(100, None)]
        loq = qa.estimate_loq(st, qa.fit_standard_curve(st))
        self.assertEqual(loq["loq_copies"], 1000.0)


class PredictionInterval(unittest.TestCase):
    def test_coverage_near_95_percent(self):
        rng = random.Random(11)
        truth, hits, n = math.log10(500.0), 0, 400
        for _ in range(n):
            curve = qa.fit_standard_curve(sim_curve(rng, sd=0.3))
            y = [ct_of(500.0) + rng.gauss(0, 0.3) for _ in range(3)]
            _, lo, hi = qa.inverse_predict(curve, statistics.mean(y), 3)
            hits += lo <= truth <= hi
        self.assertGreaterEqual(hits / n, 0.92)
        self.assertLessEqual(hits / n, 0.98)


class PerGram(unittest.TestCase):
    def test_arithmetic(self):
        # 100 copies/rxn, 2 ul of a 100 ul eluate, from 0.25 g soil = 100 * 50 / 0.25
        self.assertAlmostEqual(qa.copies_per_gram(100, 100, 2, 0.25), 20000.0)
        self.assertAlmostEqual(qa.copies_per_gram(100, 100, 2, 0.25, dilution=10), 200000.0)
        self.assertAlmostEqual(qa.copies_per_gram(1, 50, 5, 1.0), 10.0)

    def test_rejects_impossible_inputs(self):
        for args in ((1, 100, 0, 0.25), (1, 100, 2, 0), (1, 2, 5, 1.0), (1, 100, 2, -1),
                     (1, 100, 2, float("nan")), (1, 100, 2, 1, 0.5)):
            with self.assertRaises(ValueError):
                qa.copies_per_gram(*args)


def plate(*extra, ntc="Undetermined", blank="Undetermined"):
    rows = [("NTC1", "ntc", "human", ntc), ("NTC1", "ntc", "ipc", 28.0),
            ("EB1", "extraction_blank", "human", blank), ("EB1", "extraction_blank", "ipc", 28.1)]
    rows += list(extra)
    return [{"sample_id": s, "role": r, "target": t, "ct": qa.qi._ct(c)} for s, r, t, c in rows]


def sample(sid, cts, ipc=28.2):
    return [(sid, "unknown", "human", c) for c in cts] + [(sid, "unknown", "ipc", ipc)]


class Calls(unittest.TestCase):
    ARGS = dict(elution_ul=100, template_ul=2, soil_g=0.25)

    def setUp(self):
        self.st = good_standards()
        val = qa.validate(self.st)
        self.assertTrue(val["validation_ok"], val["problems"])
        self.lod = val["limits_for_calls"]["lod95_copies_per_reaction"]
        self.loq = val["limits_for_calls"]["loq_copies_per_reaction"]

    def calls(self, rows, **kw):
        res = qa.quantify(self.st, rows, **dict(self.ARGS, **kw))
        return res, {s["sample_id"]: s for s in res["samples"]}

    def test_full_ordering_on_a_clean_run(self):
        hi = ct_of(5000)
        rows = plate(*sample("Q", [hi, hi + 0.1, hi - 0.1]),
                     *sample("N", ["Undetermined"] * 3),
                     *sample("INH", [hi] * 3, ipc=31.0),
                     *sample("MID", [ct_of(math.sqrt(self.lod * self.loq))] * 2 + ["Undetermined"]),
                     *sample("LOW", [ct_of(self.lod / 4), "Undetermined", "Undetermined"]),
                     *sample("DISC", [hi, hi + 3.0, hi]))
        res, c = self.calls(rows)
        self.assertTrue(res["run_valid"], res["run_problems"])
        self.assertEqual(c["Q"]["call"], "QUANTIFIED")
        lo, up = c["Q"]["copies_per_g_soil"]["pi95"]
        self.assertLess(lo, 5000 * 50 / 0.25)
        self.assertGreater(up, 5000 * 50 / 0.25)
        self.assertEqual(c["N"]["call"], "NOT_DETECTED")
        self.assertIn("cannot exclude presence below LOD", c["N"]["call_text"])
        self.assertEqual(c["INH"]["call"], "INCONCLUSIVE")
        self.assertEqual(c["MID"]["call"], "DETECTED_NOT_QUANTIFIABLE")
        self.assertNotIn("copies_per_g_soil", c["MID"])
        self.assertEqual(c["LOW"]["call"], "DETECTED_BELOW_LOD")
        self.assertEqual(c["DISC"]["call"], "INCONCLUSIVE")
        for s in res["samples"]:
            self.assertIn("not an identification", s["note"])
        self.assertIn("not an identification", res["interpretation"])

    def test_contaminated_ntc_is_inconclusive_even_with_strong_signal(self):
        res, c = self.calls(plate(*sample("S", [ct_of(1e5)] * 3), ntc=30.0))
        self.assertFalse(res["run_valid"])
        self.assertEqual(c["S"]["call"], "INCONCLUSIVE")
        self.assertTrue(any("contamination" in r for r in c["S"]["reasons"]))

    def test_contaminated_extraction_blank_is_inconclusive(self):
        _, c = self.calls(plate(*sample("S", ["Undetermined"] * 3), blank=36.0))
        self.assertEqual(c["S"]["call"], "INCONCLUSIVE")  # never NOT_DETECTED

    def test_inhibition_beats_a_negative(self):
        _, c = self.calls(plate(*sample("S", ["Undetermined"] * 3, ipc="Undetermined")))
        self.assertEqual(c["S"]["call"], "INCONCLUSIVE")
        _, c = self.calls(plate(*sample("S", ["Undetermined"] * 3, ipc=30.1)))  # shift 2.1 > 2.0
        self.assertEqual(c["S"]["call"], "INCONCLUSIVE")
        _, c = self.calls(plate(*sample("S", ["Undetermined"] * 3, ipc=29.9)))  # shift 1.9
        self.assertEqual(c["S"]["call"], "NOT_DETECTED")

    def test_failed_standard_curve_makes_everything_inconclusive(self):
        bad = [(c, ct_of(c, slope=-4.2)) for c, _ in self.st if _ is not None]
        res = qa.quantify(bad, plate(*sample("S", ["Undetermined"] * 3)), **self.ARGS)
        self.assertFalse(res["run_valid"])
        self.assertEqual(res["samples"][0]["call"], "INCONCLUSIVE")

    def test_dropout_at_low_level_is_not_discordance(self):
        _, c = self.calls(plate(*sample("S", [ct_of(self.lod / 4) + 1.8, ct_of(self.lod / 4),
                                              "Undetermined"])))
        self.assertEqual(c["S"]["call"], "DETECTED_BELOW_LOD")


class Cli(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.std = self.write("std.csv", ["copies", "ct"],
                              [(c, "" if ct is None else round(ct, 3)) for c, ct in good_standards()])
        rows = [("NTC1", "ntc", "human", "Undetermined"), ("NTC1", "ntc", "ipc", 28.0)]
        rows += sample("S1", [round(ct_of(5000), 2)] * 3)
        self.plate = self.write("plate.csv", ["sample_id", "role", "target", "ct"], rows)

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, name, header, rows):
        p = os.path.join(self.tmp.name, name)
        with open(p, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(header)
            w.writerows(rows)
        return p

    def run_main(self, argv):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = qa.main(argv)
        return code, out.getvalue(), err.getvalue()

    def test_validate_and_quantify_emit_json(self):
        code, out, _ = self.run_main(["validate", self.std])
        self.assertEqual(code, 0)
        self.assertTrue(json.loads(out)["validation_ok"])
        dest = os.path.join(self.tmp.name, "q.json")
        code, out, _ = self.run_main(["quantify", "--standards", self.std, self.plate, "--elution-ul", "100",
                                      "--template-ul", "2", "--soil-g", "0.25", "--out", dest])
        self.assertEqual(code, 0)
        with open(dest) as f:
            self.assertEqual(json.load(f)["samples"][0]["call"], "QUANTIFIED")

    def test_bad_input_exits_2(self):
        bad_ct = self.write("bad.csv", ["copies", "ct"], [(100, "abc"), (1000, 28.0)])
        bad_copies = self.write("bad2.csv", ["copies", "ct"], [(0, 30.0)])
        wrong_cols = self.write("bad3.csv", ["conc", "cq"], [(100, 30.0)])
        for argv in (["validate", bad_ct], ["validate", bad_copies], ["validate", wrong_cols],
                     ["validate", os.path.join(self.tmp.name, "missing.csv")],
                     ["quantify", "--standards", self.std, self.plate, "--elution-ul", "100",
                      "--template-ul", "2", "--soil-g", "0"],
                     ["quantify", "--standards", self.std, self.plate, "--elution-ul", "1",
                      "--template-ul", "2", "--soil-g", "0.25"]):
            code, out, err = self.run_main(argv)
            self.assertEqual(code, 2, argv)
            self.assertEqual(out, "")
            self.assertIn("error:", err)

    def test_missing_required_flag_exits_2(self):
        with self.assertRaises(SystemExit) as cm, contextlib.redirect_stderr(io.StringIO()):
            qa.main(["quantify", "--standards", self.std, self.plate, "--elution-ul", "100"])
        self.assertEqual(cm.exception.code, 2)

    def test_qc_failure_exits_1(self):
        rows = [("NTC1", "ntc", "human", 31.0), ("NTC1", "ntc", "ipc", 28.0)] + sample("S1", [25.0] * 3)
        contaminated = self.write("c.csv", ["sample_id", "role", "target", "ct"], rows)
        code, out, _ = self.run_main(["quantify", "--standards", self.std, contaminated, "--elution-ul", "100",
                                      "--template-ul", "2", "--soil-g", "0.25"])
        self.assertEqual(code, 1)
        self.assertEqual(json.loads(out)["samples"][0]["call"], "INCONCLUSIVE")


if __name__ == "__main__":
    unittest.main()
