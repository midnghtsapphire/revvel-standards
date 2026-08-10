"""Daily market evaluator.

Selects 3 product candidates and creates free TEST VERSION listings on
Stripe and Gumroad (mocked for now). Designed to be invoked from a
GitHub Actions cron job as part of the automated product pipeline.
"""
from __future__ import annotations

import json
import random
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import List

from cuda_mlops_wrapper import plan_provisioning


CANDIDATE_TOPICS = [
    "OSINT dashboard for GitHub sponsors",
    "Polar.sh funding template pack",
    "AI cost optimization audit report",
    "Prompt engineering cheat sheet (advanced)",
    "CUDA inference benchmark toolkit",
    "Startup metrics tracker for founders",
    "MLOps starter kit (Modal + Replicate)",
    "Threat-intel feed aggregator",
    "Product-market-fit survey automation",
    "LLM eval harness for code review",
]


@dataclass
class ProductCandidate:
    title: str
    slug: str
    price_usd: float
    platform: str
    tag: str


def select_candidates(n: int = 3, seed: int | None = None) -> List[ProductCandidate]:
    rng = random.Random(seed)
    topics = rng.sample(CANDIDATE_TOPICS, k=min(n, len(CANDIDATE_TOPICS)))
    platforms = ["stripe", "gumroad"]
    return [
        ProductCandidate(
            title=f"[TEST VERSION] {t}",
            slug=t.lower().replace(" ", "-").replace("(", "").replace(")", ""),
            price_usd=0.00,
            platform=platforms[i % len(platforms)],
            tag="test-version",
        )
        for i, t in enumerate(topics)
    ]


def mock_create_stripe_product(candidate: ProductCandidate) -> dict:
    return {
        "platform": "stripe",
        "id": f"prod_test_{candidate.slug[:20]}",
        "name": candidate.title,
        "price": candidate.price_usd,
        "status": "created (mock)",
    }


def mock_create_gumroad_product(candidate: ProductCandidate) -> dict:
    return {
        "platform": "gumroad",
        "id": f"gum_test_{candidate.slug[:20]}",
        "name": candidate.title,
        "price": candidate.price_usd,
        "status": "created (mock)",
    }


def run(seed: int | None = None) -> dict:
    plan = plan_provisioning()
    candidates = select_candidates(3, seed=seed)
    listings = []
    for c in candidates:
        if c.platform == "stripe":
            listings.append(mock_create_stripe_product(c))
        else:
            listings.append(mock_create_gumroad_product(c))
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "provisioning": {
            "mode": plan.mode,
            "cost_per_hour": plan.estimated_cost_per_hour,
            "notes": plan.notes,
        },
        "candidates": [asdict(c) for c in candidates],
        "listings": listings,
    }


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
