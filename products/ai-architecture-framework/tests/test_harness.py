"""Test harness for the AI Architecture framework.

Run with:  python -m unittest products/ai-architecture-framework/tests/test_harness.py
"""
from __future__ import annotations

import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
MODULE_DIR = os.path.abspath(os.path.join(HERE, ".."))
if MODULE_DIR not in sys.path:
    sys.path.insert(0, MODULE_DIR)

from cuda_mlops_wrapper import CudaMLOpsWrapper, GPUInfo  # noqa: E402
import market_evaluator  # noqa: E402


class CudaWrapperTests(unittest.TestCase):
    def test_cpu_fallback_when_no_gpus(self):
        w = CudaMLOpsWrapper(mock=True, mock_gpus=[])
        plan = w.plan("llm")
        self.assertEqual(plan.device, "cpu")
        self.assertLess(plan.estimated_cost_per_hour_usd, 0.10)

    def test_gpu_selected_when_available(self):
        gpus = [
            GPUInfo(0, "RTX 4090", 24000, 20000, 10),
            GPUInfo(1, "L4", 24000, 5000, 50),
        ]
        w = CudaMLOpsWrapper(mock=True, mock_gpus=gpus)
        plan = w.plan("llm", min_vram_mb=8000)
        self.assertEqual(plan.device, "cuda:0")

    def test_gpu_rejected_when_utilization_high(self):
        gpus = [GPUInfo(0, "RTX 4090", 24000, 20000, 95)]
        w = CudaMLOpsWrapper(mock=True, mock_gpus=gpus)
        plan = w.plan("llm")
        self.assertEqual(plan.device, "cpu")


class MarketEvaluatorTests(unittest.TestCase):
    def test_schedules_three_products(self):
        result = market_evaluator.run(seed=42)
        self.assertEqual(len(result["products"]), 3)
        for p in result["products"]:
            self.assertEqual(p["tier"], "TEST")
            self.assertEqual(p["price_usd"], 0.0)
            self.assertTrue(p["stripe_mock_id"].startswith("prod_test_"))
            self.assertTrue(p["gumroad_mock_id"].startswith("gum_test_"))

    def test_deterministic_with_seed(self):
        a = market_evaluator.evaluate_and_schedule(3, seed=7)
        b = market_evaluator.evaluate_and_schedule(3, seed=7)
        self.assertEqual([p.slug for p in a], [p.slug for p in b])

    def test_includes_hardware_plan(self):
        result = market_evaluator.run(seed=1)
        self.assertIn("hardware", result)
        self.assertIn("device", result["hardware"])


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
