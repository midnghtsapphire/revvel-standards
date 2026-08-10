"""CUDA JIT Compute Provisioning Wrapper.

Provides a minimal, testable interface to detect GPU availability via
nvidia-smi and fall back to CPU. Designed for cost-efficient JIT
provisioning in the AI architecture framework.
"""
from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class ComputeResource:
    device: str  # "cuda" or "cpu"
    name: str
    memory_mb: int
    provisioned: bool = False
    metadata: dict = field(default_factory=dict)


class CudaMLOpsWrapper:
    """JIT compute provisioner with CUDA detection and CPU fallback."""

    def __init__(self, prefer_gpu: bool = True):
        self.prefer_gpu = prefer_gpu
        self._resources: List[ComputeResource] = []

    def detect_gpus(self) -> List[ComputeResource]:
        """Detect available NVIDIA GPUs via nvidia-smi."""
        gpus: List[ComputeResource] = []
        if not shutil.which("nvidia-smi"):
            return gpus
        try:
            out = subprocess.check_output(
                [
                    "nvidia-smi",
                    "--query-gpu=name,memory.total",
                    "--format=csv,noheader,nounits",
                ],
                timeout=5,
                stderr=subprocess.DEVNULL,
            ).decode("utf-8")
            for line in out.strip().splitlines():
                parts = [p.strip() for p in line.split(",")]
                if len(parts) >= 2:
                    try:
                        mem = int(parts[1])
                    except ValueError:
                        mem = 0
                    gpus.append(
                        ComputeResource(
                            device="cuda", name=parts[0], memory_mb=mem
                        )
                    )
        except (subprocess.SubprocessError, OSError):
            return []
        return gpus

    def provision(self, min_memory_mb: int = 0) -> ComputeResource:
        """Provision the best available compute resource."""
        if self.prefer_gpu:
            for gpu in self.detect_gpus():
                if gpu.memory_mb >= min_memory_mb:
                    gpu.provisioned = True
                    self._resources.append(gpu)
                    return gpu
        cpu = ComputeResource(
            device="cpu",
            name="cpu-fallback",
            memory_mb=0,
            provisioned=True,
            metadata={"reason": "no_gpu_available"},
        )
        self._resources.append(cpu)
        return cpu

    def release(self, resource: ComputeResource) -> bool:
        if resource in self._resources:
            resource.provisioned = False
            self._resources.remove(resource)
            return True
        return False

    def active_resources(self) -> List[ComputeResource]:
        return [r for r in self._resources if r.provisioned]

    def estimate_cost_per_hour(
        self, resource: Optional[ComputeResource] = None
    ) -> float:
        """Rough cost estimate in USD/hr (spot prices, approximate)."""
        if resource is None or resource.device == "cpu":
            return 0.02
        name = resource.name.lower()
        if "h100" in name:
            return 2.50
        if "a100" in name:
            return 1.10
        if "a10" in name:
            return 0.60
        if "t4" in name:
            return 0.20
        return 0.35


if __name__ == "__main__":
    w = CudaMLOpsWrapper()
    r = w.provision()
    print(f"Provisioned: {r.device} / {r.name} @ ${w.estimate_cost_per_hour(r):.2f}/hr")
