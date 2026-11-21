"""Market evaluator: drafts 3 mock product launches per run.

Mocks the Stripe/Gumroad integration rather than calling either API, and
emits a JSON report that the GitHub Actions workflows upload as an artifact.
Designed to run headless.
"""
from __future__ import annotations

# 2026-11-20, kimi-work-lopez (flake8-debt PR): version 1's run() below calls
# dt.datetime.utcnow() but `dt` was never imported — a real NameError (F821)
# on every version-1 call, not a style nit. Added as an ADDITION here rather
# than editing the version-1 body, per OWNER RULE 5. Removing this import
# re-breaks version 1's run().
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
# SYNTAX REPAIR 2026-11-15 (blocker PR): two interleaved docstrings for the
# second module version overlapped here — the first opened and was closed by
# the second's opening quotes, leaving an unterminated string that broke
# compilation repo-wide (the validate-before-push hook refuses every push).
# Kept the fuller docstring; this file still holds two concatenated module
# versions (two __main__ blocks) awaiting a follow-up reconstruction.
"""Market evaluator: schedules 3 product creations/day with Stripe/Gumroad mocks.

Designed to run headless in GitHub Actions. Emits a JSON report per run.
"""

# 2026-11-20, kimi-work-lopez (flake8-debt PR): the imports below sit mid-file
# (E402) and re-import names from version 1 (F811) because this file holds two
# concatenated module versions — see the SYNTAX REPAIR note above. Consolidating
# them to the top or deduplicating TOPICS/run would merge the two versions,
# which is the "follow-up reconstruction" that note explicitly parks for the
# owner. Until she picks a surviving version, the noqa markers keep the gate
# honest without touching the structure. Removing a marker without doing the
# reconstruction turns the flake8 baseline gate red repo-wide.
import json  # noqa: E402
import os  # noqa: E402
import sys  # noqa: E402
from dataclasses import asdict, dataclass  # noqa: E402
from datetime import datetime, timezone  # noqa: E402
from typing import List  # noqa: E402,F811

CANDIDATE_TOPICS = [
    "OSINT dashboard template",
    "Polar.sh funding checklist",
    "AI architecture blueprint",
    "Hardware selection playbook",
    "JIT GPU cost calculator",
    "Gumroad launch kit",
    "Stripe metered billing recipes",
]  # SYNTAX REPAIR 2026-11-15: list was truncated mid-literal by the interleave; closed here.
import random  # noqa: E402,F811
from dataclasses import dataclass, asdict  # noqa: E402,F811
from datetime import datetime, timezone  # noqa: E402,F811
from typing import List  # noqa: E402,F811


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
    out_dir = os.environ.get("MARKET_EVAL_OUT", ".")
    if len(sys.argv) > 1:
        path = sys.argv[1]
    else:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
        path = os.path.join(out_dir, "market-eval-%s.json" % stamp)

    report = run(3)

    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)
    print(json.dumps(report, indent=2))
