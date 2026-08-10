"""Market Evaluator - schedules 3 product creations with mock Stripe/Gumroad.

Run daily via GitHub Actions to identify trending topics and create
TEST VERSION products for validation.
"""
from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import List


@dataclass
class ProductIdea:
    title: str
    price_usd: float
    platform: str  # "stripe" | "gumroad"
    tags: List[str]
    created_at: str


TOPIC_POOL = [
    ("AI Architecture Playbook 2025", 49.0, ["ai", "mlops"]),
    ("JIT GPU Provisioning Guide", 29.0, ["cuda", "cost"]),
    ("OSINT Toolkit Bundle", 79.0, ["osint", "security"]),
    ("Polar.sh Setup for GitHub Devs", 19.0, ["polar", "funding"]),
    ("Automated Product Pipeline", 99.0, ["automation", "revenue"]),
    ("LLM Cost Optimization Handbook", 39.0, ["llm", "ops"]),
]


def select_top_n(n: int = 3) -> List[ProductIdea]:
    now = datetime.utcnow().isoformat()
    picks = TOPIC_POOL[:n]
    return [
        ProductIdea(
            title=f"TEST VERSION: {t}",
            price_usd=p,
            platform="gumroad" if i % 2 == 0 else "stripe",
            tags=tags,
            created_at=now,
        )
        for i, (t, p, tags) in enumerate(picks)
    ]


def mock_publish(idea: ProductIdea) -> dict:
    """Mock Stripe/Gumroad publish. Returns fake product URL."""
    slug = idea.title.lower().replace(" ", "-").replace(":", "")
    if idea.platform == "gumroad":
        url = f"https://gumroad.com/l/{slug}"
    else:
        url = f"https://buy.stripe.com/test_{slug[:20]}"
    return {"status": "created", "url": url, "product": asdict(idea)}


def run(dry_run: bool = False, out_path: str = "market-evaluator-log.json") -> int:
    ideas = select_top_n(3)
    results = [mock_publish(i) for i in ideas]
    payload = {"run_at": datetime.utcnow().isoformat(),
               "dry_run": dry_run, "results": results}
    if not dry_run:
        Path(out_path).write_text(json.dumps(payload, indent=2))
    print(json.dumps(payload, indent=2))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--out", default="market-evaluator-log.json")
    args = ap.parse_args()
    return run(dry_run=args.dry_run, out_path=args.out)


if __name__ == "__main__":
    raise SystemExit(main())
