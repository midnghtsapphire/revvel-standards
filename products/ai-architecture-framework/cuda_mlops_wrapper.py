"""JIT Compute Provisioning Wrapper.

Detects CUDA-capable GPUs via `nvidia-smi` and falls back to CPU when
unavailable. Designed to be import-safe in CI (no hard nvidia dep).
"""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import asdict, dataclass
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


def _query_nvidia_smi() -> List[ComputeDevice]:
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
    return devices


def detect_devices() -> List[ComputeDevice]:
    """Return list of available compute devices; CPU fallback always present."""
    devices: List[ComputeDevice] = []
    if _nvidia_smi_available():
        devices.extend(_query_nvidia_smi())
    if not devices:
        devices.append(
            ComputeDevice(kind="cpu", index=0, name="cpu-fallback", memory_mb=0)
        )
    return devices


def provision(prefer: str = "cuda") -> ComputeDevice:
    """Provision a single device, preferring CUDA if available."""
    devices = detect_devices()
    if prefer == "cuda":
        for d in devices:
            if d.kind == "cuda":
                return d
    return devices[0]


def main() -> None:
    result = {
        "devices": [d.to_dict() for d in detect_devices()],
        "provisioned": provision().to_dict(),
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
