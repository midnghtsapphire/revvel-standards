# LM Studio Structured Output (json_schema)

**BLUF:** LM Studio is already Layer 0 (docs/LOCAL_LLM_SETUP.md; scripts/local_llm.py default `http://127.0.0.1:1234/v1`). Priority **high**, effort **low**, loop **Deterministic**.

| Field | Value |
| --- | --- |
| Category | `constrained-decoding` |
| Kind | official docs |
| License | Docs: proprietary site, free to read. LM Studio app: proprietary freeware. lmstudio-python SDK: MIT |
| Priority | high |
| Effort to adopt | low |
| Loop (llms.txt) | Deterministic |
| Accessed | 2026-10-26 |

## What it is

LM Studio's OpenAI-compatible /v1/chat/completions accepts `response_format: {type: json_schema, ...}`. For GGUF models it enforces the schema with llama.cpp grammar-based sampling, and for MLX models with Outlines.

## Why it fits revvel-standards

LM Studio is already Layer 0 (docs/LOCAL_LLM_SETUP.md; scripts/local_llm.py default `http://127.0.0.1:1234/v1`). Passing a JSON Schema from schemas/ means local replies are schema-valid by construction. Today scripts/python_cuda/probabilistic_validator.py validates after the fact and retries.

## Determinism notes

Structural validity is guaranteed by the sampler. Content still depends on sampling, so set temperature 0 and a seed. The docs warn that models under 7B may struggle.

## How to adopt

1. Add an optional `schema=` argument to scripts/local_llm.py that sends `response_format` for the LM Studio and Ollama lanes.
2. Keep probabilistic_validator as the second gate (defense in depth).

## Sources

- <https://lmstudio.ai/docs/developer/openai-compat/structured-output>
