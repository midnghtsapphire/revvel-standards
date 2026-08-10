"""Basic test harness for the AI architecture framework."""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

from cuda_mlops_wrapper import provision, detect_compute, HARDWARE_COST  # noqa: E402
from market_evaluator import pick_top, publish, run  # noqa: E402


class TestCudaWrapper(unittest.TestCase):
    def test_detect_returns_resource(self):
        r = detect_compute()
        self.assertIn(r.device, ("cpu", "cuda"))
        self.assertGreater(r.cost_per_hour, 0)

    def test_provision_respects_cost_cap(self):
        r = provision(max_cost_per_hour=0.10)
        self.assertLessEqual(r.cost_per_hour, HARDWARE_COST["cpu"] + 0.001)


class TestMarketEvaluator(unittest.TestCase):
    def test_pick_top_returns_three(self):
        picks = pick_top(3)
        self.assertEqual(len(picks), 3)
        for p in picks:
            self.assertTrue(p.title.startswith("[TEST VERSION]"))
            self.assertEqual(p.price_usd, 0.0)

    def test_publish_returns_url(self):
        picks = pick_top(1)
        result = publish(picks[0])
        self.assertIn("url", result)
        self.assertIn(result["platform"], ("stripe", "gumroad"))

    def test_run_produces_report(self):
        report = run()
        self.assertIn("concepts", report)
        self.assertEqual(len(report["concepts"]), 3)
        self.assertEqual(len(report["published"]), 3)


if __name__ == "__main__":
    unittest.main()
