# Outlines (dottxt-ai)

**BLUF:** The best fit if a Python script in the repo needs regex- or Pydantic-typed outputs from a locally loaded model (probabilistic_validator already optionally uses Pydantic). Priority **medium**, effort **medium (adds a Python dependency; repo prefers stdlib)**, loop **Deterministic**.

| Field | Value |
| --- | --- |
| Category | `constrained-decoding` |
| Kind | Python library |
| License | Apache-2.0 |
| Priority | medium |
| Effort to adopt | medium (adds a Python dependency; repo prefers stdlib) |
| Loop (llms.txt) | Deterministic |
| Accessed | 2026-10-26 |

## What it is

Python library for structured generation: JSON Schema / Pydantic, regex, and context-free grammars across several backends. LM Studio uses it for MLX models.

## Why it fits revvel-standards

The best fit if a Python script in the repo needs regex- or Pydantic-typed outputs from a locally loaded model (probabilistic_validator already optionally uses Pydantic).

## Determinism notes

Constraint-exact structure. Content determinism depends on the backend and seed.

## How to adopt

1. Use only in optional extras or requirements, not in stdlib-only CI paths.

## Sources

- <https://github.com/dottxt-ai/outlines>
- <https://dottxt-ai.github.io/outlines/>
