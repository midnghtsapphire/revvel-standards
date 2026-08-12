"""Market evaluator: schedules 3 product creations/day with Stripe/Gumroad mocks.

Designed to run headless in GitHub Actions. Emits a JSON report per run.
"""
from __future__ import annotations

import json
import os
import random
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import List


TOPICS = [
    "OSINT toolkit for GitHub recon",
    "AI architecture cost calculator",
    "JIT GPU provisioning CLI",
    "Polar.sh funding automation",
    "Stripe subscription boilerplate",
    "Gumroad digital product template",
    "MLOps starter for solo devs",
    "Hardware selection dashboard",
]


@dataclass
class ProductPlan:
    title: str
    platform: str
    price_usd: float
    est_monthly_revenue: float
    created_at: str
    mock: bool


def score(topic: str) -> float:
    # Deterministic-ish score seeded by topic length + random jitter.
    base = 100 + len(topic) * 3
    return round(base + random.uniform(0, 200), 2)


def pick_top(n: int = 3) -> List[str]:
    ranked = sorted(TOPICS, key=score, reverse=True)
    return ranked[:n]


def create_mock_product(topic: str, platform: str) -> ProductPlan:
    price = round(random.choice([0.0, 9.0, 19.0, 29.0]), 2)  # 0 = TEST VERSION
    est = round(price * random.randint(5, 50), 2)
    return ProductPlan(
        title=f"TEST VERSION — {topic}" if price == 0 else topic,
        platform=platform,
        price_usd=price,
        est_monthly_revenue=est,
        created_at=datetime.now(timezone.utc).isoformat(),
        mock=True,
    )


def run(n: int = 3) -> dict:
    top = pick_top(n)
    plans = []
    for i, topic in enumerate(top):
        platform = "stripe" if i % 2 == 0 else "gumroad"
        plans.append(create_mock_product(topic, platform))
    report = {
        "run_at": datetime.now(timezone.utc).isoformat(),
        "count": len(plans),
        "plans": [asdict(p) for p in plans],
        "total_projected_monthly_usd": round(sum(p.est_monthly_revenue for p in plans), 2),
    }
    return report


if __name__ == "__main__":
    out_dir = os.environ.get("MARKET_EVAL_OUT", ".")
    os.makedirs(out_dir, exist_ok=True)
    report = run(3)
    path = os.path.join(out_dir, f"market-eval-{datetime.now(timezone.utc).strftime('%Y%m%d')}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(json.dumps(report, indent=2))
