"""JIT Compute provisioning wrapper.

Detects available CUDA hardware via `nvidia-smi` and falls back to CPU.
Mock-safe: no paid provisioning unless ALLOW_PAID=1.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class ComputeTier:
    name: str
    provider: str
    estimated_cost_per_hour_usd: float


TIERS = {
    "cpu": ComputeTier("cpu", "local", 0.0),
    "t4": ComputeTier("t4", "runpod", 0.20),
    "a10": ComputeTier("a10", "runpod", 0.60),
    "a100": ComputeTier("a100", "runpod", 1.90),
}


def detect_local_gpu() -> Optional[str]:
    """Return detected GPU model or None."""
    if not shutil.which("nvidia-smi"):
        return None
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
            timeout=5,
            text=True,
        )
        first = out.strip().splitlines()[0].lower()
        if "a100" in first:
            return "a100"
        if "a10" in first:
            return "a10"
        if "t4" in first:
            return "t4"
        return "cpu"
    except (subprocess.SubprocessError, OSError):
        return None


def select_tier(prompt_tokens: int, needs_finetune: bool = False) -> ComputeTier:
    """Pick the cheapest viable tier for the workload."""
    allow_paid = os.environ.get("ALLOW_PAID", "0") == "1"

    local = detect_local_gpu()
    if local and local != "cpu":
        return TIERS[local]

    if needs_finetune or prompt_tokens > 32_000:
        return TIERS["a100"] if allow_paid else TIERS["cpu"]
    if prompt_tokens > 4_000:
        return TIERS["t4"] if allow_paid else TIERS["cpu"]
    return TIERS["cpu"]


def provision(prompt_tokens: int = 1024, needs_finetune: bool = False) -> dict:
    tier = select_tier(prompt_tokens, needs_finetune)
    result = {
        "hardware": tier.name,
        "provider": tier.provider,
        "estimated_cost_usd": round(tier.estimated_cost_per_hour_usd, 4),
        "paid_enabled": os.environ.get("ALLOW_PAID", "0") == "1",
    }
    return result


if __name__ == "__main__":
    print(json.dumps(provision(), indent=2))
