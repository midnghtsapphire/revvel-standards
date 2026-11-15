# Audrey-pasted CUDA JIT compute provisioning wrapper (t411u, 2026-11-14 4:28 PM MT)

The paste interleaves three versions of the same module. Reconstructed at a high level:

- **Version A (ComputeDevice):** detect_devices() via nvidia-smi --query-gpu=index,name,memory.total; CPU fallback; select_device(min_memory_mb) is CPU-first for zero memory, otherwise the smallest GPU that fits; provision() returns a dict.
- **Version B (DeviceInfo/ProvisioningResult):** query_gpus(); provision(min_memory_mb, prefer) picks the largest eligible GPU, with a preferred-name match; fallback=True, reason and log.
- **Version C (GPUInfo/ProvisionResult, mock-safe):** detect_gpu() with name, memory, utilization; PRICE_TABLE cpu 0.05, t4 0.35, a10 0.75, a100 1.90, h100 3.50 USD/hr (planning only); select_hardware(workload_gb, latency_ms) tiers; provision_jit(dry_run=True by default); release() mock.

All three are hardware routers (GPU detection, CPU fallback, cheapest tier), not a deterministic search engine.
Compare against the existing revvel-standards cuda_mlops_wrapper.py.
