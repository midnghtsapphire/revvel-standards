"""JIT Compute provisioning wrapper via CUDA interfaces (mock).

Detects available GPU resources via `nvidia-smi` when present, otherwise
falls back to CPU-only mode. Used by the market evaluator to select
appropriate hardware for scheduled product-creation runs.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass, asdict
from typing import List, Optional


@dataclass
class GPUDevice:
    index: int
    name: str
    memory_mb: int
    utilization_pct: int


@dataclass
class ProvisioningPlan:
    mode: str  # "gpu" or "cpu"
    devices: List[GPUDevice]
    estimated_cost_per_hour: float
    notes: str


def detect_gpus() -> List[GPUDevice]:
    """Return list of GPUs via nvidia-smi, or [] if unavailable."""
    if not shutil.which("nvidia-smi"):
        return []
    try:
        out = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=index,name,memory.total,utilization.gpu",
                "--format=csv,noheader,nounits",
            ],
            timeout=5,
            text=True,
        )
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError):
        return []

    devices: List[GPUDevice] = []
    for line in out.strip().splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 4:
            continue
        try:
            devices.append(
                GPUDevice(
                    index=int(parts[0]),
                    name=parts[1],
                    memory_mb=int(parts[2]),
                    utilization_pct=int(parts[3]),
                )
            )
        except ValueError:
            continue
    return devices


def plan_provisioning(min_vram_mb: int = 8000) -> ProvisioningPlan:
    """Decide GPU vs CPU based on availability.

    Cost model is intentionally simplistic:
      - GPU: $0.50/hr baseline + $0.10/hr per additional device.
      - CPU: $0.02/hr.
    """
    gpus = [g for g in detect_gpus() if g.memory_mb >= min_vram_mb]
    if gpus:
        cost = 0.50 + 0.10 * max(0, len(gpus) - 1)
        return ProvisioningPlan(
            mode="gpu",
            devices=gpus,
            estimated_cost_per_hour=round(cost, 2),
            notes=f"Selected {len(gpus)} GPU(s) meeting VRAM threshold.",
        )
    return ProvisioningPlan(
        mode="cpu",
        devices=[],
        estimated_cost_per_hour=0.02,
        notes="No suitable GPU detected; falling back to CPU.",
    )


def plan_to_json(plan: ProvisioningPlan) -> str:
    payload = asdict(plan)
    payload["devices"] = [asdict(d) for d in plan.devices]
    return json.dumps(payload, indent=2)


if __name__ == "__main__":
    print(plan_to_json(plan_provisioning()))
