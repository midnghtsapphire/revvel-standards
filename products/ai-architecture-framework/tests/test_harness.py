#!/usr/bin/env python3
"""Validation suite for the AI architecture framework."""
from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import cuda_mlops_wrapper as cuda  # noqa: E402
import market_evaluator as market  # noqa: E402


class CudaWrapperTests(unittest.TestCase):
    def test_provision_returns_event(self):
        event = cuda.provision("test-job", min_memory_mb=8000)
        self.assertIn(event.backend, {"cuda", "cpu-fallback"})
        self.assertTrue(event.action.startswith("provision:"))
        self.assertGreater(event.timestamp, 0)

    def test_probe_is_json_safe(self):
        gpus = cuda.probe_nvidia_smi()
        # None on machines without nvidia-smi; that's acceptable.
        if gpus is not None:
            self.assertIsInstance(gpus, list)


class MarketEvaluatorTests(unittest.TestCase):
    def test_evaluate_default_count(self):
        drafts = market.evaluate(3, seed=42)
        self.assertEqual(len(drafts), 3)
        for d in drafts:
            self.assertEqual(d.tag, "TEST VERSION")
            self.assertEqual(d.price_usd, 0.0)
            self.assertTrue(d.stripe_product_id.startswith("prod_test_"))
            self.assertIn("gumroad.com/l/", d.gumroad_permalink)

    def test_evaluate_caps_at_topic_pool(self):
        drafts = market.evaluate(999, seed=1)
        self.assertLessEqual(len(drafts), len(market.TOPICS))

    def test_serializable(self):
        drafts = market.evaluate(2, seed=7)
        payload = json.dumps([d.__dict__ for d in drafts])
        self.assertIn("TEST VERSION", payload)


if __name__ == "__main__":
    unittest.main(verbosity=2)
