"""Market Evaluator — schedules 3 candidate products per run.

Creates free 'TEST VERSION' listings on Gumroad and Stripe (mocked).
Aligns with PRIME DIRECTIVE: $10k/month → $10M in 3 years.
"""
from __future__ import annotations

import json
import os
import random
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import List

TOPICS = [
    "OSINT recon playbook",
    "Polar.sh funding launch kit",
    "AI hardware selection cheatsheet",
    "Gumroad automation blueprint",
    "Stripe pricing experiments toolkit",
    "GitHub sponsors funnel template",
    "Threat intel feed starter",
    "LLM inference cost calculator",
]


@dataclass
class ProductDraft:
    title: str
    platform: str
    price: float
    tag: str
    created_at: str


def score_topic(topic: str) -> float:
    # Deterministic-ish pseudo-score to avoid API calls.
    random.seed(hash(topic) & 0xFFFFFFFF)
    return round(random.uniform(0.55, 0.95), 3)


def mock_create_gumroad(title: str) -> dict:
    return {"platform": "gumroad", "id": f"gr_{abs(hash(title)) % 10**8}", "status": "draft"}


def mock_create_stripe(title: str) -> dict:
    return {"platform": "stripe", "id": f"prod_{abs(hash(title)) % 10**8}", "status": "draft"}


def evaluate(n: int = 3) -> List[dict]:
    ranked = sorted(TOPICS, key=score_topic, reverse=True)[:n]
    now = datetime.now(timezone.utc).isoformat()
    drafts: List[dict] = []
    for topic in ranked:
        draft = ProductDraft(
            title=f"{topic} — TEST VERSION",
            platform="gumroad+stripe",
            price=0.0,
            tag="test",
            created_at=now,
        )
        record = asdict(draft)
        record["gumroad"] = mock_create_gumroad(draft.title)
        record["stripe"] = mock_create_stripe(draft.title)
        record["score"] = score_topic(topic)
        drafts.append(record)
    return drafts


def main() -> int:
    out = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "prime_directive": "$10k/month -> $10M in 3 years",
        "products": evaluate(3),
    }
    os.makedirs(".sandbox", exist_ok=True)
    with open(".sandbox/market_evaluator_last_run.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
