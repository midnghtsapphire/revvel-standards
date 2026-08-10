"""Smoke tests for the AI Architecture framework.

Run with: python -m unittest products/ai-architecture-framework/tests/test_harness.py
"""
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import cuda_mlops_wrapper as cuda  # noqa: E402
import market_evaluator as me  # noqa: E402


class TestCudaWrapper(unittest.TestCase):
    def test_detect_devices_returns_nonempty(self):
        devices = cuda.detect_devices()
        self.assertTrue(len(devices) >= 1)
        self.assertIn(devices[0].kind, {"cpu", "cuda"})

    def test_provision_cpu_default(self):
        result = cuda.provision(min_memory_mb=0)
        self.assertTrue(result["provisioned"])
        self.assertIn(result["device"]["kind"], {"cpu", "cuda"})

    def test_select_device_falls_back_to_cpu(self):
        # Absurdly large memory request -> CPU fallback (unless a huge GPU exists).
        dev = cuda.select_device(min_memory_mb=10**9)
        self.assertIn(dev.kind, {"cpu", "cuda"})


class TestMarketEvaluator(unittest.TestCase):
    def test_pick_topics_returns_three_unique(self):
        topics = me.pick_topics(3, seed=42)
        self.assertEqual(len(topics), 3)
        self.assertEqual(len(set(topics)), 3)

    def test_run_produces_six_products(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = me.run(seed=7, out_dir=tmp)
            self.assertEqual(len(result["topics"]), 3)
            self.assertEqual(len(result["products"]), 6)
            for p in result["products"]:
                self.assertEqual(p["price_usd"], 0)
                self.assertIn("TEST VERSION", p["name"])
            # Ensure audit file was written
            files = list(Path(tmp).glob("run-*.json"))
            self.assertEqual(len(files), 1)
            data = json.loads(files[0].read_text())
            self.assertIn("prime_directive", data)


if __name__ == "__main__":
    unittest.main()
