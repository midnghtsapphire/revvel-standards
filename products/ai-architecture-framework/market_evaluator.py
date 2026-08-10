"""Market evaluator: schedules 3 candidate products per run.

Mock Stripe / Gumroad integrations create free "TEST VERSION" products so we
can validate the full pipeline before spending real money or credentials.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Iterable

CANDIDATE_TOPICS = [
    "OSINT breach-monitor CLI",
    "Polar.sh funding-tier template pack",
    "AI hardware cost calculator (spreadsheet + API)",
    "Prompt-library for indie hackers",
    "Gumroad launch checklist (Notion + PDF)",
    "Serverless RAG starter kit",
]


@dataclass
class ProductDraft:
    title: str
    platform: str  # "stripe" | "gumroad"
    price_usd: float
    tag: str
    created_at: str
    mock: bool


def _pick_topics(n: int = 3) -> list[str]:
    # Deterministic rotation by UTC day so daily runs don't repeat identically.
    day = datetime.now(timezone.utc).timetuple().tm_yday
    return [CANDIDATE_TOPICS[(day + i) % len(CANDIDATE_TOPICS)] for i in range(n)]


def _mock_stripe_create(title: str) -> ProductDraft:
    return ProductDraft(
        title=f"TEST VERSION — {title}",
        platform="stripe",
        price_usd=0.0,
        tag="test",
        created_at=datetime.now(timezone.utc).isoformat(),
        mock=True,
    )


def _mock_gumroad_create(title: str) -> ProductDraft:
    return ProductDraft(
        title=f"TEST VERSION — {title}",
        platform="gumroad",
        price_usd=0.0,
        tag="test",
        created_at=datetime.now(timezone.utc).isoformat(),
        mock=True,
    )


def schedule_products(n: int = 3) -> list[ProductDraft]:
    topics = _pick_topics(n)
    drafts: list[ProductDraft] = []
    for i, topic in enumerate(topics):
        creator = _mock_stripe_create if i % 2 == 0 else _mock_gumroad_create
        drafts.append(creator(topic))
    return drafts


def dump(drafts: Iterable[ProductDraft]) -> str:
    return json.dumps([asdict(d) for d in drafts], indent=2)


if __name__ == "__main__":  # pragma: no cover
    result = schedule_products(3)
    out_dir = os.path.join(os.path.dirname(__file__), "runs")
    os.makedirs(out_dir, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = os.path.join(out_dir, f"run-{stamp}.json")
    with open(path, "w", encoding="utf-8") as f:
        f.write(dump(result))
    print(dump(result))
    print(f"wrote {path}")
