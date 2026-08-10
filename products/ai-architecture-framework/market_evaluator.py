"""Market evaluator: schedules 3 product creations per run.

Mocks Stripe/Gumroad integration. Emits a JSON report that downstream
automation (GitHub Actions) uploads as an artifact.
"""
from __future__ import annotations

import json
import os
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import List

CANDIDATE_TOPICS = [
    "OSINT dashboard template",
    "Polar.sh funding checklist",
    "AI architecture blueprint",
    "Hardware selection playbook",
    "JIT GPU cost calculator",
    "Gumroad launch kit",
    "Stripe metered billing recipes",
]


@dataclass
class ProductDraft:
    title: str
    slug: str
    channel: str  # "stripe" | "gumroad"
    price_usd: float
    tier: str  # "TEST VERSION" | "paid"


def pick_topics(n: int = 3, seed: int | None = None) -> List[str]:
    if seed is None:
        seed = int(datetime.now(timezone.utc).strftime("%Y%m%d"))
    picks: List[str] = []
    for i in range(n):
        picks.append(CANDIDATE_TOPICS[(seed + i) % len(CANDIDATE_TOPICS)])
    return picks


def draft_product(topic: str, idx: int) -> ProductDraft:
    slug = topic.lower().replace(" ", "-")
    channel = "gumroad" if idx % 2 == 0 else "stripe"
    return ProductDraft(
        title=topic,
        slug=slug,
        channel=channel,
        price_usd=0.0,
        tier="TEST VERSION",
    )


def mock_publish(product: ProductDraft) -> dict:
    """Simulate publishing to Stripe/Gumroad. Returns a receipt."""
    return {
        "channel": product.channel,
        "slug": product.slug,
        "published_at": datetime.now(timezone.utc).isoformat(),
        "status": "mock_ok",
        "external_id": f"mock_{product.channel}_{product.slug}",
    }


def run(output_path: str | None = None) -> dict:
    topics = pick_topics(3)
    drafts = [draft_product(t, i) for i, t in enumerate(topics)]
    receipts = [mock_publish(d) for d in drafts]
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "drafts": [asdict(d) for d in drafts],
        "receipts": receipts,
    }
    if output_path:
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
    return report


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "market-evaluator-report.json"
    report = run(out)
    print(json.dumps(report, indent=2))
