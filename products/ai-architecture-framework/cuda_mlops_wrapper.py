"""CUDA JIT compute provisioning wrapper with CPU fallback.

Detects available GPU resources via nvidia-smi and provisions the
cheapest tier that meets the workload requirements. Falls back to
CPU when no GPU is available.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class ComputeResource:
    device: str  # "cuda" or "cpu"
    name: str
    memory_mb: int
    cost_per_hour: float
    est_latency_ms: int

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2)


HARDWARE_TIERS = {
    "cpu": ComputeResource("cpu", "CPU", 8192, 0.05, 500),
    "T4": ComputeResource("cuda", "NVIDIA T4", 16384, 0.35, 50),
    "A10G": ComputeResource("cuda", "NVIDIA A10G", 24576, 1.00, 30),
    "A100": ComputeResource("cuda", "NVIDIA A100", 40960, 3.00, 20),
    "H100": ComputeResource("cuda", "NVIDIA H100", 81920, 8.00, 15),
}


def nvidia_smi_available() -> bool:
    return shutil.which("nvidia-smi") is not None


def detect_gpu() -> Optional[str]:
    """Return detected GPU name or None if unavailable."""
    if not nvidia_smi_available():
        return None
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
            stderr=subprocess.DEVNULL,
            timeout=5,
        )
        name = out.decode().strip().splitlines()[0].strip()
        return name or None
    except (subprocess.SubprocessError, OSError):
        return None


def provision(required_memory_mb: int = 4096, budget_per_hour: float = 1.0) -> ComputeResource:
    """Provision the cheapest available compute meeting requirements."""
    gpu_name = detect_gpu()

    if gpu_name:
        # Try to match detected GPU to known tier
        for tier_key, tier in HARDWARE_TIERS.items():
            if tier_key.lower() in gpu_name.lower():
                if tier.memory_mb >= required_memory_mb and tier.cost_per_hour <= budget_per_hour:
                    return tier

    # Fallback: find cheapest tier meeting requirements within budget
    candidates = [
        t for t in HARDWARE_TIERS.values()
        if t.memory_mb >= required_memory_mb and t.cost_per_hour <= budget_per_hour
    ]
    if candidates:
        return min(candidates, key=lambda t: t.cost_per_hour)

    # Ultimate fallback: CPU
    return HARDWARE_TIERS["cpu"]


if __name__ == "__main__":
    resource = provision()
    print(resource.to_json())
