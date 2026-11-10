# XGrammar

**BLUF:** Matters if the repo self-hosts vLLM (see vllm-batch-invariance). Priority **medium**, effort **medium**, loop **Deterministic**.

| Field | Value |
| --- | --- |
| Category | `constrained-decoding` |
| Kind | library + paper |
| License | Apache-2.0 |
| Priority | medium |
| Effort to adopt | medium |
| Loop (llms.txt) | Deterministic |
| Accessed | 2026-10-26 |

## What it is

Fast CFG/JSON structured-generation engine (paper: 'XGrammar: Flexible and Efficient Structured Generation Engine for Large Language Models', arXiv 2411.15100, Nov 2024). Used as a structured-output backend in serving engines such as vLLM.

## Why it fits revvel-standards

Matters if the repo self-hosts vLLM (see vllm-batch-invariance). Then you get batch-invariant and grammar-constrained output from one server.

## Determinism notes

Exact token masking. Content determinism is inherited from the serving engine.

## How to adopt

1. No direct integration needed. Select it as the guided-decoding backend when running vLLM.

## Sources

- <https://github.com/mlc-ai/xgrammar>
- <https://arxiv.org/abs/2411.15100>
- <https://xgrammar.mlc.ai/docs/>
