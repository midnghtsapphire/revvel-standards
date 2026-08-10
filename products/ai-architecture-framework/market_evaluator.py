"""Daily market evaluator: selects 3 topics and creates free TEST VERSION
products on Stripe/Gumroad (mocked).

Writes an audit log to `.sandbox/market_evaluator/` for observability.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import random
from pathlib import Path
from typing import Dict, List

TOPICS = [
    "OSINT recon toolkit",
    "GitHub funding automation (Polar.sh)",
    "AI architecture ADR generator",
    "CUDA JIT provisioning CLI",
    "Hardware selection dashboard",
    "LLM cost calculator",
    "Prompt-injection scanner",
    "Serverless GPU router",
    "Model quantization pipeline",
    "Revenue attribution for OSS",
]


def pick_topics(n: int = 3, seed: int | None = None) -> List[str]:
    rng = random.Random(seed)
    return rng.sample(TOPICS, k=n)


def create_stripe_product_mock(title: str) -> Dict:
    return {
        "platform": "stripe",
        "id": f"prod_test_{abs(hash(title)) % 10**8}",
        "name": f"TEST VERSION — {title}",
        "price_usd": 0,
        "livemode": False,
    }


def create_gumroad_product_mock(title: str) -> Dict:
    return {
        "platform": "gumroad",
        "id": f"gum_test_{abs(hash(title)) % 10**8}",
        "name": f"TEST VERSION — {title}",
        "price_usd": 0,
        "published": False,
    }


def run(seed: int | None = None, out_dir: str | None = None) -> Dict:
    topics = pick_topics(3, seed=seed)
    products = []
    for t in topics:
        products.append(create_stripe_product_mock(t))
        products.append(create_gumroad_product_mock(t))

    result = {
        "run_at": dt.datetime.utcnow().isoformat() + "Z",
        "topics": topics,
        "products": products,
        "prime_directive": "$10k/month -> $10M in 3 years",
    }

    base = Path(out_dir) if out_dir else Path(".sandbox/market_evaluator")
    base.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    (base / f"run-{stamp}.json").write_text(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    seed = int(os.environ.get("MARKET_EVAL_SEED", "0")) or None
    print(json.dumps(run(seed=seed), indent=2))
