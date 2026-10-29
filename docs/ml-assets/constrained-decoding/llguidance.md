# llguidance (guidance-ai)

**BLUF:** An alternative grammar engine with a richer grammar syntax than GBNF. Priority **medium**, effort **medium**, loop **Deterministic**.

| Field | Value |
| --- | --- |
| Category | `constrained-decoding` |
| Kind | Rust library |
| License | MIT |
| Priority | medium |
| Effort to adopt | medium |
| Loop (llms.txt) | Deterministic |
| Accessed | 2026-10-26 |

## What it is

Fast constrained-decoding engine (Rust) supporting JSON Schema, regex and a Lark-like CFG syntax. Integrated into several inference stacks, including llama.cpp as an optional build.

## Why it fits revvel-standards

An alternative grammar engine with a richer grammar syntax than GBNF. Useful if the repo standardizes grammars as Lark files that are portable across engines.

## Determinism notes

Exact token masking. Content determinism depends on the engine and seed.

## How to adopt

1. Evaluate alongside GBNF. Pick one grammar dialect for the repo and document it in a standard.

## Sources

- <https://github.com/guidance-ai/llguidance>
- <https://github.com/guidance-ai/llguidance/blob/main/docs/syntax.md>
