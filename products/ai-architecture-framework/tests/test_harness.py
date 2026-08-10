"""Test harness for the AI Architecture framework.

Runs without a GPU and without network access.
"""
from __future__ import annotations

import json
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.dirname(HERE)
sys.path.insert(0, PKG)

from cuda_mlops_wrapper import (  # noqa: E402
    provision_report,
    query_gpus,
    select_device,
)
from market_evaluator import (  # noqa: E402
    ProductPlan,
    mock_create,
    pick_topics,
    run,
    schedule_products,
)


class CudaWrapperTests(unittest.TestCase):
    def test_query_gpus_returns_list(self):
        self.assertIsInstance(query_gpus(), list)

    def test_select_device_never_crashes(self):
        dev = select_device()
        self.assertTrue(dev == "cpu" or dev.startswith("cuda:"))

    def test_provision_report_is_json(self):
        payload = json.loads(provision_report())
        self.assertIn("device", payload)
        self.assertIn("gpus", payload)


class MarketEvaluatorTests(unittest.TestCase):
    def test_pick_topics_returns_three(self):
        self.assertEqual(len(pick_topics(0, 3)), 3)

    def test_schedule_products_yields_three(self):
        plans = schedule_products()
        self.assertEqual(len(plans), 3)
        for p in plans:
            self.assertIsInstance(p, ProductPlan)
            self.assertIn(p.platform, {"gumroad", "stripe"})

    def test_mock_create_is_idempotent_shape(self):
        plan = schedule_products()[0]
        result = mock_create(plan)
        self.assertTrue(result["ok"])
        self.assertEqual(result["platform"], plan.platform)

    def test_run_writes_artifact(self):
        report = run()
        self.assertEqual(len(report["plans"]), 3)
        self.assertEqual(len(report["results"]), 3)
        artifact = os.path.join(PKG, "artifacts", "market_evaluator_report.json")
        self.assertTrue(os.path.exists(artifact))


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
