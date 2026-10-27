# vLLM batch invariance mode (VLLM_BATCH_INVARIANT=1)

**BLUF:** If the repo ever self-hosts a GPU lane (for example a self-hosted runner with a GPU), this gives an OpenAI-compatible endpoint whose outputs are reproducible with a fixed seed. Priority **medium**, effort **high (needs Linux + supported GPU)**, loop **Deterministic**.

| Field | Value |
| --- | --- |
| Category | `reproducibility` |
| Kind | official docs + inference engine |
| License | Apache-2.0 |
| Priority | medium |
| Effort to adopt | high (needs Linux + supported GPU) |
| Loop (llms.txt) | Deterministic |
| Accessed | 2026-10-26 |

## What it is

Beta vLLM feature that makes outputs independent of batch size and request order. It uses deterministic kernels and a fixed reduction order. Supported on NVIDIA compute capability 8.0+, some AMD Instinct GPUs, and Intel XPU (Triton). The docs list validated models, including Qwen3 and Granite 3.1.

## Why it fits revvel-standards

If the repo ever self-hosts a GPU lane (for example a self-hosted runner with a GPU), this gives an OpenAI-compatible endpoint whose outputs are reproducible with a fixed seed. That fits the existing OpenAI-compatible Layer 0 client in scripts/local_llm.py.

## Determinism notes

Deterministic given the same model, seed and stack, even at temperature > 0 with a seed. Marked beta, and there are documented tensor-parallel caveats. It costs some throughput.

## How to adopt

1. Optional future Layer 0 lane: `VLLM_BATCH_INVARIANT=1 vllm serve <model>` behind the same /v1 interface.

## Sources

- <https://docs.vllm.ai/en/latest/features/batch_invariance.html>
- <https://github.com/vllm-project/vllm>
