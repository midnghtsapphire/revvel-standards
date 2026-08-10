"""JIT Compute provisioning wrapper via CUDA interfaces.

Detects GPU via nvidia-smi with graceful CPU fallback.
Used by the AI Architecture framework to route workloads to the
cheapest viable hardware tier.
"""
from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class DeviceInfo:
    name: str
    kind: str  # "gpu" | "cpu"
    memory_mb: int = 0
    index: int = 0


@dataclass
class ProvisioningResult:
    device: DeviceInfo
    reason: str
    fallback: bool = False
    log: List[str] = field(default_factory=list)


def _nvidia_smi_available() -> bool:
    return shutil.which("nvidia-smi") is not None


def query_gpus() -> List[DeviceInfo]:
    """Return list of visible NVIDIA GPUs, or empty list if none."""
    if not _nvidia_smi_available():
        return []
    try:
        out = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=index,name,memory.total",
                "--format=csv,noheader,nounits",
            ],
            stderr=subprocess.DEVNULL,
            timeout=5,
        ).decode("utf-8", errors="ignore")
    except (subprocess.SubprocessError, OSError):
        return []

    devices: List[DeviceInfo] = []
    for line in out.strip().splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 3:
            continue
        try:
            idx = int(parts[0])
            mem = int(parts[2])
        except ValueError:
            continue
        devices.append(DeviceInfo(name=parts[1], kind="gpu", memory_mb=mem, index=idx))
    return devices


def provision(min_memory_mb: int = 0, prefer: Optional[str] = None) -> ProvisioningResult:
    """Provision the best-fit device for a workload.

    Args:
        min_memory_mb: minimum required VRAM.
        prefer: substring match against device name (e.g. "A100").
    """
    log: List[str] = []
    gpus = query_gpus()
    log.append(f"detected_gpus={len(gpus)}")

    eligible = [g for g in gpus if g.memory_mb >= min_memory_mb]
    if prefer:
        preferred = [g for g in eligible if prefer.lower() in g.name.lower()]
        if preferred:
            eligible = preferred

    if eligible:
        best = max(eligible, key=lambda g: g.memory_mb)
        return ProvisioningResult(device=best, reason="gpu_match", fallback=False, log=log)

    log.append("falling_back_to_cpu")
    return ProvisioningResult(
        device=DeviceInfo(name="cpu", kind="cpu", memory_mb=0),
        reason="no_eligible_gpu",
        fallback=True,
        log=log,
    )


if __name__ == "__main__":
    result = provision()
    print(f"device={result.device.name} kind={result.device.kind} fallback={result.fallback}")
    for line in result.log:
        print(f"  {line}")
