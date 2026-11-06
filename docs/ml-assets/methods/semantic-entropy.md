# Detecting hallucinations in LLMs using semantic entropy (Nature 2024)

**BLUF:** Upgrades the 'Factuality / Heuristics' layer of scripts/python_cuda/probabilistic_validator.py from heuristics to a published method. Priority **medium**, effort **medium**, loop **Deterministic**.

| Field | Value |
| --- | --- |
| Category | `methods` |
| Kind | paper |
| License | Open access article (Nature). Check the article's CC license before reproducing figures |
| Priority | medium |
| Effort to adopt | medium |
| Loop (llms.txt) | Deterministic |
| Accessed | 2026-10-26 |

## What it is

Farquhar et al., Nature (2024). Estimate uncertainty over meanings (cluster sampled answers by bidirectional entailment) to detect confabulations.

## Why it fits revvel-standards

Upgrades the 'Factuality / Heuristics' layer of scripts/python_cuda/probabilistic_validator.py from heuristics to a published method. This directly supports the repo's honesty theme (for example 'models lie beautifully' chapters, the evidence-first directive).

## Determinism notes

The clustering and entropy computation is deterministic given the samples. Sampling is seeded locally.

## How to adopt

1. Prototype: sample 5 local answers, cluster with an NLI or embedding similarity threshold, flag high-entropy answers for human review.

## Sources

- <https://www.nature.com/articles/s41586-024-07421-0>
