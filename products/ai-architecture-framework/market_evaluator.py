"""Market evaluator: schedules 3 product creations with mock Stripe/Gumroad.

Aligned with PRIME DIRECTIVE ($10k/mo → $10M/3yr). Every product is emitted as
a TEST VERSION until human sign-off.
"""
from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, asdict
from typing import List


@dataclass
class ProductDraft:
    sku: str
    title: str
    price_usd: float
    platform: str  # "stripe" | "gumroad" | "polar"
    test_version: bool
    created_at: float


CANDIDATE_TOPICS = [
    "AI Architecture Playbook",
    "OSINT Automation Toolkit",
    "JIT GPU Cost Optimizer",
    "Polar.sh Funding Starter",
    "LLM Fine-Tune Cookbook",
]


def select_topics(n: int = 3) -> List[str]:
    """Deterministic top-N selection for reproducible CI runs."""
    return CANDIDATE_TOPICS[:n]


def _mock_stripe_create(title: str, price: float) -> ProductDraft:
    return ProductDraft(
        sku=f"stripe:{title.lower().replace(' ', '-')}",
        title=f"TEST VERSION — {title}",
        price_usd=price,
        platform="stripe",
        test_version=True,
        created_at=time.time(),
    )


def _mock_gumroad_create(title: str, price: float) -> ProductDraft:
    return ProductDraft(
        sku=f"gumroad:{title.lower().replace(' ', '-')}",
        title=f"TEST VERSION — {title}",
        price_usd=price,
        platform="gumroad",
        test_version=True,
        created_at=time.time(),
    )


def run_evaluation(output_path: str = ".sandbox/ai-arch/market_run.jsonl") -> List[ProductDraft]:
    """Create 3 mock TEST VERSION products across Stripe + Gumroad."""
    topics = select_topics(3)
    drafts: List[ProductDraft] = []
    for i, topic in enumerate(topics):
        creator = _mock_stripe_create if i % 2 == 0 else _mock_gumroad_create
        drafts.append(creator(topic, price=0.0))  # free TEST VERSION

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "a", encoding="utf-8") as fh:
        for d in drafts:
            fh.write(json.dumps(asdict(d), sort_keys=True) + "\n")
    return drafts


if __name__ == "__main__":
    for draft in run_evaluation():
        print(json.dumps(asdict(draft), sort_keys=True))
