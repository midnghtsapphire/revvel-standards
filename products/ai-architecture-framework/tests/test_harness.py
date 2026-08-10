"""Test harness for AI architecture framework.

Run with: python -m unittest products.ai-architecture-framework.tests.test_harness
or simply: python products/ai-architecture-framework/tests/test_harness.py
"""
from __future__ import annotations

import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.dirname(HERE)
if PKG not in sys.path:
    sys.path.insert(0, PKG)

import cuda_mlops_wrapper as cuda  # noqa: E402
import market_evaluator as mkt  # noqa: E402


class CudaWrapperTests(unittest.TestCase):
    def test_detect_returns_at_least_one_device(self):
        devs = cuda.detect_devices()
        self.assertGreaterEqual(len(devs), 1)

    def test_cpu_fallback_present_when_no_gpu(self):
        devs = cuda.detect_devices()
        kinds = {d.kind for d in devs}
        self.assertTrue("cuda" in kinds or "cpu" in kinds)

    def test_provision_returns_device(self):
        d = cuda.provision()
        self.assertIn(d.kind, {"cuda", "cpu"})


class MarketEvaluatorTests(unittest.TestCase):
    def test_evaluate_returns_three(self):
        results = mkt.evaluate(3, seed=42)
        self.assertEqual(len(results), 3)

    def test_all_free_test_version(self):
        for r in mkt.evaluate(3, seed=1):
            self.assertEqual(r["draft"]["price_usd"], 0.0)
            self.assertEqual(r["draft"]["label"], "TEST VERSION")

    def test_platforms_present(self):
        r = mkt.evaluate(1, seed=7)[0]
        self.assertIn("stripe", r)
        self.assertIn("gumroad", r)


if __name__ == "__main__":
    unittest.main(verbosity=2)
