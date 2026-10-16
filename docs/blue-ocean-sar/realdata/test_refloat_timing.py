"""Offline tests for refloat_timing.py with synthetic temperature series."""

import contextlib
import csv
import datetime as dt
import io
import json
import math
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import refloat_timing as rt  # noqa: E402

D0 = dt.date(2026, 5, 1)


def _write_csv(path, temps, start=D0, skip=()):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["date", "temp_c"])
        for i, t in enumerate(temps):
            if i not in skip:
                w.writerow([(start + dt.timedelta(days=i)).isoformat(), t])


def _run(args):
    err = io.StringIO()
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(err):
        code = rt.main(args)
    return code, err.getvalue()


class Arithmetic(unittest.TestCase):
    def test_add_sums_daily_means(self):
        acc = rt.accumulate([10.0, 12.0, 8.0])
        self.assertEqual([c for c, _ in acc], [10.0, 12.0, 8.0])
        self.assertEqual(acc[-1][1], 30.0)

    def test_below_threshold_days_contribute_nothing(self):
        acc = rt.accumulate([6.9, 7.0, 3.0, 12.0], min_temp_c=7.0)
        self.assertEqual([c for c, _ in acc], [0.0, 7.0, 0.0, 12.0])
        self.assertEqual(acc[-1][1], 19.0)

    def test_base_temperature_and_negative_days(self):
        self.assertEqual(rt.daily_contribution(-2.0), 0.0)
        self.assertEqual(rt.daily_contribution(10.0, base_temp_c=4.0), 6.0)

    def test_first_day_fraction(self):
        acc = rt.accumulate([10.0, 10.0], first_day_fraction=0.25)
        self.assertEqual(acc[-1][1], 12.5)

    def test_lognormal_median_and_iqr(self):
        self.assertAlmostEqual(rt.lognormal_cdf(97.0, 97.0, 0.5), 0.5)
        s = rt.sigma_from_iqr(60.0, 150.0)
        self.assertAlmostEqual(rt.lognormal_cdf(60.0, math.sqrt(60 * 150), s), 0.25, places=6)
        self.assertAlmostEqual(rt.lognormal_cdf(150.0, math.sqrt(60 * 150), s), 0.75, places=6)
        self.assertEqual(rt.lognormal_cdf(0.0, 97.0, 0.5), 0.0)

    def test_beta44_cdf_symmetric(self):
        self.assertAlmostEqual(rt.beta44_cdf(0.5), 0.5)
        self.assertAlmostEqual(rt.beta44_cdf(0.3) + rt.beta44_cdf(0.7), 1.0)


class Series(unittest.TestCase):
    def test_gap_interpolated_and_long_gap_refused(self):
        by = {D0: 10.0, D0 + dt.timedelta(days=2): 14.0}
        rows = rt.daily_series(by, D0)
        self.assertEqual([r[2] for r in rows], ["observed", "interpolated", "observed"])
        self.assertAlmostEqual(rows[1][1], 12.0)
        with self.assertRaises(rt.InputError):
            rt.daily_series({D0: 10.0, D0 + dt.timedelta(days=5): 10.0}, D0)

    def test_incident_must_be_in_series(self):
        with self.assertRaises(rt.InputError):
            rt.daily_series({D0: 10.0}, D0 - dt.timedelta(days=1))

    def test_monotone_cdf_and_window(self):
        rng = [12.0 + 4 * math.sin(i / 5.0) for i in range(40)]
        rng[5:9] = [3.0] * 4  # cold snap below 7 degC
        rows = [(D0 + dt.timedelta(days=i), t, "observed") for i, t in enumerate(rng)]
        table, _ = rt.refloat_table(rows, 97.0, 0.4, min_temp_c=7.0)
        p = [r["p_refloated"] for r in table]
        self.assertTrue(all(b >= a for a, b in zip(p, p[1:])))
        self.assertTrue(all(0.0 <= v <= 1.0 for v in p))
        self.assertEqual(p[5:9], [p[4]] * 4)  # flat through the cold snap
        w = rt.window(table)
        self.assertLess(w["p10"]["date"], w["p50"]["date"])
        self.assertLessEqual(w["p50"]["date"], w["p90"]["date"])
        self.assertGreaterEqual(w["p50"]["add"], 97.0)


