"""JIT Compute Provisioning wrapper via CUDA interfaces (mock-safe).

Provides a thin abstraction over nvidia-smi with CPU fallback so the
framework runs in any environment (CI, laptop, GPU host).
"""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class GPUInfo:
    name: str
    memory_mb: int
    utilization_pct: int
    available: bool


@dataclass
class ProvisionResult:
    hardware: str
    provisioned: bool
    estimated_hourly_usd: float
    notes: str


# Approx spot pricing (USD/hr) — used for planning only.
PRICE_TABLE = {
    "cpu": 0.05,
    "t4": 0.35,
    "a10": 0.75,
    "a100": 1.90,
    "h100": 3.50,
}


def detect_gpu() -> Optional[GPUInfo]:
    """Return GPUInfo if nvidia-smi is present, else None (CPU fallback)."""
    if not shutil.which("nvidia-smi"):
        return None
    try:
        out = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total,utilization.gpu",
                "--format=csv,noheader,nounits",
            ],
            text=True,
            timeout=5,
        ).strip().splitlines()
        if not out:
            return None
        name, mem, util = [p.strip() for p in out[0].split(",")]
        return GPUInfo(name=name, memory_mb=int(mem), utilization_pct=int(util), available=True)
    except (subprocess.SubprocessError, ValueError, OSError):
        return None


def select_hardware(workload_gb: float, latency_ms: int) -> str:
    """Pick the cheapest hardware tier that fits the workload."""
    if workload_gb <= 1 and latency_ms >= 1000:
        return "cpu"
    if workload_gb <= 14:
        return "t4"
    if workload_gb <= 22:
        return "a10"
    if workload_gb <= 78:
        return "a100"
    return "h100"


def provision_jit(workload_gb: float, latency_ms: int, dry_run: bool = True) -> ProvisionResult:
    """Provision hardware just-in-time. Dry-run by default for safety."""
    tier = select_hardware(workload_gb, latency_ms)
    price = PRICE_TABLE.get(tier, 0.0)
    gpu = detect_gpu()
    notes = f"gpu_detected={gpu.name if gpu else 'none'}; dry_run={dry_run}"
    return ProvisionResult(
        hardware=tier,
        provisioned=not dry_run,
        estimated_hourly_usd=price,
        notes=notes,
    )


def release(result: ProvisionResult) -> dict:
    """Release provisioned resources (mock)."""
    return {"released": True, "hardware": result.hardware}


if __name__ == "__main__":
    r = provision_jit(workload_gb=12, latency_ms=200)
    print(json.dumps(asdict(r), indent=2))
