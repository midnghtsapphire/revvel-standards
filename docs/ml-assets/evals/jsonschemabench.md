# JSONSchemaBench

**BLUF:** Gives evidence-first (WR-4482) data for picking a grammar engine or lane instead of guessing, and shows which JSON Schema features engines commonly drop, so the repo's schemas/ can avoid them. Priority **medium**, effort **medium**, loop **Deterministic**.

| Field | Value |
| --- | --- |
| Category | `evals` |
| Kind | benchmark dataset + paper |
| License | Dataset: MIT (HF card). GitHub repo: no LICENSE file found as of 2026-10-26 |
| Priority | medium |
| Effort to adopt | medium |
| Loop (llms.txt) | Deterministic |
| Accessed | 2026-10-26 |

## What it is

About 10k real-world JSON Schemas for evaluating constrained-decoding engines on coverage, compliance and efficiency (paper: 'JSONSchemaBench: A Rigorous Benchmark of Structured Outputs for Language Models', arXiv 2501.10868, Jan 2025).

## Why it fits revvel-standards

Gives evidence-first (WR-4482) data for picking a grammar engine or lane instead of guessing, and shows which JSON Schema features engines commonly drop, so the repo's schemas/ can avoid them.

## Determinism notes

Static dataset, so results are reproducible when engine, model and seed are pinned.

## How to adopt

1. Run a small subset against each Layer 0 lane and record the pass rate in a docs/*_EVAL_YYYY-MM-DD.md report.

## Sources

- <https://huggingface.co/datasets/epfl-dlab/JSONSchemaBench>
- <https://arxiv.org/abs/2501.10868>
- <https://github.com/guidance-ai/jsonschemabench>
