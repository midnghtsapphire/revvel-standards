# nanoGPT

**BLUF:** A compact, auditable reference for any 'exact architecture' claim in docs or books (for example the CH12/CH13 model chapters). Priority **low**, effort **low (read) / medium (train)**, loop **Generative**.

| Field | Value |
| --- | --- |
| Category | `architectures` |
| Kind | reference implementation |
| License | MIT |
| Priority | low |
| Effort to adopt | low (read) / medium (train) |
| Loop (llms.txt) | Generative |
| Accessed | 2026-10-26 |

## What it is

Minimal, readable GPT training and fine-tuning code (a rewrite of minGPT). A widely used reference for the GPT decoder architecture. The README (Nov 2025 update) says it is 'now very old and deprecated' and points to nanochat.

## Why it fits revvel-standards

A compact, auditable reference for any 'exact architecture' claim in docs or books (for example the CH12/CH13 model chapters). Also a teaching asset for ELI5 handoff docs.

## Determinism notes

Seedable. Full GPU determinism still needs the PyTorch reproducibility settings (see pytorch-reproducibility).

## How to adopt

1. Link it as a readable architecture reference only. Prefer nanochat for anything current. Do not vendor it.

## Sources

- <https://github.com/karpathy/nanoGPT>
