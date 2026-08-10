"""Smoke tests for the AI Architecture framework."""
import json
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

import cuda_mlops_wrapper  # noqa: E402
import market_evaluator  # noqa: E402


class TestCudaWrapper(unittest.TestCase):
    def test_provision_returns_contract(self):
        result = cuda_mlops_wrapper.provision(prompt_tokens=100)
        for key in ("hardware", "provider", "estimated_cost_usd", "paid_enabled"):
            self.assertIn(key, result)

    def test_cpu_default_when_paid_disabled(self):
        os.environ.pop("ALLOW_PAID", None)
        result = cuda_mlops_wrapper.provision(prompt_tokens=50_000, needs_finetune=True)
        # Without local GPU + paid disabled, we must fall back to cpu.
        if cuda_mlops_wrapper.detect_local_gpu() in (None, "cpu"):
            self.assertEqual(result["hardware"], "cpu")
            self.assertEqual(result["estimated_cost_usd"], 0.0)


class TestMarketEvaluator(unittest.TestCase):
    def test_evaluate_returns_three(self):
        drafts = market_evaluator.evaluate(3)
        self.assertEqual(len(drafts), 3)
        for d in drafts:
            self.assertTrue(d["title"].endswith("TEST VERSION"))
            self.assertEqual(d["price"], 0.0)
            self.assertIn("gumroad", d)
            self.assertIn("stripe", d)

    def test_main_writes_artifact(self):
        rc = market_evaluator.main()
        self.assertEqual(rc, 0)
        self.assertTrue(os.path.exists(".sandbox/market_evaluator_last_run.json"))
        with open(".sandbox/market_evaluator_last_run.json", encoding="utf-8") as f:
            data = json.load(f)
        self.assertEqual(len(data["products"]), 3)


if __name__ == "__main__":
    unittest.main()
