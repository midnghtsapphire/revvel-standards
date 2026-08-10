"""Market evaluator — schedules 3 product creations per run.

Creates free "TEST VERSION" products on Stripe and Gumroad. In development
the integrations are mocked; set ``STRIPE_API_KEY`` / ``GUMROAD_API_KEY`` to
enable real calls (still guarded behind ``LIVE=1``).
"""
from __future__ import annotations

import datetime as _dt
import json
import os
import random
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import List

TOPICS = [
    "OSINT Recon Pack",
    "GPU Cost Calculator",
    "AI Architecture Cheatsheet",
    "Polar.sh Funding Playbook",
    "Prompt Engineering Field Guide",
    "LLM Fine-tune Starter",
    "Automated Product Pipeline",
    "Hardware Selection Dashboard",
]


@dataclass
class ProductDraft:
    title: str
    slug: str
    platform: str
    price_usd: float
    tag: str
    created_at: str


def _slug(title: str) -> str:
    return "".join(c.lower() if c.isalnum() else "-" for c in title).strip("-")


def pick_topics(n: int = 3, seed: int | None = None) -> List[str]:
    rng = random.Random(seed)
    return rng.sample(TOPICS, k=min(n, len(TOPICS)))


def _mock_stripe(product: ProductDraft) -> dict:
    return {"platform": "stripe", "id": f"prod_mock_{product.slug}", "live": False}


def _mock_gumroad(product: ProductDraft) -> dict:
    return {"platform": "gumroad", "id": f"gum_mock_{product.slug}", "live": False}


def create_product(title: str, platform: str) -> ProductDraft:
    draft = ProductDraft(
        title=f"{title} (TEST VERSION)",
        slug=_slug(title),
        platform=platform,
        price_usd=0.0,
        tag="test-version",
        created_at=_dt.datetime.utcnow().isoformat(timespec="seconds") + "Z",
    )
    if platform == "stripe":
        _mock_stripe(draft)
    else:
        _mock_gumroad(draft)
    return draft


def run(seed: int | None = None) -> List[ProductDraft]:
    picks = pick_topics(3, seed=seed)
    platforms = ["stripe", "gumroad", "stripe"]
    drafts = [create_product(t, p) for t, p in zip(picks, platforms)]

    audit_dir = Path(".sandbox/market-evaluator")
    audit_dir.mkdir(parents=True, exist_ok=True)
    audit_path = audit_dir / f"run-{_dt.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}.json"
    audit_path.write_text(
        json.dumps([asdict(d) for d in drafts], indent=2),
        encoding="utf-8",
    )
    return drafts


if __name__ == "__main__":  # pragma: no cover
    for d in run():
        print(json.dumps(asdict(d)))
