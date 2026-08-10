"""Mock CUDA JIT compute provisioning wrapper.

Provides a thin interface over `nvidia-smi` when available, with a CPU
fallback so tests and non-GPU environments work identically.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass, asdict
from typing import List, Optional


@dataclass
class ComputeDevice:
    index: int
    name: str
    memory_total_mb: int
    memory_free_mb: int
    backend: str  # "cuda" | "cpu"


def _nvidia_smi_available() -> bool:
    return shutil.which("nvidia-smi") is not None


def list_devices() -> List[ComputeDevice]:
    """Return available compute devices.

    Uses `nvidia-smi` when present; otherwise reports a single CPU device.
    """
    if not _nvidia_smi_available():
        return [ComputeDevice(index=0, name="cpu", memory_total_mb=0,
                              memory_free_mb=0, backend="cpu")]

    try:
        out = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=index,name,memory.total,memory.free",
                "--format=csv,noheader,nounits",
            ],
            text=True,
            timeout=5,
        )
    except (subprocess.SubprocessError, OSError):
        return [ComputeDevice(index=0, name="cpu", memory_total_mb=0,
                              memory_free_mb=0, backend="cpu")]

    devices: List[ComputeDevice] = []
    for line in out.strip().splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) != 4:
            continue
        try:
            devices.append(ComputeDevice(
                index=int(parts[0]),
                name=parts[1],
                memory_total_mb=int(parts[2]),
                memory_free_mb=int(parts[3]),
                backend="cuda",
            ))
        except ValueError:
            continue
    return devices or [ComputeDevice(index=0, name="cpu", memory_total_mb=0,
                                     memory_free_mb=0, backend="cpu")]


def provision(min_memory_mb: int = 0) -> Optional[ComputeDevice]:
    """Return the first device with at least ``min_memory_mb`` free memory."""
    for dev in list_devices():
        if dev.backend == "cpu" and min_memory_mb == 0:
            return dev
        if dev.memory_free_mb >= min_memory_mb:
            return dev
    return None


def report() -> str:
    return json.dumps([asdict(d) for d in list_devices()], indent=2)


if __name__ == "__main__":
    print(report())
