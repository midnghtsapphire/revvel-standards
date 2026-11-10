# Defeating Nondeterminism in LLM Inference + batch_invariant_ops

**BLUF:** This is the root-cause explanation for why 'temperature 0' is not a control. Priority **high**, effort **low (cite) / high (run own GPU server)**, loop **Deterministic**.

| Field | Value |
| --- | --- |
| Category | `reproducibility` |
| Kind | research write-up + reference code |
| License | Blog: all rights reserved (read and cite only). Code repo: MIT |
| Priority | high |
| Effort to adopt | low (cite) / high (run own GPU server) |
| Loop (llms.txt) | Deterministic |
| Accessed | 2026-10-26 |

## What it is

Horace He et al., Thinking Machines Lab (Sep 10, 2025). Shows that temperature-0 LLM nondeterminism in servers comes mainly from a lack of batch invariance (kernel reduction order changes with batch size), not just 'concurrency + floating point'. In their experiment, 1000 temperature-0 completions of one prompt on Qwen3-235B-A22B-Instruct-2507 produced 80 unique outputs. The repo provides batch-invariant matmul, RMSNorm and attention kernels plus a vLLM deterministic-inference example.

## Why it fits revvel-standards

This is the root-cause explanation for why 'temperature 0' is not a control. It supports the repo's 'a marker is a claim' rule (RVS-VERIFY-001) and the Deterministic loop in llms.txt. Use it to document why judge and lint gates must not assume identical LLM output on reruns, even locally.

## Determinism notes

Kernels are batch-invariant, so output does not depend on concurrent load. Requires control of the serving stack, which is not available through OpenRouter or hosted APIs.

## How to adopt

1. Cite this in a standards note: 'temperature=0 is not determinism; hosted lanes are treated as nondeterministic'.
2. Make gates compare structured fields or hashes of parsed output instead of raw text equality.

## Sources

- <https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/>
- <https://github.com/thinking-machines-lab/batch_invariant_ops>
