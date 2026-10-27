# Self-Consistency (Wang et al.)

**BLUF:** A named, validated method (WR-4482 tier 2) for turning nondeterministic samples into a stable answer plus an agreement rate. Priority **medium**, effort **low**, loop **Generative**.

| Field | Value |
| --- | --- |
| Category | `methods` |
| Kind | paper |
| License | arXiv preprint (read and cite) |
| Priority | medium |
| Effort to adopt | low |
| Loop (llms.txt) | Generative |
| Accessed | 2026-10-26 |

## What it is

Sample several reasoning paths and take the majority answer. This improves chain-of-thought accuracy ('Self-Consistency Improves Chain of Thought Reasoning in Language Models', Mar 2022).

## Why it fits revvel-standards

A named, validated method (WR-4482 tier 2) for turning nondeterministic samples into a stable answer plus an agreement rate. That rate is a confidence signal that could feed probabilistic_validator's ConfidenceScore.

## Determinism notes

With seeded samples the vote is reproducible. Agreement rate is an honest uncertainty measure.

## How to adopt

1. For enum or short-answer tasks: N seeded local samples, majority vote, log the agreement rate.

## Sources

- <https://arxiv.org/abs/2203.11171>
