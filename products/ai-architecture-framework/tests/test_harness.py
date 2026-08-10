"""Unit tests for the AI architecture framework."""
from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

import cuda_mlops_wrapper as cmw  # noqa: E402
import market_evaluator as me  # noqa: E402


class CudaWrapperTests(unittest.TestCase):
    def test_cpu_fallback_shape(self):
        cpu = cmw.cpu_fallback()
        self.assertEqual(cpu.kind, "cpu")
        self.assertGreater(cpu.est_cost_per_hour_usd, 0)

    def test_provision_returns_unit(self):
        unit = cmw.provision("inference", min_memory_mb=999_999_999)
        self.assertIn(unit.kind, {"cpu", "gpu"})

    def test_snapshot_keys(self):
        snap = cmw.snapshot()
        self.assertIn("gpus", snap)
        self.assertIn("fallback", snap)
        self.assertIn("count", snap)


class MarketEvaluatorTests(unittest.TestCase):
    def test_select_three(self):
        ideas = me.select_ideas(3)
        self.assertEqual(len(ideas), 3)
        self.assertEqual(len({i.slug for i in ideas}), 3)

    def test_run_writes_manifest(self, tmpdir="/tmp/ai-arch-test"):
        manifest = me.run(tmpdir)
        self.assertEqual(len(manifest["created"]), 3)
        for row in manifest["created"]:
            self.assertTrue(row["name"].startswith("TEST VERSION"))
            self.assertEqual(row["price"], 0)
        path = Path(tmpdir) / "market_manifest.json"
        self.assertTrue(path.exists())
        json.loads(path.read_text())


if __name__ == "__main__":
    unittest.main()
