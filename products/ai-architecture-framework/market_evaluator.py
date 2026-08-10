"""Market evaluator — schedules 3 product creations across Stripe/Gumroad.

Mock implementation: prints planned actions and writes a JSON manifest.
Wired to the daily GitHub Actions workflow.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import List


@dataclass
class ProductPlan:
    title: str
    platform: str  # "stripe" | "gumroad"
    price_usd: float
    tag: str
    description: str


CANDIDATE_TOPICS = [
    "OSINT Toolkit Starter Pack",
    "AI Architecture Cost Optimizer Guide",
    "Polar.sh Founder Playbook",
    "Hardware Selection Cheat Sheet",
    "JIT GPU Provisioning Recipes",
]


def select_topics(n: int = 3) -> List[str]:
    return CANDIDATE_TOPICS[:n]


def build_plans() -> List[ProductPlan]:
    plans: List[ProductPlan] = []
    for i, topic in enumerate(select_topics(3)):
        platform = "gumroad" if i % 2 == 0 else "stripe"
        plans.append(ProductPlan(
            title=f"[TEST VERSION] {topic}",
            platform=platform,
            price_usd=0.0,
            tag="test",
            description=(
                f"Auto-generated market test for '{topic}'. "
                "Free tier; used to validate demand before paid launch."
            ),
        ))
    return plans


def create_on_stripe(plan: ProductPlan) -> dict:
    # Mock — replace with real Stripe API call when STRIPE_API_KEY is set.
    return {"platform": "stripe", "status": "mock_created", "plan": asdict(plan)}


def create_on_gumroad(plan: ProductPlan) -> dict:
    # Mock — replace with real Gumroad API call when GUMROAD_TOKEN is set.
    return {"platform": "gumroad", "status": "mock_created", "plan": asdict(plan)}


def run() -> dict:
    results = []
    for plan in build_plans():
        if plan.platform == "stripe":
            results.append(create_on_stripe(plan))
        else:
            results.append(create_on_gumroad(plan))

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "results": results,
    }

    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(out_dir, "last_run_manifest.json")
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
    return manifest


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
