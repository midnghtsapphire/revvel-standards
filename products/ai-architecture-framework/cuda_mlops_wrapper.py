"""CUDA-aware JIT compute provisioning wrapper.

Detects available NVIDIA GPUs via `nvidia-smi`; falls back to CPU when
unavailable. Designed for cost-optimized burst workloads.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass, asdict
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
class ComputeDevice:
    kind: str  # "cuda" | "cpu"
    index: int
    name: str
    memory_mb: int

    def to_dict(self) -> dict:
        return asdict(self)
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


def detect_devices() -> List[ComputeDevice]:
    """Return the list of available compute devices.

    Falls back to a single CPU device when no NVIDIA GPU is detected.
    """
    if not _nvidia_smi_available():
        return [ComputeDevice(kind="cpu", index=0, name="cpu", memory_mb=0)]

def query_gpus() -> List[DeviceInfo]:
    """Return list of visible NVIDIA GPUs, or empty list if none."""
    if not _nvidia_smi_available():
        return []
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
                "--query-gpu=index,name,memory.total",
                "--format=csv,noheader,nounits",
            ],
            stderr=subprocess.DEVNULL,
            timeout=5,
        ).decode()
    except (subprocess.SubprocessError, OSError):
        return [ComputeDevice(kind="cpu", index=0, name="cpu", memory_mb=0)]

    devices: List[ComputeDevice] = []
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
