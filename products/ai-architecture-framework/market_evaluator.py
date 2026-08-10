"""Market Evaluator — schedules 3 free TEST VERSION products per run.

Mocks Stripe + Gumroad publishing. Real credentials are intentionally
omitted; env vars are read but never required.
"""
from __future__ import annotations

import json
import os
import random
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import List

TOPICS = [
    "OSINT recon playbook",
    "Polar.sh funding checklist",
    "AI hardware selection guide",
    "LLM cost calculator",
    "Automated Gumroad artifact pipeline",
    "Sandbox agent audit standard",
]


@dataclass
class ProductDraft:
    title: str
    platform: str
    price_usd: float
    label: str
    created_at: str

    def to_dict(self) -> dict:
        return asdict(self)


def _mock_stripe_publish(draft: ProductDraft) -> dict:
    return {
        "platform": "stripe",
        "id": f"prod_mock_{abs(hash(draft.title)) % 10_000_000}",
        "title": draft.title,
        "price": draft.price_usd,
        "live": bool(os.getenv("STRIPE_API_KEY")),
    }


def _mock_gumroad_publish(draft: ProductDraft) -> dict:
    return {
        "platform": "gumroad",
        "id": f"gum_mock_{abs(hash(draft.title)) % 10_000_000}",
        "title": draft.title,
        "price": draft.price_usd,
        "live": bool(os.getenv("GUMROAD_ACCESS_TOKEN")),
    }


def evaluate(n: int = 3, seed: int | None = None) -> List[dict]:
    rng = random.Random(seed)
    picks = rng.sample(TOPICS, k=min(n, len(TOPICS)))
    now = datetime.now(timezone.utc).isoformat()
    results: List[dict] = []
    for title in picks:
        draft = ProductDraft(
            title=title,
            platform="multi",
            price_usd=0.0,
            label="TEST VERSION",
            created_at=now,
        )
        results.append(
            {
                "draft": draft.to_dict(),
                "stripe": _mock_stripe_publish(draft),
                "gumroad": _mock_gumroad_publish(draft),
            }
        )
    return results


def main() -> None:
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "products": evaluate(3),
    }
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
