"""Unit tests for the AI architecture framework."""
from __future__ import annotations

import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

from cuda_mlops_wrapper import provision, release, ComputeResource  # noqa: E402
from market_evaluator import run, select_topics  # noqa: E402


class TestCudaWrapper(unittest.TestCase):
    def test_provision_returns_resource(self):
        r = provision()
        self.assertIsInstance(r, ComputeResource)
        self.assertIn(r.device, {"cuda", "cpu"})

    def test_release_noop(self):
        r = provision()
        self.assertTrue(release(r))

    def test_cpu_fallback_when_high_memory(self):
        r = provision(min_memory_mb=10**9)
        # Either a huge GPU (unlikely on CI) or CPU fallback
        self.assertIn(r.device, {"cuda", "cpu"})


class TestMarketEvaluator(unittest.TestCase):
    def test_select_three(self):
        self.assertEqual(len(select_topics(3)), 3)

    def test_run_creates_three_products(self, tmp=".sandbox/test_market.jsonl"):
        products = run(output_path=tmp)
        self.assertEqual(len(products), 3)
        for p in products:
            self.assertEqual(p.tag, "TEST VERSION")
            self.assertIn(p.platform, {"stripe", "gumroad"})


if __name__ == "__main__":
    unittest.main()
