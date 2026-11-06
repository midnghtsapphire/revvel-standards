# Microsoft Phi-4-mini-instruct

**BLUF:** A third model family for the WR-4483 / WR-4486 requirement that judges come from distinct model families. Priority **medium**, effort **low**, loop **Generative**.

| Field | Value |
| --- | --- |
| Category | `local-models` |
| Kind | open-weight model |
| License | MIT |
| Priority | medium |
| Effort to adopt | low |
| Loop (llms.txt) | Generative |
| Accessed | 2026-10-26 |

## What it is

3.8B-parameter model with 128K context, focused on reasoning-dense synthetic data, with a function-calling format (per model card).

## Why it fits revvel-standards

A third model family for the WR-4483 / WR-4486 requirement that judges come from distinct model families. The family is not vendor-correlated with Qwen or Granite, and it runs locally for free.

## Determinism notes

Seed + temperature 0 + pinned weights.

## How to adopt

1. Use as one local judge in a cross-family jury (see mt-bench-llm-judge).

## Sources

- <https://huggingface.co/microsoft/Phi-4-mini-instruct>
