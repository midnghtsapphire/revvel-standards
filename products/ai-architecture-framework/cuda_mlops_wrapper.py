"""JIT compute provisioning wrapper.

Attempts to use ``nvidia-smi`` to detect available GPUs. Falls back to a
CPU-only mock implementation so the framework runs on any dev machine or CI
runner. This is intentionally lightweight — the goal is to inform
architecture decisions, not to replace a real MLOps stack.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import asdict, dataclass
from typing import List, Optional


@dataclass
class GPUInfo:
    index: int
    name: str
    memory_mib: int
    utilization_pct: int


@dataclass
class ProvisionPlan:
    tier: str
    reason: str
    estimated_hourly_usd: float
    gpus: List[GPUInfo]


TIER_PRICING_USD = {
    "CPU": 0.05,
    "T4": 0.35,
    "A10": 1.00,
    "A100": 3.20,
    "H100": 8.00,
}


def _query_nvidia_smi() -> List[GPUInfo]:
    if not shutil.which("nvidia-smi"):
        return []
    try:
        out = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=index,name,memory.total,utilization.gpu",
                "--format=csv,noheader,nounits",
            ],
            text=True,
            timeout=5,
        )
    except (subprocess.SubprocessError, OSError):
        return []

    gpus: List[GPUInfo] = []
    for line in out.strip().splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) != 4:
            continue
        try:
            gpus.append(
                GPUInfo(
                    index=int(parts[0]),
                    name=parts[1],
                    memory_mib=int(parts[2]),
                    utilization_pct=int(parts[3]),
                )
            )
        except ValueError:
            continue
    return gpus


def _pick_tier(model_params_b: float, gpus: List[GPUInfo]) -> str:
    if model_params_b < 7:
        return "T4" if gpus else "CPU"
    if model_params_b < 34:
        return "A10"
    if model_params_b < 70:
        return "A100"
    return "H100"


def provision(model_params_b: float = 7.0, budget_usd_hr: Optional[float] = None) -> ProvisionPlan:
    """Return a provisioning plan for the requested workload."""
    gpus = _query_nvidia_smi()
    tier = _pick_tier(model_params_b, gpus)
    price = TIER_PRICING_USD[tier]

    reason = f"model={model_params_b}B params, detected_gpus={len(gpus)}"
    if budget_usd_hr is not None and price > budget_usd_hr:
        # Downgrade to the cheapest tier under budget.
        for candidate in ("CPU", "T4", "A10", "A100", "H100"):
            if TIER_PRICING_USD[candidate] <= budget_usd_hr:
                tier = candidate
                price = TIER_PRICING_USD[candidate]
        reason += f", budget_capped=${budget_usd_hr}/hr"

    return ProvisionPlan(
        tier=tier,
        reason=reason,
        estimated_hourly_usd=price,
        gpus=gpus,
    )


def plan_to_json(plan: ProvisionPlan) -> str:
    return json.dumps(
        {
            **asdict(plan),
            "gpus": [asdict(g) for g in plan.gpus],
        },
        indent=2,
    )


if __name__ == "__main__":  # pragma: no cover
    import argparse

    parser = argparse.ArgumentParser(description="JIT compute provisioning wrapper")
    parser.add_argument("--params-b", type=float, default=7.0, help="Model params in billions")
    parser.add_argument("--budget", type=float, default=None, help="Max USD/hr")
    args = parser.parse_args()

    print(plan_to_json(provision(args.params_b, args.budget)))
