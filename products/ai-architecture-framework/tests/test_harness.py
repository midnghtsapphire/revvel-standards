"""Test harness for the AI Architecture framework.

Run: python -m products.ai-architecture-framework.tests.test_harness
Or:  python products/ai-architecture-framework/tests/test_harness.py
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
PARENT = os.path.dirname(HERE)
sys.path.insert(0, PARENT)

import cuda_mlops_wrapper as cw  # noqa: E402
import market_evaluator as me  # noqa: E402


class TestCudaWrapper(unittest.TestCase):
    def test_provision_returns_result(self):
        r = cw.provision()
        self.assertIn(r.device.kind, ("gpu", "cpu"))
        self.assertIsInstance(r.fallback, bool)

    def test_cpu_fallback_when_no_gpu(self):
        # If no nvidia-smi, must fall back to CPU.
        if not cw._nvidia_smi_available():
            r = cw.provision(min_memory_mb=1)
            self.assertTrue(r.fallback)
            self.assertEqual(r.device.kind, "cpu")

    def test_query_gpus_returns_list(self):
        self.assertIsInstance(cw.query_gpus(), list)


class TestMarketEvaluator(unittest.TestCase):
    def test_pick_topics_deterministic(self):
        a = me.pick_topics(3, seed=1)
        b = me.pick_topics(3, seed=1)
        self.assertEqual(a, b)
        self.assertEqual(len(a), 3)

    def test_run_produces_three_drafts(self):
        with tempfile.TemporaryDirectory() as td:
            out = os.path.join(td, "report.json")
            report = me.run(out)
            self.assertEqual(len(report["drafts"]), 3)
            self.assertEqual(len(report["receipts"]), 3)
            with open(out) as f:
                data = json.load(f)
            self.assertEqual(len(data["drafts"]), 3)
            for d in data["drafts"]:
                self.assertEqual(d["tier"], "TEST VERSION")
                self.assertEqual(d["price_usd"], 0.0)
                self.assertIn(d["channel"], ("stripe", "gumroad"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
"""Test harness for AI Architecture framework."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cuda_mlops_wrapper import provision_jit, select_hardware, release  # noqa: E402
from market_evaluator import run, pick_top  # noqa: E402


def test_select_hardware_tiers():
    assert select_hardware(0.5, 2000) == "cpu"
    assert select_hardware(10, 100) == "t4"
    assert select_hardware(20, 100) == "a10"
    assert select_hardware(60, 100) == "a100"
    assert select_hardware(120, 100) == "h100"


def test_provision_dry_run():
    r = provision_jit(workload_gb=12, latency_ms=200, dry_run=True)
    assert r.hardware == "t4"
    assert r.provisioned is False
    assert r.estimated_hourly_usd > 0
    rel = release(r)
    assert rel["released"] is True


def test_market_evaluator_returns_three():
    report = run(3)
    assert report["count"] == 3
    assert len(report["plans"]) == 3
    assert all(p["mock"] for p in report["plans"])
    # JSON serializable
    json.dumps(report)


def test_pick_top_unique():
    top = pick_top(3)
    assert len(set(top)) == 3


if __name__ == "__main__":
    test_select_hardware_tiers()
    test_provision_dry_run()
    test_market_evaluator_returns_three()
    test_pick_top_unique()
    print("All tests passed.")
