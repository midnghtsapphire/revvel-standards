"""Market evaluator: schedules 3 product creations per run.

Mocks Stripe + Gumroad product creation. Emits a JSON manifest that
downstream automation (GitHub Actions) can consume to actually push
the TEST VERSION artifacts.

Prime directive: $10k/month -> $10M in 3 years. Ship 3 products/week.
"""
from __future__ import annotations

import json
import random
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import List

from cuda_mlops_wrapper import CudaMLOpsWrapper


CANDIDATE_TOPICS = [
    "OSINT: GitHub org enumerator",
    "OSINT: subdomain harvester (passive)",
    "OSINT: leaked credentials monitor",
    "AI: local LLM cost calculator",
    "AI: GPU rental arbitrage bot",
    "AI: prompt library for security ops",
    "Polar.sh: GitHub funding autoresponder",
    "Polar.sh: sponsor tier optimizer",
    "Automation: Gumroad artifact publisher",
    "Automation: Stripe product spinner",
]


@dataclass
class ProductPlan:
    slug: str
    title: str
    price_usd: float
    stripe_mock_id: str
    gumroad_mock_id: str
    tier: str  # "TEST" or "PAID"
    created_at: str


def _slugify(text: str) -> str:
    return (
        text.lower()
        .replace(":", "")
        .replace("(", "")
        .replace(")", "")
        .replace(".", "-")
        .replace(" ", "-")
        .replace("--", "-")
        .strip("-")
    )


def evaluate_and_schedule(n: int = 3, seed: int | None = None) -> List[ProductPlan]:
    rng = random.Random(seed)
    picks = rng.sample(CANDIDATE_TOPICS, k=min(n, len(CANDIDATE_TOPICS)))
    now = datetime.now(timezone.utc).isoformat()
    plans: List[ProductPlan] = []
    for topic in picks:
        slug = _slugify(topic)
        plans.append(
            ProductPlan(
                slug=slug,
                title=f"TEST VERSION - {topic}",
                price_usd=0.0,
                stripe_mock_id=f"prod_test_{slug}",
                gumroad_mock_id=f"gum_test_{slug}",
                tier="TEST",
                created_at=now,
            )
        )
    return plans


def run(seed: int | None = None) -> dict:
    wrapper = CudaMLOpsWrapper()
    hw_plan = wrapper.plan("market-evaluator")
    products = evaluate_and_schedule(3, seed=seed)
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "hardware": asdict(hw_plan),
        "products": [asdict(p) for p in products],
        "revenue_forecast_30d_usd": 0,  # TEST tier
        "notes": "3 TEST VERSION products scheduled. Promote to PAID after >=50 downloads.",
    }


if __name__ == "__main__":  # pragma: no cover
    print(json.dumps(run(), indent=2))
