"""JIT Compute provisioning wrapper (mock CUDA interface).

Detects NVIDIA GPUs via `nvidia-smi` when available and falls back to CPU.
Provides a minimal, dependency-free surface for scheduling AI workloads under
the AI Architecture Framework.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import time
import uuid
from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class ProvisionResult:
    job_id: str
    device: str  # "cuda" | "cpu"
    gpu_name: Optional[str]
    est_cost_per_hour_usd: float
    jit: bool
    started_at: float

    def to_json(self) -> str:
        return json.dumps(asdict(self), sort_keys=True)


DEFAULT_GPU_PRICES = {
    "L4": 0.44,
    "RTX 4090": 0.39,
    "A100": 1.29,
    "H100": 2.99,
}


def _detect_gpu() -> Optional[str]:
    """Return GPU model string via nvidia-smi, or None."""
    if shutil.which("nvidia-smi") is None:
        return None
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
            stderr=subprocess.STDOUT,
            timeout=5,
        )
        line = out.decode("utf-8", errors="ignore").strip().splitlines()
        return line[0].strip() if line else None
    except (subprocess.SubprocessError, OSError):
        return None


def _price_for(gpu_name: Optional[str]) -> float:
    if not gpu_name:
        return 0.05  # CPU fallback
    for key, price in DEFAULT_GPU_PRICES.items():
        if key.lower() in gpu_name.lower():
            return price
    return 0.50  # unknown GPU default


def provision(workload: str, max_cost_per_hour_usd: float = 5.0) -> ProvisionResult:
    """Provision compute for a given workload label.

    Enforces a hard cost ceiling per AI Architecture Framework guardrails.
    """
    gpu = _detect_gpu()
    price = _price_for(gpu)
    if price > max_cost_per_hour_usd:
        # Downgrade to CPU rather than exceed budget.
        gpu = None
        price = 0.05

    return ProvisionResult(
        job_id=f"job-{uuid.uuid4().hex[:8]}",
        device="cuda" if gpu else "cpu",
        gpu_name=gpu,
        est_cost_per_hour_usd=price,
        jit=True,
        started_at=time.time(),
    )


if __name__ == "__main__":
    result = provision("demo-inference")
    print(result.to_json())
