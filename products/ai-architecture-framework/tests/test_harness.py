"""Basic test harness for the AI architecture framework modules."""
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from cuda_mlops_wrapper import plan_provisioning, plan_to_json  # noqa: E402
from market_evaluator import run, select_candidates  # noqa: E402


class TestCudaWrapper(unittest.TestCase):
    def test_plan_has_mode(self):
        plan = plan_provisioning()
        self.assertIn(plan.mode, {"gpu", "cpu"})
        self.assertGreaterEqual(plan.estimated_cost_per_hour, 0.0)

    def test_plan_serializes(self):
        plan = plan_provisioning()
        payload = plan_to_json(plan)
        self.assertIn("mode", payload)


class TestMarketEvaluator(unittest.TestCase):
    def test_selects_three(self):
        candidates = select_candidates(3, seed=42)
        self.assertEqual(len(candidates), 3)
        for c in candidates:
            self.assertTrue(c.title.startswith("[TEST VERSION]"))
            self.assertEqual(c.price_usd, 0.0)

    def test_run_produces_listings(self):
        result = run(seed=42)
        self.assertEqual(len(result["listings"]), 3)
        for listing in result["listings"]:
            self.assertIn(listing["platform"], {"stripe", "gumroad"})
            self.assertTrue(listing["status"].startswith("created"))


if __name__ == "__main__":
    unittest.main()
