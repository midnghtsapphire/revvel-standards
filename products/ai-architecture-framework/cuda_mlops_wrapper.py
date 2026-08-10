"""CUDA-aware JIT compute provisioning wrapper (mock-safe).

Uses ``nvidia-smi`` when available, otherwise falls back to CPU-only mode.
Designed to be import-safe in CI where no GPU exists.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass, asdict
from typing import List, Optional


@dataclass
class GPUInfo:
    index: int
    name: str
    memory_total_mb: int
    memory_free_mb: int

    def to_dict(self) -> dict:
        return asdict(self)


def nvidia_smi_available() -> bool:
    return shutil.which("nvidia-smi") is not None


def query_gpus(timeout: float = 5.0) -> List[GPUInfo]:
    """Return a list of GPUs on the host. Empty list means CPU-only."""
    if not nvidia_smi_available():
        return []
    try:
        out = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=index,name,memory.total,memory.free",
                "--format=csv,noheader,nounits",
            ],
            timeout=timeout,
            text=True,
        )
    except (subprocess.SubprocessError, OSError):
        return []

    gpus: List[GPUInfo] = []
    for line in out.strip().splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 4:
            continue
        try:
            gpus.append(
                GPUInfo(
                    index=int(parts[0]),
                    name=parts[1],
                    memory_total_mb=int(parts[2]),
                    memory_free_mb=int(parts[3]),
                )
            )
        except ValueError:
            continue
    return gpus


def select_device(min_free_mb: int = 4096) -> str:
    """Pick the best CUDA device or fall back to CPU."""
    gpus = query_gpus()
    candidates = [g for g in gpus if g.memory_free_mb >= min_free_mb]
    if not candidates:
        return "cpu"
    best = max(candidates, key=lambda g: g.memory_free_mb)
    return f"cuda:{best.index}"


def provision_report() -> str:
    """Return a JSON report used by the dashboard and CI logs."""
    gpus = query_gpus()
    payload = {
        "nvidia_smi": nvidia_smi_available(),
        "device": select_device(),
        "gpus": [g.to_dict() for g in gpus],
    }
    return json.dumps(payload, indent=2, sort_keys=True)


if __name__ == "__main__":  # pragma: no cover
    print(provision_report())
