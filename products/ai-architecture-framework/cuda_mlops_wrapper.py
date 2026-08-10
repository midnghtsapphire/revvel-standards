"""CUDA / JIT compute provisioning wrapper.

Provides a thin abstraction over nvidia-smi with a CPU fallback so the
market evaluator and dashboard can request compute without hard
dependencies on a GPU host.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass, asdict
from typing import List, Optional


@dataclass
class ComputeUnit:
    kind: str  # "gpu" | "cpu"
    name: str
    memory_mb: int
    utilization_pct: float
    est_cost_per_hour_usd: float

    def to_dict(self) -> dict:
        return asdict(self)


# Rough spot pricing (USD/hr) — used for revenue attribution only.
_PRICE_TABLE = {
    "T4": 0.11,
    "L4": 0.28,
    "A10": 0.45,
    "A100": 1.10,
    "H100": 2.20,
    "CPU": 0.02,
}


def _price_for(name: str) -> float:
    for key, price in _PRICE_TABLE.items():
        if key in name.upper():
            return price
    return 0.05


def detect_gpus() -> List[ComputeUnit]:
    """Return a list of visible GPUs via nvidia-smi, or [] if none."""
    if shutil.which("nvidia-smi") is None:
        return []
    try:
        out = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total,utilization.gpu",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=5,
            check=True,
        )
    except (subprocess.SubprocessError, OSError):
        return []
    gpus: List[ComputeUnit] = []
    for line in out.stdout.strip().splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 3:
            continue
        name, mem, util = parts[0], parts[1], parts[2]
        try:
            gpus.append(
                ComputeUnit(
                    kind="gpu",
                    name=name,
                    memory_mb=int(float(mem)),
                    utilization_pct=float(util),
                    est_cost_per_hour_usd=_price_for(name),
                )
            )
        except ValueError:
            continue
    return gpus


def cpu_fallback() -> ComputeUnit:
    return ComputeUnit(
        kind="cpu",
        name="CPU-fallback",
        memory_mb=0,
        utilization_pct=0.0,
        est_cost_per_hour_usd=_PRICE_TABLE["CPU"],
    )


def provision(workload: str, min_memory_mb: int = 0) -> ComputeUnit:
    """JIT provision the cheapest compute unit that satisfies the workload.

    Falls back to CPU when no GPU is available or requirements aren't met.
    """
    gpus = detect_gpus()
    eligible = [g for g in gpus if g.memory_mb >= min_memory_mb]
    if not eligible:
        return cpu_fallback()
    # Cheapest first.
    eligible.sort(key=lambda g: g.est_cost_per_hour_usd)
    return eligible[0]


def snapshot() -> dict:
    gpus = detect_gpus()
    return {
        "gpus": [g.to_dict() for g in gpus],
        "fallback": cpu_fallback().to_dict(),
        "count": len(gpus),
    }


if __name__ == "__main__":
    print(json.dumps(snapshot(), indent=2))
