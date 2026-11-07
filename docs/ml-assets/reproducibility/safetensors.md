# safetensors

**BLUF:** It pairs with the repo's supply-chain and attestation rules (hash + signature before execution in llms.txt; SECURITY standard). Priority **medium**, effort **low**, loop **Deterministic**.

| Field | Value |
| --- | --- |
| Category | `reproducibility` |
| Kind | file format + library |
| License | Apache-2.0 |
| Priority | medium |
| Effort to adopt | low |
| Loop (llms.txt) | Deterministic |
| Accessed | 2026-10-26 |

## What it is

A simple, safe format for storing tensors (no arbitrary-code execution, unlike pickle) with zero-copy loading. It is the default weights format on Hugging Face.

## Why it fits revvel-standards

It pairs with the repo's supply-chain and attestation rules (hash + signature before execution in llms.txt; SECURITY standard). Pinning model files by file hash plus HF revision makes 'which weights ran' answerable.

## Determinism notes

The format is static data, so the same file gives the same hash and the same weights. It removes the pickle code-execution risk.

## How to adopt

1. Policy: only load .safetensors or GGUF weights. Record SHA-256 and HF revision of any model file in a manifest.

## Sources

- <https://huggingface.co/docs/safetensors/index>
- <https://github.com/safetensors/safetensors>
