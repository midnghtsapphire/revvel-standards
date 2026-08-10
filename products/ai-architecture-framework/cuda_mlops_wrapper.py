"""JIT Compute provisioning wrapper.

Detects CUDA-capable GPUs via nvidia-smi and returns a provisioning plan.
Falls back to CPU when no GPU is available. All external calls are mocked
under the ``MOCK_MODE`` env var for CI safety.
"""
from __future__ import annotations

import os
import shutil
import subprocess
from dataclasses import dataclass, asdict
from typing import Optional

MOCK_MODE = os.environ.get("MOCK_MODE", "1") == "1"


@dataclass
class ComputePlan:
    device: str            # "cuda" | "cpu"
    gpu_name: Optional[str]
    memory_mb: int
    estimated_cost_per_hour_usd: float
    mocked: bool

    def to_dict(self) -> dict:
        return asdict(self)


GPU_COST_TABLE = {
    "T4": 0.35,
    "A10": 0.75,
    "A100": 2.10,
    "H100": 4.50,
}


def _detect_gpu() -> Optional[tuple[str, int]]:
    """Return (gpu_name, memory_mb) or None."""
    if MOCK_MODE:
        return None
    if not shutil.which("nvidia-smi"):
        return None
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name,memory.total",
             "--format=csv,noheader,nounits"],
            timeout=5,
            text=True,
        )
        first = out.strip().splitlines()[0]
        name, mem = [p.strip() for p in first.split(",", 1)]
        return name, int(mem)
    except (subprocess.SubprocessError, ValueError, IndexError):
        return None


def _price_for(gpu_name: str) -> float:
    for key, price in GPU_COST_TABLE.items():
        if key in gpu_name.upper():
            return price
    return 1.00  # default fallback price


def provision(workload: str = "inference") -> ComputePlan:
    """Return a ComputePlan for the requested workload."""
    gpu = _detect_gpu()
    if gpu is None:
        return ComputePlan(
            device="cpu",
            gpu_name=None,
            memory_mb=0,
            estimated_cost_per_hour_usd=0.05,
            mocked=MOCK_MODE,
        )
    name, mem = gpu
    return ComputePlan(
        device="cuda",
        gpu_name=name,
        memory_mb=mem,
        estimated_cost_per_hour_usd=_price_for(name),
        mocked=False,
    )


if __name__ == "__main__":
    import json
    print(json.dumps(provision().to_dict(), indent=2))
