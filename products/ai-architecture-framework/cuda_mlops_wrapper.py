"""CUDA / MLOps JIT compute provisioning wrapper (mock).

Provides a small, testable abstraction over `nvidia-smi` with a graceful
CPU fallback. Used by the market evaluator to decide whether a workload
should be scheduled on GPU or CPU.

Prime directive: never pay for idle silicon.
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
    utilization_pct: int


@dataclass
class ProvisionPlan:
    device: str  # "cuda:0", "cpu", etc.
    reason: str
    estimated_cost_per_hour_usd: float
    shutdown_after_seconds: int


class CudaMLOpsWrapper:
    """Thin wrapper around nvidia-smi with CPU fallback."""

    NVIDIA_SMI = "nvidia-smi"

    def __init__(self, mock: bool = False, mock_gpus: Optional[List[GPUInfo]] = None):
        self.mock = mock
        self._mock_gpus = mock_gpus or []

    def has_cuda(self) -> bool:
        if self.mock:
            return bool(self._mock_gpus)
        return shutil.which(self.NVIDIA_SMI) is not None

    def list_gpus(self) -> List[GPUInfo]:
        if self.mock:
            return list(self._mock_gpus)
        if not self.has_cuda():
            return []
        try:
            out = subprocess.check_output(
                [
                    self.NVIDIA_SMI,
                    "--query-gpu=index,name,memory.total,memory.free,utilization.gpu",
                    "--format=csv,noheader,nounits",
                ],
                text=True,
                timeout=5,
            )
        except (subprocess.SubprocessError, OSError):
            return []
        gpus: List[GPUInfo] = []
        for line in out.strip().splitlines():
            parts = [p.strip() for p in line.split(",")]
            if len(parts) != 5:
                continue
            try:
                gpus.append(
                    GPUInfo(
                        index=int(parts[0]),
                        name=parts[1],
                        memory_total_mb=int(parts[2]),
                        memory_free_mb=int(parts[3]),
                        utilization_pct=int(parts[4]),
                    )
                )
            except ValueError:
                continue
        return gpus

    def plan(self, workload: str, min_vram_mb: int = 8000) -> ProvisionPlan:
        """Return a JIT provisioning plan for the given workload."""
        gpus = self.list_gpus()
        eligible = [g for g in gpus if g.memory_free_mb >= min_vram_mb and g.utilization_pct < 80]
        if eligible:
            best = max(eligible, key=lambda g: g.memory_free_mb)
            return ProvisionPlan(
                device=f"cuda:{best.index}",
                reason=f"GPU '{best.name}' has {best.memory_free_mb}MB free",
                estimated_cost_per_hour_usd=0.60,
                shutdown_after_seconds=300,
            )
        return ProvisionPlan(
            device="cpu",
            reason="No eligible GPU; falling back to CPU",
            estimated_cost_per_hour_usd=0.05,
            shutdown_after_seconds=60,
        )

    def plan_json(self, workload: str, min_vram_mb: int = 8000) -> str:
        return json.dumps(asdict(self.plan(workload, min_vram_mb)), indent=2)


if __name__ == "__main__":  # pragma: no cover
    w = CudaMLOpsWrapper()
    print(w.plan_json("llm-inference-7b"))
