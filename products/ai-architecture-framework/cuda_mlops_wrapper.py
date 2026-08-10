#!/usr/bin/env python3
"""Mock JIT Compute provisioning wrapper via CUDA interfaces.

Uses `nvidia-smi` when available; falls back to CPU-only reporting.
Emits structured JSON events for auditability.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
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
class ProvisionEvent:
    timestamp: float
    action: str
    backend: str
    gpus: List[dict]
    note: str = ""


def probe_nvidia_smi() -> Optional[List[GPUInfo]]:
    if shutil.which("nvidia-smi") is None:
        return None
    try:
        out = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=index,name,memory.total,memory.free,utilization.gpu",
                "--format=csv,noheader,nounits",
            ],
            stderr=subprocess.DEVNULL,
            timeout=5,
        ).decode("utf-8").strip()
    except (subprocess.SubprocessError, OSError):
        return None
    gpus: List[GPUInfo] = []
    for line in out.splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 5:
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


def provision(job_id: str, min_memory_mb: int = 8000) -> ProvisionEvent:
    gpus = probe_nvidia_smi()
    if gpus is None:
        return ProvisionEvent(
            timestamp=time.time(),
            action=f"provision:{job_id}",
            backend="cpu-fallback",
            gpus=[],
            note="nvidia-smi unavailable; using CPU fallback",
        )
    eligible = [g for g in gpus if g.memory_free_mb >= min_memory_mb]
    if not eligible:
        return ProvisionEvent(
            timestamp=time.time(),
            action=f"provision:{job_id}",
            backend="cpu-fallback",
            gpus=[asdict(g) for g in gpus],
            note=f"no GPU with >= {min_memory_mb}MB free",
        )
    return ProvisionEvent(
        timestamp=time.time(),
        action=f"provision:{job_id}",
        backend="cuda",
        gpus=[asdict(eligible[0])],
        note="JIT provisioned",
    )


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="CUDA MLOps JIT wrapper (mock)")
    parser.add_argument("--probe", action="store_true", help="Probe GPUs and exit")
    parser.add_argument("--job-id", default="job-0", help="Job identifier")
    parser.add_argument("--min-memory-mb", type=int, default=8000)
    args = parser.parse_args(argv)

    if args.probe:
        gpus = probe_nvidia_smi()
        payload = {
            "timestamp": time.time(),
            "backend": "cuda" if gpus else "cpu-fallback",
            "gpus": [asdict(g) for g in (gpus or [])],
        }
        print(json.dumps(payload, indent=2))
        return 0

    event = provision(args.job_id, args.min_memory_mb)
    print(json.dumps(asdict(event), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
