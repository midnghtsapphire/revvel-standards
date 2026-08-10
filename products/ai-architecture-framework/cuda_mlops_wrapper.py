"""CUDA JIT Compute Wrapper - detects GPU availability and provisions accordingly.

Falls back to CPU when nvidia-smi is unavailable. Used by market_evaluator
and downstream product-generation agents.
"""
from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class ComputeResource:
    device: str  # "cuda" | "cpu"
    name: str
    memory_mb: int = 0
    cost_per_hour: float = 0.0
    gpus: List[str] = field(default_factory=list)


# Cost matrix (USD/hr) — align with ai_architecture_system.md
HARDWARE_COST = {
    "cpu": 0.05,
    "T4": 0.35,
    "A10": 0.60,
    "A100": 2.00,
    "H100": 4.50,
}


def _nvidia_smi_available() -> bool:
    return shutil.which("nvidia-smi") is not None


def _query_gpus() -> List[str]:
    try:
        out = subprocess.run(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        if out.returncode != 0:
            return []
        return [line.strip() for line in out.stdout.splitlines() if line.strip()]
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        return []


def _classify_gpu(name: str) -> str:
    n = name.upper()
    for key in ("H100", "A100", "A10", "T4"):
        if key in n:
            return key
    return "T4"  # conservative default


def detect_compute() -> ComputeResource:
    """Return the best available compute resource."""
    if _nvidia_smi_available():
        gpus = _query_gpus()
        if gpus:
            tier = _classify_gpu(gpus[0])
            return ComputeResource(
                device="cuda",
                name=gpus[0],
                cost_per_hour=HARDWARE_COST.get(tier, 0.60),
                gpus=gpus,
            )
    return ComputeResource(
        device="cpu",
        name="cpu-fallback",
        cost_per_hour=HARDWARE_COST["cpu"],
    )


def provision(workload: str = "inference", max_cost_per_hour: Optional[float] = None) -> ComputeResource:
    """Mock JIT provisioning. Returns a ComputeResource honoring cost cap."""
    resource = detect_compute()
    if max_cost_per_hour is not None and resource.cost_per_hour > max_cost_per_hour:
        # downgrade to CPU
        return ComputeResource(device="cpu", name="cpu-fallback", cost_per_hour=HARDWARE_COST["cpu"])
    return resource


if __name__ == "__main__":
    r = provision()
    print(f"Provisioned: {r.device} ({r.name}) @ ${r.cost_per_hour}/hr")
