# EleutherAI lm-evaluation-harness

**BLUF:** For picking Layer 0 models on public benchmarks with a pinned, citable harness instead of vendor leaderboards (evidence-first). Priority **low**, effort **medium**, loop **Deterministic**.

| Field | Value |
| --- | --- |
| Category | `evals` |
| Kind | Python eval framework |
| License | MIT |
| Priority | low |
| Effort to adopt | medium |
| Loop (llms.txt) | Deterministic |
| Accessed | 2026-10-26 |

## What it is

Standard few-shot benchmark harness for language models, supporting HF, vLLM and OpenAI-compatible local endpoints.

## Why it fits revvel-standards

For picking Layer 0 models on public benchmarks with a pinned, citable harness instead of vendor leaderboards (evidence-first).

## Determinism notes

Supports fixed seeds and greedy generation. Results are reproducible when harness version, model revision and backend are pinned.

## How to adopt

1. Optional: run on candidate local models before changing LMSTUDIO_MODEL defaults.

## Sources

- <https://github.com/EleutherAI/lm-evaluation-harness>
