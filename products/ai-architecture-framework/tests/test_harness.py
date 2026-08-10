"""Smoke tests for the AI architecture framework."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cuda_mlops_wrapper import ComputeProfile, detect_cuda, provision, recommend  # noqa: E402
from market_evaluator import evaluate  # noqa: E402


def test_detect_cuda_returns_profile():
    p = detect_cuda()
    assert isinstance(p, ComputeProfile)
    assert p.device in {"cuda", "cpu"}
    assert p.est_hourly_usd >= 0


def test_provision_respects_budget():
    p = provision("llm-inference", budget_usd_per_hour=0.0)
    assert p.device == "cpu"
    assert p.est_hourly_usd <= 0.10


def test_recommend_shape():
    rec = recommend(["a", "b"])
    assert set(rec.keys()) == {"a", "b"}
    for v in rec.values():
        assert "device" in v and "est_hourly_usd" in v


def test_evaluate_returns_three():
    products = evaluate(3, seed=42)
    assert len(products) == 3
    for p in products:
        assert p.title.startswith("[TEST VERSION]")
        assert p.platform in {"stripe", "gumroad"}
        assert p.price_usd == 0.0
        assert p.url.startswith("https://")


def test_evaluate_json_serializable():
    products = evaluate(3, seed=7)
    json.dumps([p.__dict__ for p in products])


if __name__ == "__main__":
    test_detect_cuda_returns_profile()
    test_provision_respects_budget()
    test_recommend_shape()
    test_evaluate_returns_three()
    test_evaluate_json_serializable()
    print("ok")
