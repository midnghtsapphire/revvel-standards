# ML Assets Catalog

**BLUF:** This folder catalogs 25 public, license-checked ML assets: frameworks, docs, small open-weight models, eval harnesses and papers. Each one strengthens the **Deterministic loop** and **Layer 0 (local-first)** rules of revvel-standards. Start with the high-priority items below: schema-constrained local output, seeded runs, a fixed promptfoo template, and cross-family judge juries. Every entry cites its source with an access date of 2026-10-26. Nothing here is vendored code. Entries are pointers plus adoption notes.

Suggested location in the repo: `docs/ml-assets/` (matches existing `docs/<kebab-topic>/README.md` folders such as `docs/gpr-wave-model/`).

## How to use

1. Browse by category below, or load `catalog.json` (validated by `catalog.schema.json`, JSON Schema Draft 2020-12, the same draft as `schemas/agent-contract.schema.json`).
2. Each asset page has: what it is, why it fits this repo, determinism notes, adoption steps and sources.
3. Before adopting, re-check the license and URL (they can change after 2026-10-26) and file a `[WR]` per adoption, so the normal WR → research → PR pipeline applies.
4. Treat hosted LLM lanes as nondeterministic even at temperature 0 (see `reproducibility/batch-invariant-ops.md`). Gates should compare parsed and validated structure, not raw text.

## Highest-priority adoptions

1. **[llama.cpp GBNF grammars + JSON-Schema-to-grammar](constrained-decoding/llama-cpp-gbnf.md)**: For outputs that JSON Schema can't express well (WR titles like `[WR] <title>`, conventional-commit lines `feat:|fix:|docs:|chore:`, enum labels), a grammar enforces the house format at decode time.
2. **[LM Studio Structured Output (json_schema)](constrained-decoding/lmstudio-structured-output.md)**: LM Studio is already Layer 0 (docs/LOCAL_LLM_SETUP.md; scripts/local_llm.py default `http://127.0.0.1:1234/v1`).
3. **[Ollama structured outputs (`format` JSON Schema) + `seed` option](constrained-decoding/ollama-structured-outputs-seed.md)**: Ollama is the second Layer 0 lane in scripts/local_llm.py (OLLAMA_ENDPOINT, default model gemma3).
4. **[promptfoo](evals/promptfoo.md)**: The repo already ships templates/cicd/prompt-eval.yml for promptfoo, and the stack is Node.
5. **[Qwen3-4B-Instruct-2507](local-models/qwen3-4b-instruct-2507.md)**: Fits the 'load a 7B-8B instruct model' Layer 0 advice in LOCAL_LLM_SETUP.md, but is smaller, so it suits a laptop.
6. **[Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena + FastChat llm_judge](methods/mt-bench-llm-judge.md)**: It names self-enhancement bias, the failure WR-4483 R1 guards against with distinct model FAMILIES, and it ships something runnable: an Apache-2.0 judge harness plus a CC-BY-4.0 human-vote set to calibrate each judge in a 2-3 family panel (WR-4486) against people before trusting its scores.
7. **[Defeating Nondeterminism in LLM Inference + batch_invariant_ops](reproducibility/batch-invariant-ops.md)**: This is the root-cause explanation for why 'temperature 0' is not a control.
8. **[PyTorch Reproducibility notes + torch.use_deterministic_algorithms](reproducibility/pytorch-reproducibility.md)**: Any Python ML script added under scripts/ (for example the scripts/python_cuda/ validation layer or a future fine-tune or classifier) needs one canonical seeding preamble.

## Index

### Reproducibility & deterministic execution (`reproducibility/`)

| Asset | Priority | Effort | License | Loop |
| --- | --- | --- | --- | --- |
| [PyTorch Reproducibility notes + torch.use_deterministic_algorithms](reproducibility/pytorch-reproducibility.md) | high | low | BSD-3-Clause | Deterministic |
| [Defeating Nondeterminism in LLM Inference + batch_invariant_ops](reproducibility/batch-invariant-ops.md) | high | low | Blog: all rights reserved | Deterministic |
| [vLLM batch invariance mode (VLLM_BATCH_INVARIANT=1)](reproducibility/vllm-batch-invariance.md) | medium | high | Apache-2 | Deterministic |
| [safetensors](reproducibility/safetensors.md) | medium | low | Apache-2 | Deterministic |
| [JAX explicit PRNG keys (jax.random)](reproducibility/jax-prng.md) | low | low | Apache-2 | Deterministic |

### Constrained decoding / structured output (`constrained-decoding/`)

