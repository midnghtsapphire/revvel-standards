"""Market Evaluator: schedules creation of 3 AI-architecture products.

Mocks Stripe/Gumroad artifact creation for TEST VERSION offerings.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import List


@dataclass
class ProductArtifact:
    title: str
    slug: str
    platform: str  # "stripe" | "gumroad"
    price_usd: float
    tier: str  # e.g., "TEST VERSION"
    created_at: str
    payload: dict


CANDIDATE_TOPICS = [
    ("gpu-selection-cheatsheet", "GPU Selection Cheatsheet for AI Workloads"),
    ("jit-compute-playbook", "JIT Compute Provisioning Playbook"),
    ("llm-cost-calculator", "LLM Cost Calculator & Break-even Toolkit"),
    ("quantization-guide", "Quantization Guide: FP16/INT8/INT4"),
    ("osint-ml-pipelines", "OSINT ML Pipelines Starter Kit"),
]


def select_top_topics(n: int = 3) -> List[tuple]:
    # Deterministic selection for reproducibility; scoring could be added.
    return CANDIDATE_TOPICS[:n]


def create_stripe_artifact(slug: str, title: str) -> ProductArtifact:
    return ProductArtifact(
        title=f"[TEST VERSION] {title}",
        slug=slug,
        platform="stripe",
        price_usd=0.0,
        tier="TEST VERSION",
        created_at=datetime.now(timezone.utc).isoformat(),
        payload={"mode": "mock", "product_id": f"prod_test_{slug}"},
    )


def create_gumroad_artifact(slug: str, title: str) -> ProductArtifact:
    return ProductArtifact(
        title=f"[TEST VERSION] {title}",
        slug=slug,
        platform="gumroad",
        price_usd=0.0,
        tier="TEST VERSION",
        created_at=datetime.now(timezone.utc).isoformat(),
        payload={"mode": "mock", "permalink": f"gum_test_{slug}"},
    )


def run_evaluation(output_dir: str = "products/ai-architecture-framework/artifacts") -> List[ProductArtifact]:
    os.makedirs(output_dir, exist_ok=True)
    picks = select_top_topics(3)
    artifacts: List[ProductArtifact] = []
    for slug, title in picks:
        artifacts.append(create_stripe_artifact(slug, title))
        artifacts.append(create_gumroad_artifact(slug, title))
    out_path = os.path.join(output_dir, "latest_run.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump([asdict(a) for a in artifacts], f, indent=2)
    return artifacts


if __name__ == "__main__":
    results = run_evaluation()
    print(f"Created {len(results)} mock artifacts:")
    for a in results:
        print(f"  - [{a.platform}] {a.title}")
