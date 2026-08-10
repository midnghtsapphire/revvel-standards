"""CUDA JIT compute provisioning wrapper (mock-first, real-if-available).

This module exposes a minimal interface for AI workloads to request GPU
resources without hard-coding a provider. When `nvidia-smi` is present we
return real device info; otherwise we degrade to a CPU-only mock so tests
and CI runs remain free.

Prime directive: keep infra spend near-zero until revenue justifies it.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class ComputeLease:
    device: str  # "cpu" | "cuda:N"
    name: str
    memory_mb: int
    provider: str
    est_cost_per_hour_usd: float
    mock: bool

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2)


def _nvidia_smi_query() -> Optional[list[dict]]:
    if shutil.which("nvidia-smi") is None:
        return None
    try:
        out = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=index,name,memory.total",
                "--format=csv,noheader,nounits",
            ],
            text=True,
            timeout=5,
        )
    except (subprocess.SubprocessError, OSError):
        return None
    gpus = []
    for line in out.strip().splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) != 3:
            continue
        idx, name, mem = parts
        try:
            gpus.append({"index": int(idx), "name": name, "memory_mb": int(mem)})
        except ValueError:
            continue
    return gpus or None


def acquire_lease(
    min_memory_mb: int = 0,
    max_cost_per_hour_usd: float = 2.0,
    provider_hint: str = "local",
) -> ComputeLease:
    """Return a compute lease. Mocks a CPU lease when no GPU is available."""
    gpus = _nvidia_smi_query()
    if gpus:
        for g in gpus:
            if g["memory_mb"] >= min_memory_mb:
                return ComputeLease(
                    device=f"cuda:{g['index']}",
                    name=g["name"],
                    memory_mb=g["memory_mb"],
                    provider=provider_hint,
                    est_cost_per_hour_usd=min(0.35, max_cost_per_hour_usd),
                    mock=False,
                )
    return ComputeLease(
        device="cpu",
        name="mock-cpu",
        memory_mb=2048,
        provider="local",
        est_cost_per_hour_usd=0.0,
        mock=True,
    )


def release_lease(lease: ComputeLease) -> bool:
    """Release a lease. No-op for mocks; kept for interface parity."""
    _ = lease  # future: call provider API
    return True


if __name__ == "__main__":  # pragma: no cover
    lease = acquire_lease(min_memory_mb=0)
    print(lease.to_json())
    release_lease(lease)
