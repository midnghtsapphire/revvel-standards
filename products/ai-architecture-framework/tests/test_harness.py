"""Validation tests for the AI Architecture framework."""
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import cuda_mlops_wrapper as cuda  # noqa: E402
import market_evaluator as market  # noqa: E402


class CudaWrapperTests(unittest.TestCase):
    def test_list_devices_returns_at_least_one(self):
        devices = cuda.list_devices()
        self.assertGreaterEqual(len(devices), 1)
        self.assertIn(devices[0].backend, {"cuda", "cpu"})

    def test_provision_cpu_fallback(self):
        dev = cuda.provision(min_memory_mb=0)
        self.assertIsNotNone(dev)

    def test_report_is_valid_json(self):
        import json
        json.loads(cuda.report())


class MarketEvaluatorTests(unittest.TestCase):
    def test_select_topics_returns_three(self):
        self.assertEqual(len(market.select_topics(3)), 3)

    def test_build_plans_produces_three_plans(self):
        plans = market.build_plans()
        self.assertEqual(len(plans), 3)
        for p in plans:
            self.assertIn(p.platform, {"stripe", "gumroad"})
            self.assertTrue(p.title.startswith("[TEST VERSION]"))
            self.assertEqual(p.price_usd, 0.0)

    def test_run_writes_manifest(self):
        manifest = market.run()
        self.assertIn("results", manifest)
        self.assertEqual(len(manifest["results"]), 3)


if __name__ == "__main__":
    unittest.main()
