"""Smoke tests for the AI architecture framework."""
from __future__ import annotations

import json
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.dirname(HERE)
if PKG not in sys.path:
    sys.path.insert(0, PKG)

import cuda_mlops_wrapper  # noqa: E402
import market_evaluator    # noqa: E402


class CudaWrapperTests(unittest.TestCase):
    def test_provision_returns_manifest(self):
        m = cuda_mlops_wrapper.provision(budget_per_hour_usd=0.0)
        # zero budget → only free devices (cpu fallback) qualify
        self.assertTrue(all(d.cost_per_hour_usd == 0.0 for d in m.devices))
        self.assertGreaterEqual(len(m.devices), 1)

    def test_manifest_json_roundtrip(self):
        m = cuda_mlops_wrapper.provision(budget_per_hour_usd=1.0)
        data = json.loads(m.to_json())
        self.assertIn("provider", data)
        self.assertIn("devices", data)
        self.assertIn("total_cost_per_hour_usd", data)


class MarketEvaluatorTests(unittest.TestCase):
    def test_pick_top_three(self):
        picks = market_evaluator.pick_top(3)
        self.assertEqual(len(picks), 3)
        scores = [p.score() for p in picks]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_run_emits_six_listings(self):
        result = market_evaluator.run()
        self.assertEqual(len(result["picks"]), 3)
        # 3 picks × (stripe + gumroad) = 6
        self.assertEqual(len(result["listings"]), 6)
        platforms = {l["platform"] for l in result["listings"]}
        self.assertEqual(platforms, {"stripe", "gumroad"})
        for listing in result["listings"]:
            self.assertIn("TEST VERSION", listing["name"])
            self.assertEqual(listing["amount_usd"], "0.00")


if __name__ == "__main__":
    unittest.main()
