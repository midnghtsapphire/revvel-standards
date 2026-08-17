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
"""Market evaluator: schedules 3 product creations per run.

Mocks Stripe/Gumroad integration. Emits a JSON report that downstream
automation (GitHub Actions) uploads as an artifact.
"""Market evaluator: schedules 3 product creations/day with Stripe/Gumroad mocks.

Designed to run headless in GitHub Actions. Emits a JSON report per run.
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
import random
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import List


TOPICS = [
    "OSINT toolkit for GitHub recon",
    "AI architecture cost calculator",
    "JIT GPU provisioning CLI",
    "Polar.sh funding automation",
    "Stripe subscription boilerplate",
    "Gumroad digital product template",
    "MLOps starter for solo devs",
    "Hardware selection dashboard",
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
class ProductPlan:
    title: str
    platform: str
    price_usd: float
    est_monthly_revenue: float
    created_at: str
    mock: bool


def score(topic: str) -> float:
    # Deterministic-ish score seeded by topic length + random jitter.
    base = 100 + len(topic) * 3
    return round(base + random.uniform(0, 200), 2)


def pick_top(n: int = 3) -> List[str]:
    ranked = sorted(TOPICS, key=score, reverse=True)
    return ranked[:n]


def create_mock_product(topic: str, platform: str) -> ProductPlan:
    price = round(random.choice([0.0, 9.0, 19.0, 29.0]), 2)  # 0 = TEST VERSION
    est = round(price * random.randint(5, 50), 2)
    return ProductPlan(
        title=f"TEST VERSION — {topic}" if price == 0 else topic,
        platform=platform,
        price_usd=price,
        est_monthly_revenue=est,
        created_at=datetime.now(timezone.utc).isoformat(),
        mock=True,
    )


def run(n: int = 3) -> dict:
    top = pick_top(n)
    plans = []
    for i, topic in enumerate(top):
        platform = "stripe" if i % 2 == 0 else "gumroad"
        plans.append(create_mock_product(topic, platform))
    report = {
        "run_at": datetime.now(timezone.utc).isoformat(),
        "count": len(plans),
        "plans": [asdict(p) for p in plans],
        "total_projected_monthly_usd": round(sum(p.est_monthly_revenue for p in plans), 2),
    }
    return report


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "market-evaluator-report.json"
    report = run(out)
    out_dir = os.environ.get("MARKET_EVAL_OUT", ".")
    os.makedirs(out_dir, exist_ok=True)
    report = run(3)
    path = os.path.join(out_dir, f"market-eval-{datetime.now(timezone.utc).strftime('%Y%m%d')}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(json.dumps(report, indent=2))
