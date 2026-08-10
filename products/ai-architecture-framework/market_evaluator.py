"""Market Evaluator - schedules 3 product creations per run.

Mocks Stripe + Gumroad publishing. In production, replace `_publish_*`
functions with real API clients guarded by env-var secrets.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import List

from cuda_mlops_wrapper import provision


@dataclass
class ProductConcept:
    slug: str
    title: str
    price_usd: float
    audience: str
    est_monthly_revenue: float
    platform: str  # "stripe" | "gumroad"


TRENDING_TOPICS = [
    ("osint-recon-toolkit", "OSINT Recon Toolkit", 49.0, "security researchers", 2200.0),
    ("polar-sh-launch-kit", "Polar.sh GitHub Funding Launch Kit", 29.0, "OSS maintainers", 1800.0),
    ("ai-arch-playbook", "AI Architecture Playbook", 79.0, "ML engineers", 3500.0),
    ("gumroad-automation", "Gumroad Automation Templates", 19.0, "indie hackers", 1200.0),
    ("cuda-cost-cutter", "CUDA Cost Cutter Guide", 39.0, "ML ops", 1600.0),
]


def score(topic) -> float:
    _, _, price, _, revenue = topic
    return revenue * (1 + price / 100.0)


def pick_top(n: int = 3) -> List[ProductConcept]:
    ranked = sorted(TRENDING_TOPICS, key=score, reverse=True)[:n]
    concepts = []
    for i, (slug, title, price, audience, rev) in enumerate(ranked):
        platform = "stripe" if i % 2 == 0 else "gumroad"
        concepts.append(
            ProductConcept(
                slug=slug,
                title=f"[TEST VERSION] {title}",
                price_usd=0.0,  # free TEST VERSION
                audience=audience,
                est_monthly_revenue=rev,
                platform=platform,
            )
        )
    return concepts


def _publish_stripe(p: ProductConcept) -> dict:
    return {"platform": "stripe", "id": f"prod_mock_{p.slug}", "url": f"https://buy.stripe.com/test/{p.slug}"}


def _publish_gumroad(p: ProductConcept) -> dict:
    return {"platform": "gumroad", "id": f"gum_mock_{p.slug}", "url": f"https://gumroad.com/l/{p.slug}"}


def publish(p: ProductConcept) -> dict:
    if p.platform == "stripe":
        return _publish_stripe(p)
    return _publish_gumroad(p)


def run() -> dict:
    resource = provision(workload="inference", max_cost_per_hour=1.00)
    concepts = pick_top(3)
    published = [publish(c) for c in concepts]
    report = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "compute": {"device": resource.device, "name": resource.name, "cost_per_hour": resource.cost_per_hour},
        "concepts": [asdict(c) for c in concepts],
        "published": published,
    }
    out_dir = os.path.join(os.path.dirname(__file__), "reports")
    os.makedirs(out_dir, exist_ok=True)
    fname = f"run-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}.json"
    with open(os.path.join(out_dir, fname), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    return report


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
