"""Market evaluator: schedules 3 product creations per run.

Mock Stripe/Gumroad clients emit ``TEST VERSION`` free products for audit.
"""
from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, asdict
from typing import List


@dataclass
class Product:
    title: str
    platform: str  # "stripe" | "gumroad"
    price_usd: float
    tag: str = "TEST VERSION"
    created_at: float = 0.0


TOPICS = [
    "OSINT Cheatsheet Bundle",
    "Polar.sh Funding Playbook",
    "AI Architecture Blueprint",
    "GPU Cost Optimization Guide",
    "Automated Product Pipeline Kit",
]


def select_topics(n: int = 3) -> List[str]:
    return TOPICS[:n]


class MockStripeClient:
    def create_product(self, title: str) -> Product:
        return Product(
            title=title, platform="stripe", price_usd=0.0,
            created_at=time.time(),
        )


class MockGumroadClient:
    def create_product(self, title: str) -> Product:
        return Product(
            title=title, platform="gumroad", price_usd=0.0,
            created_at=time.time(),
        )


def run(output_path: str = ".sandbox/market_evaluator.jsonl") -> List[Product]:
    stripe = MockStripeClient()
    gumroad = MockGumroadClient()
    products: List[Product] = []
    for i, topic in enumerate(select_topics(3)):
        client = stripe if i % 2 == 0 else gumroad
        products.append(client.create_product(topic))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "a", encoding="utf-8") as fh:
        for p in products:
            fh.write(json.dumps(asdict(p)) + "\n")
    return products


if __name__ == "__main__":
    for p in run():
        print(json.dumps(asdict(p)))