class Cli(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.csv = os.path.join(self.tmp.name, "t.csv")
        _write_csv(self.csv, [10.0] * 30)
        self.out = os.path.join(self.tmp.name, "out")

    def tearDown(self):
        self.tmp.cleanup()

    def test_missing_spread_exits_2(self):
        code, err = _run(["--csv", self.csv, "--incident", D0.isoformat(), "--preset", "egusphere-2026-5071",
                          "--out-dir", self.out])
        self.assertEqual(code, 2)
        self.assertIn("not invented", err)
        self.assertFalse(os.path.exists(os.path.join(self.out, "refloat.json")))

    def test_missing_median_exits_2(self):
        code, _ = _run(["--csv", self.csv, "--incident", D0.isoformat(), "--add-log-sd", "0.4",
                        "--out-dir", self.out])
        self.assertEqual(code, 2)

    def test_incident_outside_series_exits_2(self):
        code, _ = _run(["--csv", self.csv, "--incident", "2026-04-01", "--preset", "egusphere-2026-5071",
                        "--add-log-sd", "0.4", "--out-dir", self.out])
        self.assertEqual(code, 2)

    def test_bad_csv_exits_2(self):
        bad = os.path.join(self.tmp.name, "bad.csv")
        with open(bad, "w") as f:
            f.write("when,deg\n2026-05-01,10\n")
        code, _ = _run(["--csv", bad, "--incident", D0.isoformat(), "--preset", "egusphere-2026-5071",
                        "--add-log-sd", "0.4", "--out-dir", self.out])
        self.assertEqual(code, 2)

    def test_full_run_writes_labelled_json(self):
        code, err = _run(["--csv", self.csv, "--incident", D0.isoformat(), "--preset", "egusphere-2026-5071",
                          "--add-iqr", "60", "150", "--over-65", "--out-dir", self.out])
        self.assertEqual(code, 0)
        with open(os.path.join(self.out, "refloat.json")) as f:
            rep = json.load(f)
        self.assertEqual(rep["label"], "preprint, not peer-reviewed")
        self.assertEqual(rep["drift_envelope"]["label"], "preprint, not peer-reviewed")
        self.assertEqual(rep["model"]["add_median"], 97.0)
        # 10 degC per day from day 0 -> ADD 97 is crossed on day 9 (ADD 100).
        self.assertEqual(rep["window"]["p50"]["date"], "2026-05-10")
        self.assertEqual(rep["drift_envelope"]["elapsed_hours_at_quantile"]["p50"], 240.0)
        self.assertIn("four times", " ".join(rep["warnings"]))
        self.assertIsNotNone(rep["comparison_model"]["window"])

    def test_all_cold_series_warns_and_stays_zero(self):
        _write_csv(self.csv, [5.0] * 20)
        code, err = _run(["--csv", self.csv, "--incident", D0.isoformat(), "--preset", "egusphere-2026-5071",
                          "--add-log-sd", "0.4", "--out-dir", self.out])
        self.assertEqual(code, 0)
        with open(os.path.join(self.out, "refloat.json")) as f:
            rep = json.load(f)
        self.assertEqual(rep["p_refloated_at_last_day"], 0.0)
        self.assertIsNone(rep["window"]["p50"])
        self.assertIn("below 7.0", err)

    def test_usgs_file_reader(self):
        doc = {"value": {"timeSeries": [{
            "sourceInfo": {"siteCode": [{"value": "12345678"}], "siteName": "TEST RIVER"},
            "variable": {"variableCode": [{"value": "00010"}], "unit": {"unitCode": "deg C"},
                         "noDataValue": -999999.0, "variableName": "Temperature, water"},
            "values": [{"method": [{"methodID": 1}], "qualifier": [], "value": [
                {"value": "10.0", "dateTime": "2026-05-01T00:00:00.000-07:00", "qualifiers": ["P"]},
                {"value": "12.0", "dateTime": "2026-05-01T12:00:00.000-07:00", "qualifiers": ["P"]},
                {"value": "-999999", "dateTime": "2026-05-02T00:00:00.000-07:00", "qualifiers": ["P"]},
                {"value": "9.0", "dateTime": "2026-05-02T12:00:00.000-07:00", "qualifiers": ["P"]},
            ]}]}]}}
        p = os.path.join(self.tmp.name, "iv.json")
        with open(p, "w") as f:
            json.dump(doc, f)
        by, meta = rt.from_usgs(doc)
        self.assertEqual(by[D0], 11.0)
        self.assertEqual(by[D0 + dt.timedelta(days=1)], 9.0)
        self.assertEqual(meta["site"], "12345678")
        code, _ = _run(["--usgs-file", p, "--incident", D0.isoformat(), "--preset", "egusphere-2026-5071",
                        "--add-log-sd", "0.4", "--out-dir", self.out])
        self.assertEqual(code, 0)


if __name__ == "__main__":
    unittest.main()
