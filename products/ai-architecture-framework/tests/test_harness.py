"""Test harness for AI Architecture Framework.

Run with: python -m unittest products/ai-architecture-framework/tests/test_harness.py
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

import cuda_mlops_wrapper  # noqa: E402
import market_evaluator  # noqa: E402


class TestCudaWrapper(unittest.TestCase):
    def test_provision_returns_valid_result(self):
        r = cuda_mlops_wrapper.provision("unit-test")
        self.assertIn(r.device, {"cuda", "cpu"})
        self.assertTrue(r.jit)
        self.assertGreater(r.est_cost_per_hour_usd, 0)
        self.assertTrue(r.job_id.startswith("job-"))

    def test_budget_ceiling_forces_cpu(self):
        r = cuda_mlops_wrapper.provision("tight-budget", max_cost_per_hour_usd=0.01)
        self.assertEqual(r.device, "cpu")
        self.assertLessEqual(r.est_cost_per_hour_usd, 0.05)

    def test_json_roundtrip(self):
        r = cuda_mlops_wrapper.provision("json-test")
        parsed = json.loads(r.to_json())
        self.assertEqual(parsed["job_id"], r.job_id)


class TestMarketEvaluator(unittest.TestCase):
    def test_selects_three_topics(self):
        self.assertEqual(len(market_evaluator.select_topics(3)), 3)

    def test_run_evaluation_creates_three_test_products(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = os.path.join(tmp, "run.jsonl")
            drafts = market_evaluator.run_evaluation(output_path=out)
            self.assertEqual(len(drafts), 3)
            for d in drafts:
                self.assertTrue(d.test_version)
                self.assertTrue(d.title.startswith("TEST VERSION"))
                self.assertIn(d.platform, {"stripe", "gumroad"})
            with open(out, "r", encoding="utf-8") as fh:
                lines = fh.read().strip().splitlines()
            self.assertEqual(len(lines), 3)


if __name__ == "__main__":
    unittest.main()
