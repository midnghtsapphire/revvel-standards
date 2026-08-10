"""Test harness for AI architecture framework."""
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cuda_mlops_wrapper import provision, HARDWARE_TIERS, detect_gpu  # noqa: E402
from market_evaluator import evaluate_and_create, TOPICS  # noqa: E402


class TestCudaWrapper(unittest.TestCase):
    def test_provision_returns_resource(self):
        r = provision()
        self.assertIsNotNone(r)
        self.assertIn(r.device, ("cuda", "cpu"))

    def test_cpu_fallback_when_budget_zero(self):
        r = provision(required_memory_mb=100000, budget_per_hour=0.0)
        # No tier meets budget=0 except... none. Should fallback to CPU.
        self.assertEqual(r.name, "CPU")

    def test_hardware_tiers_complete(self):
        for key in ("cpu", "T4", "A10G", "A100", "H100"):
            self.assertIn(key, HARDWARE_TIERS)

    def test_detect_gpu_returns_string_or_none(self):
        result = detect_gpu()
        self.assertTrue(result is None or isinstance(result, str))


class TestMarketEvaluator(unittest.TestCase):
    def test_creates_three_products(self):
        products = evaluate_and_create()
        self.assertEqual(len(products), 3)
        self.assertEqual(len(TOPICS), 3)

    def test_products_tagged_test_version(self):
        products = evaluate_and_create()
        for p in products:
            self.assertIn("TEST VERSION", p.name)
            self.assertEqual(p.price_usd, 0.0)

    def test_products_serializable(self):
        products = evaluate_and_create()
        for p in products:
            self.assertIsInstance(json.dumps(p.__dict__), str)


if __name__ == "__main__":
    unittest.main()
