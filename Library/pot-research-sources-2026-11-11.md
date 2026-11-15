# Sources for the Policy-of-Thoughts engine (2026-11-11)

Read on 2026-11-11 while writing `docs/research/pot-research-engine.md`. Prices move. The figures below are what those pages showed that day, not a rate lock.

## Method

- Jiao, Xian, Wang, Ma, Wang, Zhang, Kong, and Han. Policy of Thoughts: Scaling Test-Time Training for LLM Reasoning via Online Policy Evolution. arXiv:2601.20379. <https://arxiv.org/abs/2601.20379>
- ACL Anthology entry for the EMNLP 2026 version: <https://aclanthology.org/2026.emnlp-main.1908/>
- The engine uses UCT by default and can select with the paper's PUCT score. It does not copy the paper's reported accuracies into this repo as measurements.

## Model shapes

- Qwen3-8B config, fetched 2026-11-11: <https://huggingface.co/Qwen/Qwen3-8B/raw/main/config.json>
  - `hidden_size` 4096, `num_hidden_layers` 36, `num_attention_heads` 32, `num_key_value_heads` 8, `head_dim` 128, `torch_dtype` bfloat16.
- Meta. The Llama 4 herd. April 5, 2025. <https://ai.meta.com/blog/llama-4-multimodal-intelligence/>
  - Scout: 17 billion active, 16 experts, 109 billion total, single H100 with Int4 quantization.
  - Maverick: 17 billion active, 128 experts, 400 billion total, single H100 host.
  - Behemoth: 288 billion active, nearly 2 trillion total, described as still training on that date.
- The Llama 4 Scout config URL on Hugging Face returned 401 on 2026-11-11, so the Scout counts are from the Meta blog only.

## GPU rates

- Spheron pricing page, fetched 2026-11-11: <https://www.spheron.network/pricing/>
  - H100 on-demand $3.96/hr, spot $2.21/hr.
  - A100 on-demand $1.43/hr, spot $1.20/hr.
  - RTX 4090 on-demand $0.59/hr.
  - L40S on-demand $0.96/hr.
  - Per-minute billing after a 20-minute minimum. The page's own example used $3.96/hr for H100 on-demand.
- ComputePrices Spheron table, collected Nov 11, 2026, listed H100 SXM on-demand at $2.39/hr: <https://computeprices.com/providers/spheron>
  - That figure disagrees with the $3.96 on Spheron's own page the same day. The doc keeps both and uses the fetched Spheron page for the worked example.
- Vast.ai marketplace snapshots (third party, not a Vast invoice):
  - <https://perunitprice.com/gpu-cloud/> updated Nov 11, 2026 12:23 UTC. Vast.ai H100 SXM from $2.20/hr, H100 PCIe from $2.69/hr, A100 80 GB SXM from $1.14/hr, RTX 4090 from $0.38/hr.
  - <https://computeprices.com/providers/vast> collected Nov 10, 2026. H100 SXM $2.20/hr, RTX 4090 $0.34/hr.
  - <https://gpueconomy.com/providers/vast-ai/rtx-4090> read Nov 11, 2026. RTX 4090 floor $0.39/hr.

## Fixture the harness refused to score

- `products/rnd-research-fleet/eval/fixtures/queries.json` — 6 search prompts with `expected_qualities`, no acceptance labels.
