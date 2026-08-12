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
