# OpenRouter Structured Outputs

**BLUF:** OpenRouter is the repo's only cloud lane (REVVEL_LLM_ALLOW_CLOUD=1). Priority **medium**, effort **low**, loop **Deterministic**.

| Field | Value |
| --- | --- |
| Category | `constrained-decoding` |
| Kind | official docs |
| License | Docs: proprietary site, free to read (service terms apply) |
| Priority | medium |
| Effort to adopt | low |
| Loop (llms.txt) | Deterministic |
| Accessed | 2026-10-26 |

## What it is

OpenRouter's `response_format: {type: 'json_schema', json_schema: {..., strict: true}}` support on models that offer it.

## Why it fits revvel-standards

OpenRouter is the repo's only cloud lane (REVVEL_LLM_ALLOW_CLOUD=1). Using the same json_schema payload on every lane keeps one schema per contract (schemas/agent-contract.schema.json etc.) and means fewer self-correction retries, which saves spend.

## Determinism notes

Structure is enforced only on providers that support it. Check per-model support before relying on it. Content is nondeterministic (hosted).

## How to adopt

1. Send the same `response_format` from the cloud lane, and keep the post-hoc validator for providers that ignore it.

## Sources

- <https://openrouter.ai/docs/guides/features/structured-outputs>
