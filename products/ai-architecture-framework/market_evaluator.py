#!/usr/bin/env python3
"""Market evaluator: schedules N product creations with Stripe/Gumroad mocks.

Emits a JSON manifest of "TEST VERSION" free products for email capture,
feeding the $10k/month → $10M/3yr funnel.
"""
from __future__ import annotations

import argparse
import json
import random
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Optional

TOPICS = [
    ("GPU Cost Calculator", "Interactive spreadsheet comparing A100/H100/T4 spot pricing."),
    ("CUDA JIT Playbook", "Copy-paste scripts for just-in-time GPU provisioning."),
    ("MLOps Hardware Selector", "Decision tree: pick the right GPU for your workload."),
    ("LLM Fine-tune Budget Sheet", "Estimate fine-tune cost per token per model size."),
    ("Inference Latency Benchmark Pack", "Prebuilt latency tests for T4/A10G/A100."),
    ("OSINT Rig Blueprint", "Hardware stack for continuous OSINT ingestion."),
    ("Polar.sh Funding Checklist", "Steps to launch a GitHub-funded OSS product."),
]


@dataclass
class ProductDraft:
    id: str
    title: str
    description: str
    price_usd: float
    stripe_product_id: str  # mock
    gumroad_permalink: str  # mock
    tag: str = "TEST VERSION"


def mock_stripe_id(seed: str) -> str:
    return f"prod_test_{abs(hash(seed)) % 10**10:010d}"


def mock_gumroad_permalink(title: str) -> str:
    slug = title.lower().replace(" ", "-")
    return f"https://gumroad.com/l/{slug}-test"


def evaluate(count: int, seed: Optional[int] = None) -> List[ProductDraft]:
    rng = random.Random(seed if seed is not None else int(time.time()))
    picks = rng.sample(TOPICS, k=min(count, len(TOPICS)))
    drafts: List[ProductDraft] = []
    for i, (title, desc) in enumerate(picks):
        drafts.append(
            ProductDraft(
                id=f"draft-{int(time.time())}-{i}",
                title=title,
                description=desc,
                price_usd=0.0,
                stripe_product_id=mock_stripe_id(title),
                gumroad_permalink=mock_gumroad_permalink(title),
            )
        )
    return drafts


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Market evaluator (mock)")
    parser.add_argument("--count", type=int, default=3)
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--out", type=Path, default=None, help="Optional JSON output file")
    args = parser.parse_args(argv)

    drafts = evaluate(args.count, args.seed)
    payload = {
        "generated_at": time.time(),
        "count": len(drafts),
        "products": [asdict(d) for d in drafts],
    }
    text = json.dumps(payload, indent=2)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text)
    print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
