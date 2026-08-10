"""CUDA-aware JIT compute provisioning wrapper.

Detects available NVIDIA GPUs via `nvidia-smi`; falls back to CPU when
unavailable. Designed for cost-optimized burst workloads.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass, asdict
from typing import List, Optional


@dataclass
class ComputeDevice:
    kind: str  # "cuda" | "cpu"
    index: int
    name: str
    memory_mb: int

    def to_dict(self) -> dict:
        return asdict(self)


def _nvidia_smi_available() -> bool:
    return shutil.which("nvidia-smi") is not None


def detect_devices() -> List[ComputeDevice]:
    """Return the list of available compute devices.

    Falls back to a single CPU device when no NVIDIA GPU is detected.
    """
    if not _nvidia_smi_available():
        return [ComputeDevice(kind="cpu", index=0, name="cpu", memory_mb=0)]

    try:
        out = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=index,name,memory.total",
                "--format=csv,noheader,nounits",
            ],
            stderr=subprocess.DEVNULL,
            timeout=5,
        ).decode()
    except (subprocess.SubprocessError, OSError):
        return [ComputeDevice(kind="cpu", index=0, name="cpu", memory_mb=0)]

    devices: List[ComputeDevice] = []
    for line in out.strip().splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 3:
            continue
        try:
            idx = int(parts[0])
            mem = int(parts[2])
        except ValueError:
            continue
        devices.append(
            ComputeDevice(kind="cuda", index=idx, name=parts[1], memory_mb=mem)
        )

    if not devices:
        return [ComputeDevice(kind="cpu", index=0, name="cpu", memory_mb=0)]
    return devices


def select_device(min_memory_mb: int = 0) -> ComputeDevice:
    """Pick the cheapest device that meets min_memory_mb.

    Preference: CPU when min_memory_mb == 0; otherwise smallest GPU that fits.
    """
    devices = detect_devices()
    if min_memory_mb <= 0:
        # CPU-first for zero-memory workloads (cost optimization).
        cpu = next((d for d in devices if d.kind == "cpu"), None)
        if cpu:
            return cpu
    gpus = sorted(
        [d for d in devices if d.kind == "cuda" and d.memory_mb >= min_memory_mb],
        key=lambda d: d.memory_mb,
    )
    if gpus:
        return gpus[0]
    # Fallback to CPU
    return ComputeDevice(kind="cpu", index=0, name="cpu", memory_mb=0)


def provision(min_memory_mb: int = 0) -> dict:
    """JIT provision a device and return a serializable descriptor."""
    dev = select_device(min_memory_mb=min_memory_mb)
    return {
        "provisioned": True,
        "device": dev.to_dict(),
        "min_memory_mb": min_memory_mb,
    }


if __name__ == "__main__":
    print(json.dumps(provision(), indent=2))
