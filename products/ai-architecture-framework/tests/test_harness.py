"""Validation suite for AI Architecture Framework."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from cuda_mlops_wrapper import (  # noqa: E402
    ComputeResource, detect_cuda_devices, estimate_monthly_cost, provision,
)
from market_evaluator import mock_publish, select_top_n  # noqa: E402


def test_detect_cuda_returns_list():
    result = detect_cuda_devices()
    assert isinstance(result, list)


def test_provision_always_returns_resource():
    r = provision()
    assert isinstance(r, ComputeResource)
    assert r.kind in ("cuda", "cpu")


def test_cost_estimate_positive():
    r = provision()
    assert estimate_monthly_cost(r) >= 0


def test_select_top_n_returns_three():
    ideas = select_top_n(3)
    assert len(ideas) == 3
    assert all(i.title.startswith("TEST VERSION") for i in ideas)


def test_mock_publish_returns_url():
    ideas = select_top_n(1)
    result = mock_publish(ideas[0])
    assert result["status"] == "created"
    assert result["url"].startswith("http")


if __name__ == "__main__":
    import subprocess
    subprocess.run([sys.executable, "-m", "pytest", __file__, "-v"], check=False)
