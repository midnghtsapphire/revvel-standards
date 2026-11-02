# nanochat

**BLUF:** A reference for the full lifecycle if the repo ever trains a house micro-model (for example a WR-triage classifier). Priority **low**, effort **high**, loop **Generative**.

| Field | Value |
| --- | --- |
| Category | `architectures` |
| Kind | reference implementation (full stack) |
| License | MIT |
| Priority | low |
| Effort to adopt | high |
| Loop (llms.txt) | Generative |
| Accessed | 2026-10-26 |

## What it is

End-to-end small-chat-model pipeline (tokenizer, pretraining, mid-training, SFT, RL, eval, inference and web UI) in one minimal codebase. The README tagline is 'The best ChatGPT that $100 can buy'.

## Why it fits revvel-standards

A reference for the full lifecycle if the repo ever trains a house micro-model (for example a WR-triage classifier). It is useful as a cost-bounded blueprint consistent with the spend-gate rules.

## Determinism notes

Seedable scripts. GPU determinism is not guaranteed by default.

## How to adopt

1. Reference only, unless a training WR is approved.

## Sources

- <https://github.com/karpathy/nanochat>
