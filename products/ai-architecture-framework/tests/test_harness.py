"""Test harness for AI Architecture framework."""
import os
import sys
import unittest

sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
)

from cuda_mlops_wrapper import CudaMLOpsWrapper, ComputeResource  # noqa: E402
from market_evaluator import (  # noqa: E402
    run_evaluation,
    select_top_topics,
    create_stripe_artifact,
    create_gumroad_artifact,
)


class TestCudaWrapper(unittest.TestCase):
    def test_provision_returns_resource(self):
        w = CudaMLOpsWrapper()
        r = w.provision()
        self.assertIsInstance(r, ComputeResource)
        self.assertIn(r.device, {"cuda", "cpu"})
        self.assertTrue(r.provisioned)

    def test_cpu_fallback_when_no_gpu(self):
        w = CudaMLOpsWrapper(prefer_gpu=False)
        r = w.provision()
        self.assertEqual(r.device, "cpu")

    def test_cost_estimate_positive(self):
        w = CudaMLOpsWrapper()
        r = w.provision()
        self.assertGreater(w.estimate_cost_per_hour(r), 0)

    def test_release(self):
        w = CudaMLOpsWrapper()
        r = w.provision()
        self.assertTrue(w.release(r))
        self.assertEqual(len(w.active_resources()), 0)


class TestMarketEvaluator(unittest.TestCase):
    def test_select_three(self):
        picks = select_top_topics(3)
        self.assertEqual(len(picks), 3)

    def test_stripe_artifact(self):
        a = create_stripe_artifact("slug", "Title")
        self.assertEqual(a.platform, "stripe")
        self.assertEqual(a.tier, "TEST VERSION")
        self.assertEqual(a.price_usd, 0.0)

    def test_gumroad_artifact(self):
        a = create_gumroad_artifact("slug", "Title")
        self.assertEqual(a.platform, "gumroad")
        self.assertIn("TEST VERSION", a.title)

    def test_run_evaluation_creates_six(self):
        import tempfile

        with tempfile.TemporaryDirectory() as d:
            artifacts = run_evaluation(output_dir=d)
            self.assertEqual(len(artifacts), 6)
            self.assertTrue(os.path.exists(os.path.join(d, "latest_run.json")))


if __name__ == "__main__":
    unittest.main()
