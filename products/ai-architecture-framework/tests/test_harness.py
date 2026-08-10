"""Lightweight test harness — runs under stdlib unittest, no pytest required."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import cuda_mlops_wrapper as cw  # noqa: E402
import market_evaluator as me  # noqa: E402


class TestCudaWrapper(unittest.TestCase):
    def test_provision_small_model(self):
        plan = cw.provision(model_params_b=3.0)
        self.assertIn(plan.tier, {"CPU", "T4"})
        self.assertGreaterEqual(plan.estimated_hourly_usd, 0.0)

    def test_provision_large_model(self):
        plan = cw.provision(model_params_b=80.0)
        self.assertEqual(plan.tier, "H100")

    def test_budget_cap(self):
        plan = cw.provision(model_params_b=80.0, budget_usd_hr=0.10)
        self.assertEqual(plan.tier, "CPU")

    def test_plan_json_roundtrip(self):
        plan = cw.provision(model_params_b=7.0)
        payload = cw.plan_to_json(plan)
        self.assertIn("tier", payload)


class TestMarketEvaluator(unittest.TestCase):
    def test_pick_topics_deterministic(self):
        a = me.pick_topics(3, seed=42)
        b = me.pick_topics(3, seed=42)
        self.assertEqual(a, b)
        self.assertEqual(len(a), 3)

    def test_create_product_is_test_version(self):
        draft = me.create_product("Sample", "stripe")
        self.assertIn("TEST VERSION", draft.title)
        self.assertEqual(draft.price_usd, 0.0)
        self.assertEqual(draft.tag, "test-version")

    def test_run_creates_three(self):
        drafts = me.run(seed=1)
        self.assertEqual(len(drafts), 3)


if __name__ == "__main__":
    unittest.main()
