"""JIT Compute provisioning wrapper.

Detects NVIDIA GPUs via ``nvidia-smi`` and returns a capability manifest.
Falls back to a CPU mock so the module remains importable on any host.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import asdict, dataclass, field
from typing import List


@dataclass
class Device:
    name: str
    kind: str  # "gpu" | "cpu"
    memory_mb: int = 0
    utilization: float = 0.0
    cost_per_hour_usd: float = 0.0


@dataclass
class ComputeManifest:
    provider: str
    devices: List[Device] = field(default_factory=list)
    total_cost_per_hour_usd: float = 0.0

    def to_json(self) -> str:
        return json.dumps(
            {
                "provider": self.provider,
                "devices": [asdict(d) for d in self.devices],
                "total_cost_per_hour_usd": self.total_cost_per_hour_usd,
            },
            indent=2,
        )


def _query_nvidia_smi() -> List[Device]:
    if shutil.which("nvidia-smi") is None:
        return []
    try:
        out = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total,utilization.gpu",
                "--format=csv,noheader,nounits",
            ],
            text=True,
            timeout=5,
        )
    except (subprocess.SubprocessError, OSError):
        return []

    devices: List[Device] = []
    for line in out.strip().splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 3:
            continue
        name, mem, util = parts[0], parts[1], parts[2]
        try:
            devices.append(
                Device(
                    name=name,
                    kind="gpu",
                    memory_mb=int(float(mem)),
                    utilization=float(util) / 100.0,
                    cost_per_hour_usd=0.35,
                )
            )
        except ValueError:
            continue
    return devices


def _cpu_fallback() -> List[Device]:
    return [Device(name="cpu-mock", kind="cpu", memory_mb=0, cost_per_hour_usd=0.0)]


def provision(budget_per_hour_usd: float = 1.0) -> ComputeManifest:
    """Return a compute manifest under the given hourly budget."""
    devices = _query_nvidia_smi() or _cpu_fallback()
    affordable: List[Device] = []
    running = 0.0
    for d in devices:
        if running + d.cost_per_hour_usd <= budget_per_hour_usd:
            affordable.append(d)
            running += d.cost_per_hour_usd
    provider = "nvidia-local" if any(d.kind == "gpu" for d in affordable) else "cpu-fallback"
    return ComputeManifest(
        provider=provider,
        devices=affordable,
        total_cost_per_hour_usd=round(running, 4),
    )


if __name__ == "__main__":
    print(provision().to_json())
