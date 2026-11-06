# llama.cpp GBNF grammars + JSON-Schema-to-grammar

**BLUF:** For outputs that JSON Schema can't express well (WR titles like `[WR] <title>`, conventional-commit lines `feat:|fix:|docs:|chore:`, enum labels), a grammar enforces the house format at decode time. Priority **high**, effort **medium**, loop **Deterministic**.

| Field | Value |
| --- | --- |
| Category | `constrained-decoding` |
| Kind | inference engine + grammar format |
| License | MIT |
| Priority | high |
| Effort to adopt | medium |
| Loop (llms.txt) | Deterministic |
| Accessed | 2026-10-26 |

## What it is

GBNF is llama.cpp's grammar format for constraining token sampling. It includes a converter from JSON Schema to GBNF. This is the engine underneath LM Studio's GGUF structured output.

## Why it fits revvel-standards

For outputs that JSON Schema can't express well (WR titles like `[WR] <title>`, conventional-commit lines `feat:|fix:|docs:|chore:`, enum labels), a grammar enforces the house format at decode time. wr-lint.mjs then becomes a confirmation, not a correction.

## Determinism notes

Grammar constraints are exact (invalid tokens are masked). Combine with greedy decoding and a fixed seed for repeatable content on a fixed build.

## How to adopt

1. Keep a small `grammars/` set (for example conventional-commit.gbnf, wr-title.gbnf) and use them via llama-server or LM Studio.

## Sources

- <https://github.com/ggml-org/llama.cpp/blob/master/grammars/README.md>
- <https://github.com/ggml-org/llama.cpp>
