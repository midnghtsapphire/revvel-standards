"""Market evaluator: picks 3 product ideas and creates TEST listings.

Uses mock Stripe/Gumroad clients so it is safe to run in CI. Real
credentials can be wired later via env vars (STRIPE_API_KEY, GUMROAD_TOKEN).
"""
from __future__ import annotations

import json
import os
import random
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import List

from cuda_mlops_wrapper import provision  # type: ignore

TOPICS = [
    "OSINT Pack: Threat Actor Dossier Template",
    "AI Architecture Blueprint: Cheap LLM Inference",
    "Prompt Pack: Revenue Ops Automation",
    "Polar.sh Funding Playbook",
    "GPU Cost Calculator Spreadsheet",
    "Hardware Selection Cheatsheet",
]


@dataclass
class Product:
    sku: str
    title: str
    platform: str
    price_usd: float
    url: str
    compute_profile: dict


def _mock_stripe(title: str) -> str:
    return f"https://buy.stripe.com/test_{abs(hash(title)) % 10_000_000:07d}"


def _mock_gumroad(title: str) -> str:
    slug = title.lower().replace(" ", "-").replace(":", "")[:40]
    return f"https://gumroad.com/l/{slug}-test"


def evaluate(n: int = 3, seed: int | None = None) -> List[Product]:
    rng = random.Random(seed if seed is not None else time.time_ns())
    picks = rng.sample(TOPICS, k=min(n, len(TOPICS)))
    products: List[Product] = []
    for i, title in enumerate(picks):
        platform = "stripe" if i % 2 == 0 else "gumroad"
        url = _mock_stripe(title) if platform == "stripe" else _mock_gumroad(title)
        profile = provision("llm-inference").to_dict()
        products.append(
            Product(
                sku=f"TEST-{int(time.time())}-{i}",
                title=f"[TEST VERSION] {title}",
                platform=platform,
                price_usd=0.0,
                url=url,
                compute_profile=profile,
            )
        )
    return products


def main() -> int:
    out_dir = Path(os.environ.get("MARKET_OUT_DIR", ".sandbox/market"))
    out_dir.mkdir(parents=True, exist_ok=True)
    products = evaluate(3)
    payload = {
        "generated_at": int(time.time()),
        "products": [asdict(p) for p in products],
    }
    out_file = out_dir / "latest.json"
    out_file.write_text(json.dumps(payload, indent=2))
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
