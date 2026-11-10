# IBM Granite-4.0-Micro

**BLUF:** Its permissive data provenance fits the repo's license-and-legal-first reasoning rule (llms.txt) and the compliance/ work. Priority **medium**, effort **low**, loop **Agentic**.

| Field | Value |
| --- | --- |
| Category | `local-models` |
| Kind | open-weight model |
| License | Apache-2.0 |
| Priority | medium |
| Effort to adopt | low |
| Loop (llms.txt) | Agentic |
| Accessed | 2026-10-26 |

## What it is

3B-parameter long-context instruct model with tool-calling support, trained on permissively licensed and synthetic data (per model card). Supports 12 languages.

## Why it fits revvel-standards

Its permissive data provenance fits the repo's license-and-legal-first reasoning rule (llms.txt) and the compliance/ work. It is a small tool-caller for agentic Layer 0 tasks.

## Determinism notes

Seed + temperature 0 + pinned weights.

## How to adopt

1. Alternate Layer 0 model for tool-use tasks. Evaluate against Qwen3-4B on the same promptfoo suite.

## Sources

- <https://huggingface.co/ibm-granite/granite-4.0-micro>
- <https://ollama.com/library/granite4>
