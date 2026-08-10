"""Market evaluator: schedules 3 product creations per run (mock-safe).

Runs in CI to enforce the Prime Directive: $10k/month → $10M in 3 years by
continuously shipping small, testable products on Stripe and Gumroad.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import List

TOPICS = [
    "GPU hardware selection cheatsheet",
    "JIT CUDA provisioning playbook",
    "Training cost reduction audit",
    "Inference latency SLO calculator",
    "OSINT for AI infra procurement",
    "Polar.sh + Stripe launch template",
]


@dataclass
class ProductPlan:
    title: str
    platform: str  # "gumroad" | "stripe"
    tier: str      # "free-test" | "paid" | "lead-magnet"
    price_usd: float
    created_at: str

    def to_dict(self) -> dict:
        return asdict(self)


def pick_topics(seed: int, n: int = 3) -> List[str]:
    rotated = TOPICS[seed % len(TOPICS):] + TOPICS[: seed % len(TOPICS)]
    return rotated[:n]


def schedule_products(now: datetime | None = None, seed: int | None = None) -> List[ProductPlan]:
    now = now or datetime.now(timezone.utc)
    seed = seed if seed is not None else now.toordinal()
    topics = pick_topics(seed, 3)
    stamp = now.isoformat()
    return [
        ProductPlan(topics[0], "gumroad", "free-test", 0.0, stamp),
        ProductPlan(topics[1], "stripe", "paid", 29.0, stamp),
        ProductPlan(topics[2], "gumroad", "lead-magnet", 0.0, stamp),
    ]


def mock_create(plan: ProductPlan) -> dict:
    """Pretend to call Stripe/Gumroad. Never touches the network in CI."""
    return {
        "ok": True,
        "platform": plan.platform,
        "tier": plan.tier,
        "title": plan.title,
        "price_usd": plan.price_usd,
        "external_id": f"mock_{plan.platform}_{abs(hash(plan.title)) % 10_000_000}",
    }


def run() -> dict:
    plans = schedule_products()
    results = [mock_create(p) for p in plans]
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "plans": [p.to_dict() for p in plans],
        "results": results,
    }
    out_dir = os.path.join(os.path.dirname(__file__), "artifacts")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "market_evaluator_report.json")
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, sort_keys=True)
    return report


if __name__ == "__main__":  # pragma: no cover
    print(json.dumps(run(), indent=2, sort_keys=True))
