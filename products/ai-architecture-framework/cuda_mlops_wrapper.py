"""CUDA JIT compute provisioning wrapper.

Detects GPU availability via ``nvidia-smi`` and falls back to CPU when no
GPU is present. Designed to be safe on CI runners that lack CUDA.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass, asdict
from typing import List, Optional


@dataclass
class ComputeResource:
    device: str  # "cuda" or "cpu"
    name: str
    memory_mb: int
    index: int = 0

    def to_json(self) -> str:
        return json.dumps(asdict(self))


def detect_gpus() -> List[ComputeResource]:
    """Return a list of available GPUs via nvidia-smi, empty if none."""
    if shutil.which("nvidia-smi") is None:
        return []
    try:
        out = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=index,name,memory.total",
                "--format=csv,noheader,nounits",
            ],
            stderr=subprocess.STDOUT,
            timeout=5,
        ).decode("utf-8")
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError):
        return []

    gpus: List[ComputeResource] = []
    for line in out.strip().splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 3:
            continue
        try:
            idx = int(parts[0])
            mem = int(parts[2])
        except ValueError:
            continue
        gpus.append(
            ComputeResource(
                device="cuda", name=parts[1], memory_mb=mem, index=idx
            )
        )
    return gpus


def provision(min_memory_mb: int = 0) -> ComputeResource:
    """Provision the best available compute resource.

    Returns the first GPU with sufficient memory, else CPU fallback.
    """
    for gpu in detect_gpus():
        if gpu.memory_mb >= min_memory_mb:
            return gpu
    return ComputeResource(
        device="cpu", name="cpu-fallback", memory_mb=0, index=0
    )


def release(resource: ComputeResource) -> bool:
    """Release a provisioned resource (no-op for mock/JIT)."""
    _ = resource
    return True


if __name__ == "__main__":
    r = provision()
    print(r.to_json())
