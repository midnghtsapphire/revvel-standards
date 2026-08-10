"""Test harness for the AI architecture framework."""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..")))

os.environ["MOCK_MODE"] = "1"

import cuda_mlops_wrapper  # noqa: E402
import market_evaluator  # noqa: E402


class TestCudaWrapper(unittest.TestCase):
    def test_provision_returns_plan(self):
        plan = cuda_mlops_wrapper.provision()
        self.assertIn(plan.device, {"cpu", "cuda"})
        self.assertGreaterEqual(plan.estimated_cost_per_hour_usd, 0)

    def test_mock_mode_forces_cpu(self):
        plan = cuda_mlops_wrapper.provision()
        # In MOCK_MODE we skip detection => cpu path
        self.assertEqual(plan.device, "cpu")
        self.assertTrue(plan.mocked)


class TestMarketEvaluator(unittest.TestCase):
    def test_evaluate_returns_three(self):
        plans = market_evaluator.evaluate()
        self.assertEqual(len(plans), 3)

    def test_plans_are_test_version(self):
        for plan in market_evaluator.evaluate():
            self.assertEqual(plan.version, "TEST VERSION")
            self.assertTrue(plan.stripe_product_id.startswith("prod_test_"))
            self.assertIn("gumroad.com", plan.gumroad_url)

    def test_scores_are_descending(self):
        plans = market_evaluator.evaluate()
        scores = [p.score for p in plans]
        self.assertEqual(scores, sorted(scores, reverse=True))


if __name__ == "__main__":
    unittest.main()
