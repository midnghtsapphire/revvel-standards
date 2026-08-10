"""JIT Compute Provisioning Wrapper.

Detects available CUDA hardware via nvidia-smi, falls back to CPU.
Mock interface for provisioning ephemeral GPU compute.
"""
from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class ComputeResource:
    kind: str  # "cuda" | "cpu"
    name: str
    memory_mb: int = 0
    cost_per_hour: float = 0.0
    meta: dict = field(default_factory=dict)


def detect_cuda_devices() -> List[ComputeResource]:
    """Detect CUDA devices via nvidia-smi. Returns [] if unavailable."""
    if not shutil.which("nvidia-smi"):
        return []
    try:
        out = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total",
             "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=5, check=False,
        )
        if out.returncode != 0:
            return []
        devices = []
        for line in out.stdout.strip().splitlines():
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 2:
                try:
                    mem = int(parts[1])
                except ValueError:
                    mem = 0
                devices.append(ComputeResource(
                    kind="cuda", name=parts[0], memory_mb=mem,
                    cost_per_hour=_estimate_cost(parts[0]),
                ))
        return devices
    except (subprocess.SubprocessError, OSError):
        return []


def _estimate_cost(gpu_name: str) -> float:
    name = gpu_name.lower()
    if "h100" in name:
        return 8.00
    if "a100" in name:
        return 3.50
    if "a10" in name or "l4" in name:
        return 1.20
    if "t4" in name:
        return 0.35
    return 0.50


def provision(preferred: str = "auto") -> ComputeResource:
    """Provision the best available compute resource."""
    if preferred in ("auto", "cuda"):
        cuda = detect_cuda_devices()
        if cuda:
            return cuda[0]
    return ComputeResource(kind="cpu", name="host-cpu", cost_per_hour=0.05)


def estimate_monthly_cost(resource: ComputeResource,
                          hours_per_day: float = 4.0) -> float:
    return resource.cost_per_hour * hours_per_day * 30


if __name__ == "__main__":
    r = provision()
    print(f"Provisioned: {r.kind} / {r.name}")
    print(f"Est. cost @4hr/day: ${estimate_monthly_cost(r):.2f}/mo")
