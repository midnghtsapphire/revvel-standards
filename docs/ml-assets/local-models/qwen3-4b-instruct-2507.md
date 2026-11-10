# Qwen3-4B-Instruct-2507

**BLUF:** Fits the 'load a 7B-8B instruct model' Layer 0 advice in LOCAL_LLM_SETUP.md, but is smaller, so it suits a laptop. Priority **high**, effort **low**, loop **Generative**.

| Field | Value |
| --- | --- |
| Category | `local-models` |
| Kind | open-weight model |
| License | Apache-2.0 |
| Priority | high |
| Effort to adopt | low |
| Loop (llms.txt) | Generative |
| Accessed | 2026-10-26 |

## What it is

4.0B-parameter instruct model, non-thinking mode only (no <think> blocks), 262,144-token native context, with improved instruction following and tool use (per model card).

## Why it fits revvel-standards

Fits the 'load a 7B-8B instruct model' Layer 0 advice in LOCAL_LLM_SETUP.md, but is smaller, so it suits a laptop. No think-blocks means cleaner structured output for WR rewrite and triage. Apache-2.0 allows commercial products, which matters for the revenue goals.

## Determinism notes

Run with a fixed seed, temperature 0 and a pinned file hash. The Qwen3 family appears on vLLM's batch-invariance validated list (Qwen3-1.7B/8B listed; this exact checkpoint is not).

## How to adopt

1. Candidate default LMSTUDIO_MODEL/OLLAMA_MODEL for triage and cheap_summary-style local work. Benchmark it against the current gemma3 default with promptfoo.

## Sources

- <https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507>
- <https://ollama.com/library/qwen3>
