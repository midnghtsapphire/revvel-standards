"""Tests for sar_change_detection. Run: python3 -m unittest discover -s docs/sar-change-detection"""

import importlib.util
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

HAS_NUMPY = importlib.util.find_spec("numpy") is not None
HAS_MPL = importlib.util.find_spec("matplotlib") is not None

if HAS_NUMPY:
    import numpy as np

    import sar_change_detection as s


@unittest.skipUnless(HAS_NUMPY, "numpy not installed")
class Detection(unittest.TestCase):
    def test_recovers_step_time_and_size(self) -> None:
        data = s.analyze(event_year=2013.5, step_db=4.0, seed=42)
        for band in ("C", "P"):
            r = data["bands"][band]["result"]
            self.assertTrue(r["detected"], band)
            self.assertAlmostEqual(r["change_time"], 2013.5, delta=0.2)
            self.assertAlmostEqual(r["step_db"], 4.0, delta=0.5)

    def test_negative_step_detected(self) -> None:
        r = s.analyze(event_year=2018.0, step_db=-3.0, seed=3)["bands"]["P"]["result"]
        self.assertTrue(r["detected"])
        self.assertLess(r["step_db"], -2.0)

    def test_false_alarm_rate_low_without_event(self) -> None:
        alarms = sum(
            v["result"]["detected"] for k in range(60) for v in s.analyze(event_year=None, seed=k)["bands"].values()
        )
        self.assertLessEqual(alarms, 3, "sup-F threshold should keep false alarms near 5% or lower")

    def test_stability_flags(self) -> None:
        rng = np.random.default_rng(1)
        t = 2005 + np.arange(240) / 12
        quiet = -9 + 0.8 * rng.normal(size=240)
        quiet[100:] += 4
        self.assertTrue(s.detect_step(t, quiet).stable_baseline)
        noisy = -9 + 0.8 * rng.normal(size=240)
        noisy[100:] += 4 + 1.6 * rng.normal(size=140)
        self.assertFalse(s.detect_step(t, noisy).stable_baseline)
        drift = -9 + 0.8 * rng.normal(size=240)
        drift[100:] += 4 + 0.25 * (t[100:] - t[100])
        self.assertFalse(s.detect_step(t, drift).stable_baseline)

    def test_input_validation(self) -> None:
        with self.assertRaises(ValueError):
            s.detect_step([1, 2, 3], [1, 2, 3])
        with self.assertRaises(ValueError):
            s.detect_step(np.zeros(30), np.zeros(30))
        with self.assertRaises(ValueError):
            s.analyze(years=2)

    def test_cli_json(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, "r.json")
            s.main(["--no-table", "--out", out, "--seed", "5"])
            with open(out) as f:
                data = json.load(f)
        self.assertTrue(data["synthetic"])
        self.assertEqual(len(data["bands"]["C"]["series"]["t_year"]), 240)

    @unittest.skipUnless(HAS_MPL, "matplotlib not installed")
    def test_plot_written(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            png = os.path.join(d, "p.png")
            s.plot(s.analyze(seed=2), png)
            self.assertGreater(os.path.getsize(png), 10_000)


if __name__ == "__main__":
    unittest.main()
