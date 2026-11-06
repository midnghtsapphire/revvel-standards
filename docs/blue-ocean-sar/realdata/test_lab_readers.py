"""Tests for lab_readers.py with synthetic fixtures that have known answers.

GC-MS tests need numpy (scipy is optional: the numpy fallback peak finder is
tested either way). 16S tests use the standard library only."""

import importlib
import io
import json
import math
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lab_readers as lr  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


def _has(module):
    try:
        importlib.import_module(module)
        return True
    except ImportError:
        return False


HAS_NUMPY = _has("numpy")
HAS_SCIPY = HAS_NUMPY and _has("scipy.signal")
HAS_MZML_READER = _has("pyteomics") or _has("pymzml")

if HAS_NUMPY:
    import numpy as np

# (name, rt, height, sigma) — area of h*exp(-(t-rt)^2 / (2 sigma^2)) is h*sigma*sqrt(2*pi)
SAMPLE_PEAKS = [("dimethyl disulfide", 2.1, 110000.0, 0.025), ("putrescine", 4.2, 200000.0, 0.03),
                ("cadaverine", 5.8, 240000.0, 0.035), ("indole", 9.4, 80000.0, 0.03)]
CONTROL_PEAKS = [("putrescine", 4.2, 20000.0, 0.03), ("matrix", 8.0, 65000.0, 0.04)]
METHOD = {"rt_tolerance_min": 0.1, "targets": [
    {"name": "putrescine", "expected_rt_min": 4.21}, {"name": "cadaverine", "expected_rt_min": 5.78},
    {"name": "indole", "expected_rt_min": 9.4}, {"name": "skatole", "expected_rt_min": 10.1},
    {"name": "dimethyl disulfide", "expected_rt_min": 2.1}]}


def _area(h, sigma):
    return h * sigma * math.sqrt(2 * math.pi)


def _trace(peaks, seed, baseline=5000.0, noise=50.0):
    rt = np.arange(0.5, 12.0, 0.005)
    y = baseline + np.random.default_rng(seed).normal(0.0, noise, rt.size)
    for _, mu, h, s in peaks:
        y = y + h * np.exp(-((rt - mu) ** 2) / (2 * s * s))
    return rt, y


def _write_csv(path, rt, y):
    with open(path, "w", encoding="utf-8") as f:
        f.write("retention_time_min,intensity\n")
        for a, b in zip(rt, y):
            f.write(f"{a:.4f},{b:.3f}\n")