| Asset | Priority | Effort | License | Loop |
| --- | --- | --- | --- | --- |
| [LM Studio Structured Output (json_schema)](constrained-decoding/lmstudio-structured-output.md) | high | low | Docs: proprietary site, free to read | Deterministic |
| [Ollama structured outputs (`format` JSON Schema) + `seed` option](constrained-decoding/ollama-structured-outputs-seed.md) | high | low | MIT | Deterministic |
| [llama.cpp GBNF grammars + JSON-Schema-to-grammar](constrained-decoding/llama-cpp-gbnf.md) | high | medium | MIT | Deterministic |
| [Outlines (dottxt-ai)](constrained-decoding/outlines.md) | medium | medium | Apache-2 | Deterministic |
| [XGrammar](constrained-decoding/xgrammar.md) | medium | medium | Apache-2 | Deterministic |
| [llguidance (guidance-ai)](constrained-decoding/llguidance.md) | medium | medium | MIT | Deterministic |
| [OpenRouter Structured Outputs](constrained-decoding/openrouter-structured-outputs.md) | medium | low | Docs: proprietary site, free to read | Deterministic |

### Compact reference architectures (`architectures/`)

| Asset | Priority | Effort | License | Loop |
| --- | --- | --- | --- | --- |
| [nanoGPT](architectures/nanogpt.md) | low | low | MIT | Generative |
| [nanochat](architectures/nanochat.md) | low | high | MIT | Generative |

### Small open-weight local models (Layer 0) (`local-models/`)

| Asset | Priority | Effort | License | Loop |
| --- | --- | --- | --- | --- |
| [Qwen3-4B-Instruct-2507](local-models/qwen3-4b-instruct-2507.md) | high | low | Apache-2 | Generative |
| [IBM Granite-4.0-Micro](local-models/granite-4-0-micro.md) | medium | low | Apache-2 | Agentic |
| [Microsoft Phi-4-mini-instruct](local-models/phi-4-mini-instruct.md) | medium | low | MIT | Generative |
| [nomic-embed-text-v1.5](local-models/nomic-embed-text-v1-5.md) | medium | low | Apache-2 | Deterministic |

### Eval harnesses & benchmarks (`evals/`)

| Asset | Priority | Effort | License | Loop |
| --- | --- | --- | --- | --- |
| [promptfoo](evals/promptfoo.md) | high | low | MIT | Deterministic |
| [JSONSchemaBench](evals/jsonschemabench.md) | medium | medium | Dataset: MIT | Deterministic |
| [Inspect AI (UK AI Security Institute)](evals/inspect-ai.md) | medium | medium | MIT | Agentic |
| [EleutherAI lm-evaluation-harness](evals/lm-evaluation-harness.md) | low | medium | MIT | Deterministic |

### Methods (papers) (`methods/`)

| Asset | Priority | Effort | License | Loop |
| --- | --- | --- | --- | --- |
| [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena + FastChat llm_judge](methods/mt-bench-llm-judge.md) | high | medium | Paper: arXiv preprint | Agentic |
| [Self-Consistency (Wang et al.)](methods/self-consistency.md) | medium | low | arXiv preprint | Generative |
| [Detecting hallucinations in LLMs using semantic entropy (Nature 2024)](methods/semantic-entropy.md) | medium | medium | Open access article | Deterministic |

## Determinism ladder (what "deterministic" can honestly mean here)

| Level | Guarantee | How | Applies to |
| --- | --- | --- | --- |
| L0 | None | Hosted API, default sampling | OpenRouter lanes |
| L1 | Structure-exact | JSON Schema / grammar constrained decoding | LM Studio, Ollama, llama.cpp, OpenRouter (supported models) |
| L2 | Same-box repeatable | L1 + temperature 0 + fixed seed + pinned weights hash | Layer 0 lanes on one machine |
| L3 | Batch-invariant | L2 + batch-invariant kernels | Self-hosted vLLM (`VLLM_BATCH_INVARIANT=1`) |
| L4 | Bitwise training repro | Seeded RNGs + `torch.use_deterministic_algorithms(True)` + pinned versions and hardware | Any training or fine-tune script |

A run should record its level in the provenance ledger. Claiming L2+ without the recorded seed, model hash and versions is a marker with no consumer (RVS-VERIFY-001).

## Caveats

- Papers with Code (paperswithcode.com) now redirects to Hugging Face Papers (`huggingface.co/papers/trending`), so it was not used as a source.
- Google Gemma weights (the current `OLLAMA_MODEL` default `gemma3`) are gated on Hugging Face behind a license click-through, so they are excluded from this catalog per the public-only rule.
- Ratings (priority, effort) are recommendations, not measurements. Validate them with an eval before changing defaults.

## Mission Alignment

Supports the PRIME DIRECTIVE: schema-constrained local output cuts retries and OpenRouter spend, cross-family local juries replace paid judges, and reproducible runs make provenance (the product) verifiable.
