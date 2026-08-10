"""Market evaluator that schedules 3 product creations.

Mocks Stripe/Gumroad product creation. Real API keys would be wired
via environment variables in production.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import List


@dataclass
class Product:
    name: str
    platform: str  # "stripe" or "gumroad"
    price_usd: float
    tag: str
    created_at: str


TOPICS = [
    ("AI Architecture Cheatsheet", 0.0, "TEST VERSION"),
    ("CUDA Cost Calculator Spreadsheet", 0.0, "TEST VERSION"),
    ("Hardware Selection Playbook", 0.0, "TEST VERSION"),
]


def create_stripe_product_mock(name: str, price: float, tag: str) -> Product:
    # In production: stripe.Product.create(...)
    return Product(
        name=f"{name} [{tag}]",
        platform="stripe",
        price_usd=price,
        tag=tag,
        created_at=datetime.utcnow().isoformat() + "Z",
    )


def create_gumroad_product_mock(name: str, price: float, tag: str) -> Product:
    # In production: POST https://api.gumroad.com/v2/products
    return Product(
        name=f"{name} [{tag}]",
        platform="gumroad",
        price_usd=price,
        tag=tag,
        created_at=datetime.utcnow().isoformat() + "Z",
    )


def evaluate_and_create() -> List[Product]:
    products: List[Product] = []
    for idx, (name, price, tag) in enumerate(TOPICS):
        if idx % 2 == 0:
            products.append(create_stripe_product_mock(name, price, tag))
        else:
            products.append(create_gumroad_product_mock(name, price, tag))
    return products


def main() -> int:
    products = evaluate_and_create()
    out = {
        "run_at": datetime.utcnow().isoformat() + "Z",
        "count": len(products),
        "products": [asdict(p) for p in products],
        "dry_run": os.getenv("MARKET_EVALUATOR_LIVE") != "1",
    }
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
