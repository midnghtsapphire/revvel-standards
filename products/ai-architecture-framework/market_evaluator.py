"""Market evaluator — schedules 3 product creations per run.

Mocks Stripe & Gumroad clients so it can execute in CI without secrets.
Outputs a JSON manifest that downstream jobs can pick up.
"""
from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List

from cuda_mlops_wrapper import provision, snapshot


@dataclass
class ProductIdea:
    slug: str
    title: str
    price_usd: float
    platform: str  # "stripe" | "gumroad"
    sku: str

    def to_dict(self) -> dict:
        return asdict(self)


CANDIDATES: List[ProductIdea] = [
    ProductIdea("osint-recon-kit", "OSINT Recon Kit — 40 workflows", 29.0, "gumroad", "OSINT-001"),
    ProductIdea("polar-funding-pack", "Polar.sh Funding Launch Pack", 19.0, "stripe", "POLAR-001"),
    ProductIdea("ai-arch-playbook", "AI Architecture Playbook (JIT GPU)", 49.0, "gumroad", "ARCH-001"),
    ProductIdea("hw-selector-saas", "Hardware Selector SaaS (self-host)", 99.0, "stripe", "HW-001"),
    ProductIdea("gumroad-autopilot", "Gumroad Autopilot Templates", 15.0, "gumroad", "GUM-001"),
]


class MockStripe:
    def create_product(self, idea: ProductIdea) -> dict:
        return {
            "id": f"prod_mock_{idea.slug}",
            "name": f"TEST VERSION — {idea.title}",
            "price": 0,  # free while validating
            "live_price_usd": idea.price_usd,
            "platform": "stripe",
        }


class MockGumroad:
    def create_product(self, idea: ProductIdea) -> dict:
        return {
            "id": f"gum_mock_{idea.slug}",
            "name": f"TEST VERSION — {idea.title}",
            "price": 0,
            "live_price_usd": idea.price_usd,
            "platform": "gumroad",
        }


def select_ideas(k: int = 3) -> List[ProductIdea]:
    # Deterministic rotation by hour so CI runs are reproducible.
    offset = int(time.time() // 3600) % len(CANDIDATES)
    picks: List[ProductIdea] = []
    for i in range(k):
        picks.append(CANDIDATES[(offset + i) % len(CANDIDATES)])
    return picks


def run(output_dir: str = ".sandbox") -> dict:
    stripe = MockStripe()
    gumroad = MockGumroad()
    ideas = select_ideas(3)
    created = []
    for idea in ideas:
        client = stripe if idea.platform == "stripe" else gumroad
        created.append(client.create_product(idea))

    compute = provision("market-evaluator", min_memory_mb=0)

    manifest = {
        "generated_at": int(time.time()),
        "ideas": [i.to_dict() for i in ideas],
        "created": created,
        "compute": compute.to_dict(),
        "hardware_snapshot": snapshot(),
    }

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    (out / "market_manifest.json").write_text(json.dumps(manifest, indent=2))
    return manifest


if __name__ == "__main__":
    result = run(os.environ.get("OUTPUT_DIR", ".sandbox"))
    print(json.dumps(result, indent=2))
