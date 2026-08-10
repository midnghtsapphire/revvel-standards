"""Market evaluator: picks 3 topics and schedules mock product creation."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import List

MOCK_MODE = os.environ.get("MOCK_MODE", "1") == "1"

CANDIDATE_TOPICS = [
    {"topic": "OSINT starter kit", "volume": 8200, "intent": 0.62, "competition": 0.45},
    {"topic": "Polar.sh funding playbook", "volume": 3100, "intent": 0.78, "competition": 0.20},
    {"topic": "CUDA cost optimization guide", "volume": 5400, "intent": 0.55, "competition": 0.35},
    {"topic": "AI architecture cheatsheet", "volume": 12000, "intent": 0.48, "competition": 0.60},
    {"topic": "Automated Gumroad artifact bot", "volume": 2700, "intent": 0.71, "competition": 0.18},
    {"topic": "GitHub Actions monetization", "volume": 4400, "intent": 0.66, "competition": 0.30},
]


@dataclass
class ProductPlan:
    topic: str
    score: float
    stripe_product_id: str
    gumroad_url: str
    version: str
    scheduled_at: str

    def to_dict(self) -> dict:
        return asdict(self)


def _score(entry: dict) -> float:
    return entry["volume"] * entry["intent"] * (1.0 - entry["competition"])


def _mock_stripe_create(topic: str) -> str:
    slug = topic.lower().replace(" ", "-")[:40]
    return f"prod_test_{slug}"


def _mock_gumroad_create(topic: str) -> str:
    slug = topic.lower().replace(" ", "-")[:40]
    return f"https://gumroad.com/l/{slug}?test=1"


def evaluate(top_n: int = 3) -> List[ProductPlan]:
    ranked = sorted(CANDIDATE_TOPICS, key=_score, reverse=True)[:top_n]
    now = datetime.now(timezone.utc).isoformat()
    plans: List[ProductPlan] = []
    for entry in ranked:
        plans.append(ProductPlan(
            topic=entry["topic"],
            score=round(_score(entry), 2),
            stripe_product_id=_mock_stripe_create(entry["topic"]),
            gumroad_url=_mock_gumroad_create(entry["topic"]),
            version="TEST VERSION",
            scheduled_at=now,
        ))
    return plans


def main() -> None:
    plans = evaluate()
    payload = {
        "mock_mode": MOCK_MODE,
        "count": len(plans),
        "plans": [p.to_dict() for p in plans],
    }
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
