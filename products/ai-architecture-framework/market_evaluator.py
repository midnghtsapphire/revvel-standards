"""Market evaluator: score topics and schedule 3 daily test products.

Stripe & Gumroad endpoints are mocked — no network calls, no secrets.
Outputs a JSON artifact suitable for CI upload.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Dict, List


@dataclass
class Topic:
    slug: str
    title: str
    search_velocity: float  # 0..1
    margin: float           # 0..1
    time_to_ship: float     # 0..1 (1 = fastest)
    repeat_purchase: float  # 0..1

    def score(self) -> float:
        return (
            0.30 * self.search_velocity
            + 0.30 * self.margin
            + 0.20 * self.time_to_ship
            + 0.20 * self.repeat_purchase
        )


CANDIDATES: List[Topic] = [
    Topic("osint-starter-kit", "OSINT Starter Kit", 0.82, 0.90, 0.95, 0.55),
    Topic("polar-funding-playbook", "Polar.sh Funding Playbook", 0.70, 0.92, 0.90, 0.60),
    Topic("jit-gpu-cost-guide", "JIT GPU Cost Guide", 0.65, 0.85, 0.80, 0.50),
    Topic("github-actions-recipes", "GitHub Actions Recipes", 0.60, 0.80, 0.85, 0.65),
    Topic("tailwind-dashboards", "Tailwind Dashboards Pack", 0.55, 0.78, 0.88, 0.45),
    Topic("ai-agent-audit-log", "AI Agent Audit Log Template", 0.50, 0.82, 0.90, 0.70),
]


def pick_top(n: int = 3) -> List[Topic]:
    return sorted(CANDIDATES, key=lambda t: t.score(), reverse=True)[:n]


def mock_stripe_create(topic: Topic) -> Dict[str, str]:
    return {
        "platform": "stripe",
        "product_id": f"prod_test_{topic.slug}",
        "price_id": f"price_test_{topic.slug}",
        "name": f"{topic.title} — TEST VERSION",
        "amount_usd": "0.00",
    }


def mock_gumroad_create(topic: Topic) -> Dict[str, str]:
    return {
        "platform": "gumroad",
        "product_id": f"gum_test_{topic.slug}",
        "url": f"https://gumroad.com/l/test-{topic.slug}",
        "name": f"{topic.title} — TEST VERSION",
        "amount_usd": "0.00",
    }


def run() -> Dict[str, object]:
    picks = pick_top(3)
    listings: List[Dict[str, str]] = []
    for t in picks:
        listings.append(mock_stripe_create(t))
        listings.append(mock_gumroad_create(t))
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "picks": [{"slug": t.slug, "score": round(t.score(), 4), "title": t.title} for t in picks],
        "listings": listings,
    }


if __name__ == "__main__":
    result = run()
    out_dir = os.environ.get("EVALUATOR_OUT", ".sandbox")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "market_evaluator_result.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(result, fh, indent=2)
    print(json.dumps(result, indent=2))
