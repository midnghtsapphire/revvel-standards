# Ollama structured outputs (`format` JSON Schema) + `seed` option

**BLUF:** Ollama is the second Layer 0 lane in scripts/local_llm.py (OLLAMA_ENDPOINT, default model gemma3). Priority **high**, effort **low**, loop **Deterministic**.

| Field | Value |
| --- | --- |
| Category | `constrained-decoding` |
| Kind | official docs + runtime |
| License | MIT |
| Priority | high |
| Effort to adopt | low |
| Loop (llms.txt) | Deterministic |
| Accessed | 2026-10-26 |

## What it is

Ollama accepts a JSON Schema in the `format` field to constrain output, and an `options.seed` integer. Its Modelfile docs say a fixed seed makes the model generate the same text for the same prompt.

## Why it fits revvel-standards

Ollama is the second Layer 0 lane in scripts/local_llm.py (OLLAMA_ENDPOINT, default model gemma3). Same win as LM Studio: schema-valid local output, plus a seed to record in the provenance ledger.

## Determinism notes

Seed + temperature 0 + the same model digest and hardware gives repeatable output in practice. Not guaranteed across Ollama versions or hardware (see batch-invariant-ops).

## How to adopt

1. Send `format=<schema>` and `options:{seed, temperature:0}` from local_llm.py. Log the model digest from /api/tags with each call.

## Sources

- <https://docs.ollama.com/capabilities/structured-outputs>
- <https://ollama.com/blog/structured-outputs>
- <https://github.com/ollama/ollama>
