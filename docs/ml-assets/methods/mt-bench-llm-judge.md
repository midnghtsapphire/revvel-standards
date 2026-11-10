# Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena + FastChat llm_judge

**BLUF:** It names self-enhancement bias, the failure WR-4483 R1 guards against with distinct model FAMILIES, and it ships something runnable: an Apache-2.0 judge harness plus a CC-BY-4.0 human-vote set to calibrate each judge in a 2-3 family panel (WR-4486) against people before trusting its scores. Priority **high**, effort **medium**, loop **Agentic**.

| Field | Value |
| --- | --- |
| Category | `methods` |
| Kind | paper + open-source judge harness + dataset |
| License | Paper: arXiv preprint (read and cite). Code: FastChat, Apache-2.0. Human-judgment dataset: CC-BY-4.0. |
| Priority | high |
| Effort to adopt | medium |
| Loop (llms.txt) | Agentic |
| Accessed | 2026-10-26 |

## What it is

Zheng et al. (Jun 2023, NeurIPS 2023 Datasets and Benchmarks Track) study the usage and limits of LLM-as-a-judge, including position, verbosity and self-enhancement biases. They report that strong judges like GPT-4 reach over 80% agreement with human preferences, the same level as agreement between humans. The open FastChat llm_judge harness (gen_judgment.py) supports single-answer grading and pairwise modes, and releases the MT-bench questions, 3K expert votes and 30K human-preference conversations.

## Why it fits revvel-standards

It names self-enhancement bias, the failure WR-4483 R1 guards against with distinct model FAMILIES, and it ships something runnable: an Apache-2.0 judge harness plus a CC-BY-4.0 human-vote set to calibrate each judge in a 2-3 family panel (WR-4486) against people before trusting its scores.

## Determinism notes

Judge prompts, questions and the human-vote set are fixed and versioned, so agreement-with-human numbers are reproducible for a pinned judge. Judge sampling is not deterministic unless run on seeded local lanes; report dispersion across judges as WR-4483 requires.

## How to adopt

1. Cite it in WR-4483/WR-4486 as the source for self-enhancement and position bias.
2. Swap answer order in pairwise judging (the paper's position-bias mitigation) and require both orders to agree.
3. Score each candidate judge family (for example Qwen3, Granite, Phi) against mt_bench_human_judgments; keep only judges above an agreed agreement threshold.

## Sources

- <https://arxiv.org/abs/2306.05685>
- <https://github.com/lm-sys/FastChat/tree/main/fastchat/llm_judge>
- <https://huggingface.co/datasets/lmsys/mt_bench_human_judgments>
