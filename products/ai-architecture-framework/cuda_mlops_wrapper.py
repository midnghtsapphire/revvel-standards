"""JIT CUDA compute provisioning wrapper (mock-safe).

Detects CUDA via `nvidia-smi` when available and falls back to a CPU
profile. Designed to be imported by the market evaluator and dashboard
backends without requiring a real GPU in CI.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import asdict, dataclass
from typing import List, Optional


@dataclass
class ComputeProfile:
    device: str            # "cuda" | "cpu"
    gpu_name: Optional[str]
    gpu_count: int
    memory_mb: int
    est_hourly_usd: float

    def to_dict(self) -> dict:
        return asdict(self)


_TIER_PRICING = {
    "T4": 0.35,
    "L4": 0.60,
    "A10G": 1.00,
    "A100": 3.05,
    "H100": 4.50,
    "CPU": 0.05,
}


def _price_for(gpu_name: Optional[str]) -> float:
    if not gpu_name:
        return _TIER_PRICING["CPU"]
    upper = gpu_name.upper()
    for tier, price in _TIER_PRICING.items():
        if tier in upper:
            return price
    return 1.00


def detect_cuda() -> ComputeProfile:
    """Return a ComputeProfile using nvidia-smi if present, else CPU."""
    smi = shutil.which("nvidia-smi")
    if not smi:
        return ComputeProfile(
            device="cpu",
            gpu_name=None,
            gpu_count=0,
            memory_mb=0,
            est_hourly_usd=_TIER_PRICING["CPU"],
        )
    try:
        out = subprocess.check_output(
            [smi, "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
            stderr=subprocess.DEVNULL,
            timeout=5,
        ).decode().strip()
    except (subprocess.SubprocessError, OSError):
        return ComputeProfile("cpu", None, 0, 0, _TIER_PRICING["CPU"])

    lines = [l for l in out.splitlines() if l.strip()]
    if not lines:
        return ComputeProfile("cpu", None, 0, 0, _TIER_PRICING["CPU"])

    first = lines[0].split(",")
    name = first[0].strip()
    mem = int(first[1].strip()) if len(first) > 1 and first[1].strip().isdigit() else 0
    return ComputeProfile(
        device="cuda",
        gpu_name=name,
        gpu_count=len(lines),
        memory_mb=mem,
        est_hourly_usd=_price_for(name) * len(lines),
    )


def provision(workload: str, budget_usd_per_hour: float = 2.0) -> ComputeProfile:
    """Return a compute profile respecting a per-hour budget."""
    profile = detect_cuda()
    if profile.est_hourly_usd <= budget_usd_per_hour:
        return profile
    # Downgrade to CPU if over budget.
    return ComputeProfile("cpu", None, 0, 0, _TIER_PRICING["CPU"])


def recommend(workloads: List[str]) -> dict:
    """Recommend a compute profile per workload."""
    return {w: provision(w).to_dict() for w in workloads}


if __name__ == "__main__":
    print(json.dumps(recommend(["llm-inference", "embeddings", "osint-scrape"]), indent=2))