@unittest.skipUnless(HAS_NUMPY, "numpy not installed")
class GcmsPeaks(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.s_path = os.path.join(self.tmp.name, "sample.csv")
        self.c_path = os.path.join(self.tmp.name, "control.csv")
        _write_csv(self.s_path, *_trace(SAMPLE_PEAKS, 1))
        _write_csv(self.c_path, *_trace(CONTROL_PEAKS, 2))
        self.m_path = os.path.join(self.tmp.name, "method.json")
        with open(self.m_path, "w") as f:
            json.dump(METHOD, f)

    def tearDown(self):
        self.tmp.cleanup()

    def _check_areas(self, use_scipy):
        rt, y = lr.read_tic(self.s_path)
        peaks = lr.detect_peaks(rt, y, use_scipy=use_scipy)
        self.assertEqual(len(peaks), len(SAMPLE_PEAKS), [p["apex_rt_min"] for p in peaks])
        for (name, mu, h, s), p in zip(sorted(SAMPLE_PEAKS, key=lambda t: t[1]), peaks):
            self.assertAlmostEqual(p["apex_rt_min"], mu, delta=0.006, msg=name)
            self.assertLess(abs(p["area"] - _area(h, s)) / _area(h, s), 0.05, f"{name}: {p['area']} vs {_area(h, s)}")

    def test_numpy_fallback_areas_within_5pct(self):
        self._check_areas(use_scipy=False)

    @unittest.skipUnless(HAS_SCIPY, "scipy not installed")
    def test_scipy_areas_within_5pct(self):
        self._check_areas(use_scipy=True)

    def test_overlapping_peaks_split_at_valley(self):
        rt = np.arange(0.0, 4.0, 0.002)
        y = 1000 + sum(50000 * np.exp(-((rt - mu) ** 2) / (2 * 0.03 ** 2)) for mu in (1.9, 2.1))
        peaks = lr.detect_peaks(rt, y, use_scipy=False)
        self.assertEqual(len(peaks), 2)
        self.assertLessEqual(peaks[0]["end_rt_min"], 2.0 + 1e-9)
        self.assertGreaterEqual(peaks[1]["start_rt_min"], 2.0 - 1e-9)

    def test_targets_found_missing_and_control_ratio(self):
        _, targets = lr.load_method(self.m_path)
        res = lr.compare_gcms(lr.read_tic(self.s_path), lr.read_tic(self.c_path), targets)
        by = {r["target"]: r for r in res["targets"]}
        # skatole is in the method but not in the sample
        self.assertFalse(by["skatole"]["sample_peak_at_expected_rt"])
        self.assertIsNone(by["skatole"]["sample_area"])
        # putrescine in both: ratio = 200000/20000 = 10
        self.assertTrue(by["putrescine"]["control_peak_at_expected_rt"])
        self.assertLess(abs(by["putrescine"]["ratio_sample_to_control"] - 10.0) / 10.0, 0.05)
        # cadaverine only in sample: no ratio, but a window area from the control
        self.assertTrue(by["cadaverine"]["sample_peak_at_expected_rt"])
        self.assertIsNone(by["cadaverine"]["ratio_sample_to_control"])
        self.assertLess(by["cadaverine"]["control_area_over_sample_window"], 0.01 * by["cadaverine"]["sample_area"])
        self.assertIn("Mass-spectral confirmation", res["identification_note"])

    def test_peak_outside_tolerance_is_not_matched(self):
        _, targets = lr.load_method(self.m_path)
        shifted = [dict(t, expected_rt_min=t["expected_rt_min"] + 0.15) for t in targets]
        res = lr.compare_gcms(lr.read_tic(self.s_path), lr.read_tic(self.c_path), shifted)
        self.assertFalse(any(r["sample_peak_at_expected_rt"] for r in res["targets"]))

    def test_example_method_refused_unless_allowed(self):
        ex = os.path.join(HERE, "gcms_method.example.json")
        with self.assertRaises(lr.LabInputError):
            lr.load_method(ex)
        method, targets = lr.load_method(ex, allow_example=True)
        self.assertTrue(method["example"])
        self.assertEqual({t["name"] for t in targets}, set(lr.DEFAULT_TARGET_NAMES))
        with redirect_stderr(io.StringIO()):
            code = lr.main(["gcms", "--sample", self.s_path, "--control", self.c_path, "--method", ex,
                            "--out", os.path.join(self.tmp.name, "o.json")])
        self.assertEqual(code, 2)

    def test_cli_writes_report(self):
        out = os.path.join(self.tmp.name, "o.json")
        self.assertEqual(lr.main(["gcms", "--sample", self.s_path, "--control", self.c_path, "--method",
                                  self.m_path, "--out", out]), 0)
        with open(out) as f:
            rep = json.load(f)
        self.assertFalse(rep["method_is_example"])
        self.assertEqual(len(rep["targets"]), 5)

    def test_bad_csv_columns(self):
        bad = os.path.join(self.tmp.name, "bad.csv")
        with open(bad, "w") as f:
            f.write("time,signal\n1,2\n")
        with self.assertRaises(lr.LabInputError):
            lr.read_tic(bad)

    @unittest.skipIf(HAS_MZML_READER, "an mzML reader is installed")
    def test_mzml_without_reader_gives_clear_error(self):
        p = os.path.join(self.tmp.name, "run.mzML")
        with open(p, "w") as f:
            f.write("<mzML/>")
        with self.assertRaisesRegex(lr.LabInputError, "pyteomics or pymzml"):
            lr.read_tic(p)


TABLE = """# Constructed from biom file
#OTU ID\tEFF\tCTRL\ttaxonomy
f1\t30\t2\td__Bacteria; p__Firmicutes; c__Clostridia; o__Clostridiales; f__Clostridiaceae; g__Clostridium
f2\t10\t0\td__Bacteria; p__Firmicutes; c__Clostridia; o__Clostridiales; f__Peptostreptococcaceae
f3\t40\t8\td__Bacteria; p__Proteobacteria; c__Gammaproteobacteria; o__Enterobacterales; f__Enterobacteriaceae
f4\t20\t180\td__Bacteria; p__Proteobacteria; c__Gammaproteobacteria; o__Pseudomonadales; f__Pseudomonadaceae
f5\t0\t10\td__Bacteria; p__Firmicutes; c__Bacilli; o__Bacillales; f__
"""
# EFF total 100, CTRL total 200; FC with pseudocount 1 = ((n_s+1)/100) / ((n_c+1)/200)
EXPECTED_FAMILY = {
    "Clostridiaceae": (0.30, 0.01, (31 / 100) / (3 / 200)),
    "Peptostreptococcaceae": (0.10, 0.0, (11 / 100) / (1 / 200)),
    "Enterobacteriaceae": (0.40, 0.04, (41 / 100) / (9 / 200)),
    "Pseudomonadaceae": (0.20, 0.90, (21 / 100) / (181 / 200)),
    "Bacillales (unassigned family)": (0.0, 0.05, (1 / 100) / (11 / 200)),
}


class SixteenS(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.tmp.name, "table.tsv")
        with open(self.path, "w") as f:
            f.write(TABLE)

    def tearDown(self):
        self.tmp.cleanup()

    def _check(self, res):
        rows = {r["taxon"]: r for r in res["all_taxa"]}
        self.assertEqual(set(rows), set(EXPECTED_FAMILY))
        for name, (rs, rc, fc) in EXPECTED_FAMILY.items():
            self.assertAlmostEqual(rows[name]["sample_rel_abundance"], rs, places=12, msg=name)
            self.assertAlmostEqual(rows[name]["control_rel_abundance"], rc, places=12, msg=name)
            self.assertAlmostEqual(rows[name]["fold_change"], fc, places=12, msg=name)
            self.assertAlmostEqual(rows[name]["log2_fold_change"], math.log2(fc), places=12, msg=name)

    def test_family_relative_abundance_and_fold_change_exact(self):
        samples, feats = lr.read_feature_table(self.path)
        self.assertEqual(samples, ["EFF", "CTRL"])
        res = lr.compare_16s(samples, feats, "EFF", "CTRL", rank="family", top=2)
        self._check(res)
        self.assertEqual((res["sample_total_reads"], res["control_total_reads"]), (100.0, 200.0))
        # ranked by |log2 FC|: Peptostreptococcaceae (22x) then Clostridiaceae (20.67x)
        self.assertEqual([r["taxon"] for r in res["top_changes"]], ["Peptostreptococcaceae", "Clostridiaceae"])
        self.assertAlmostEqual(sum(res["relative_abundance"]["CTRL"].values()), 1.0, places=12)

    def test_order_rank_aggregates(self):
        samples, feats = lr.read_feature_table(self.path)
        res = lr.compare_16s(samples, feats, "EFF", "CTRL", rank="order")
        rows = {r["taxon"]: r for r in res["all_taxa"]}
        self.assertAlmostEqual(rows["Clostridiales"]["sample_rel_abundance"], 0.40, places=12)
        self.assertAlmostEqual(rows["Clostridiales"]["fold_change"], (41 / 100) / (3 / 200), places=12)
        self.assertIn("Bacillales", rows)

    def test_long_csv_gives_same_answer(self):
        samples, feats = lr.read_feature_table(self.path)
        long_path = os.path.join(self.tmp.name, "long.csv")
        with open(long_path, "w") as f:
            f.write("taxon,sample,count\n")
            for tax, counts in feats:
                for s, n in counts.items():
                    f.write(f"\"{tax}\",{s},{n:g}\n")
        s2, f2 = lr.read_feature_table(long_path)
        self._check(lr.compare_16s(s2, f2, "EFF", "CTRL", rank="family"))

    def test_separate_taxonomy_file(self):
        samples, feats = lr.read_feature_table(self.path)
        bare = os.path.join(self.tmp.name, "bare.tsv")
        taxf = os.path.join(self.tmp.name, "taxonomy.tsv")
        with open(bare, "w") as fb, open(taxf, "w") as ft:
            fb.write("#OTU ID\tEFF\tCTRL\n")
            ft.write("Feature ID\tTaxon\tConfidence\n")
            for i, (tax, c) in enumerate(feats, start=1):
                fb.write(f"f{i}\t{c['EFF']:g}\t{c['CTRL']:g}\n")
                ft.write(f"f{i}\t{tax}\t0.99\n")
        s2, f2 = lr.read_feature_table(bare, lr.read_taxonomy_tsv(taxf))
        self._check(lr.compare_16s(s2, f2, "EFF", "CTRL", rank="family"))

    def test_pseudocount_changes_fold_change(self):
        samples, feats = lr.read_feature_table(self.path)
        res = lr.compare_16s(samples, feats, "EFF", "CTRL", rank="family", pseudocount=0.5)
        rows = {r["taxon"]: r for r in res["all_taxa"]}
        self.assertAlmostEqual(rows["Peptostreptococcaceae"]["fold_change"], (10.5 / 100) / (0.5 / 200), places=12)

    def test_unknown_sample_and_cli_exit_codes(self):
        samples, feats = lr.read_feature_table(self.path)
        with self.assertRaises(lr.LabInputError):
            lr.compare_16s(samples, feats, "EFF", "NOPE")
        with redirect_stderr(io.StringIO()):
            self.assertEqual(lr.main(["16s", "--table", self.path, "--sample", "EFF", "--control", "NOPE"]), 2)
        out = os.path.join(self.tmp.name, "o.json")
        self.assertEqual(lr.main(["16s", "--table", self.path, "--sample", "EFF", "--control", "CTRL",
                                  "--out", out]), 0)
        with open(out) as f:
            self.assertEqual(json.load(f)["rank"], "family")

    def test_taxonomy_string_parsing(self):
        self.assertEqual(lr.taxon_at_rank("k__Bacteria;p__Firmicutes", "phylum"), "Firmicutes")
        self.assertEqual(lr.taxon_at_rank("D_0__Bacteria;D_1__Firmicutes;D_2__Clostridia", "class"), "Clostridia")
        self.assertEqual(lr.taxon_at_rank("Bacteria;Firmicutes;Clostridia;Clostridiales", "order"), "Clostridiales")
        self.assertEqual(lr.taxon_at_rank("Unassigned", "family"), "Unassigned")
        self.assertEqual(lr.taxon_at_rank("d__Bacteria; p__", "family"), "Bacteria (unassigned family)")
        self.assertEqual(lr.taxon_at_rank("", "family"), "Unassigned")


if __name__ == "__main__":
    unittest.main()
