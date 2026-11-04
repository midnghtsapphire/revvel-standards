# nomic-embed-text-v1.5

**BLUF:** LOCAL_LLM_SETUP.md already names `text-embedding-nomic-embed-text-v1.5` as the embedding model loaded in LM Studio. Priority **medium**, effort **low**, loop **Deterministic**.

| Field | Value |
| --- | --- |
| Category | `local-models` |
| Kind | open-weight embedding model |
| License | Apache-2.0 |
| Priority | medium |
| Effort to adopt | low |
| Loop (llms.txt) | Deterministic |
| Accessed | 2026-10-26 |

## What it is

Text embedding model with Matryoshka (resizable) dimensions. It requires task prefixes such as `search_query:` and `search_document:` (per model card).

## Why it fits revvel-standards

LOCAL_LLM_SETUP.md already names `text-embedding-nomic-embed-text-v1.5` as the embedding model loaded in LM Studio. This documents correct use (prefixes!) for dedupe of WRs/issues, retrieval (docs/hfmr/) and duplicate-risk detection in the formal verifier.

## Determinism notes

Embedding a fixed input with a fixed model and runtime is effectively deterministic (no sampling). Small float differences across hardware are possible, so compare with a tolerance, not exact equality.

## How to adopt

1. Document the prefix convention. Store embedding model ID + revision alongside cached vectors.

## Sources

- <https://huggingface.co/nomic-ai/nomic-embed-text-v1.5>
