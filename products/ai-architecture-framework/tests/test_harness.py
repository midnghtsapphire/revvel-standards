"""Lightweight tests for the AI architecture framework (no pytest required)."""
from __future__ import annotations

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, ROOT)

from cuda_mlops_wrapper import acquire_lease, release_lease  # noqa: E402
from market_evaluator import schedule_products, dump  # noqa: E402


def test_lease_returns_valid_device() -> None:
    lease = acquire_lease(min_memory_mb=0)
    assert lease.device.startswith("cpu") or lease.device.startswith("cuda:")
    assert lease.memory_mb >= 0
    assert lease.est_cost_per_hour_usd >= 0.0
    assert release_lease(lease) is True


def test_scheduler_creates_three_mock_products() -> None:
    drafts = schedule_products(3)
    assert len(drafts) == 3
    for d in drafts:
        assert d.mock is True
        assert d.price_usd == 0.0
        assert d.title.startswith("TEST VERSION")
        assert d.platform in {"stripe", "gumroad"}
    # dump must be valid JSON
    json.loads(dump(drafts))


def main() -> int:
    tests = [test_lease_returns_valid_device, test_scheduler_creates_three_mock_products]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"ok  - {t.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL - {t.__name__}: {e}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
