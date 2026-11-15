# Policy-of-Thoughts research engine

CPU search for work request #18341. The linear lane fan-out in `scripts/research-engine.js` stays the default. `RESEARCH_STRATEGY=pot` selects this engine. A real LoRA module on Llama or Qwen can replace `StubPolicy` later. This tree does not download a checkpoint and does not call a model host.

## What it does

Policy of Thoughts (Jiao, Xian, Wang, Ma, Wang, Zhang, Kong, and Han, arXiv:2601.20379, also EMNLP 2026) searches candidate reasoning steps and then updates a small adapter for that one problem. The adapter is discarded when the problem ends. The base weights stay as they were.

This repo's engine follows that split on a CPU:

1. **MCTS.** Selection is UCT: value plus `c * sqrt(ln N_parent / n)`. Expansion adds one legal step. The value function is pluggable. Completed trajectories are backed up to the root. Pass `selection: "puct"` to use the paper's prior-weighted score instead. The default remains UCT.
2. **GRPO.** Advantages are `(reward - group mean) / group std`. They sum to about 0 because they are centered on the group. A group with no spread gets advantages of 0 rather than a divide-by-zero. The step adds `learning rate * advantage` to a transient adapter bias. Higher-than-mean candidates gain bias. The frozen base vector is not an argument of the update.
3. **Discard.** `closeAdapter` clears the bias table and drops the policy's pointer. The next problem opens a new adapter. `FrozenBaseWeights.verify()` re-hashes the stored bytes after the run.

The toy in `scripts/pot-research/toy-problem.js` is a trap: a one-step score prefers the left branch (terminal reward 7) and the right branch ends at reward 21. The linear walk commits to the left. MCTS returns the right branch. Those two rewards are the problem definition. They are not a research-quality measurement.

## How the orchestrator uses it

`runResearchEngine` resolves `context.strategy` and then calls `dispatchResearchStrategy`.

- `linear`, or an unset strategy, calls `runRalphLoop`. That is the existing parallel lane fan-out, including the same retry loop it had before.
- `pot` searches an ordering of `LANE_DEFINITIONS` with the stub policy and discards the adapter. Lane calls then go out together through the existing `runLane`, in the chosen order, and the same retry-and-merge loop as `runRalphLoop` runs unless `dryRun` is set. `context.iterationHistory` is filled the same way. The model caller is the one the orchestrator already had. This directory does not add a provider request. With no `potReward`, every terminal scores 0 and `potTrace.rewardConfigured` is false. The chosen order is the first seeded sample for that query, not a quality ranking and not automatically the historical lane order. Expansion and rollouts both read the seed. PUCT expansion follows the prior, including the first move, where a zero visit total would otherwise tie every action.

An unknown strategy name throws before any lane runs.

## Benchmark harness

```bash
node scripts/pot-research/benchmark.js
```

The harness also validates `products/rnd-research-fleet/eval/fixtures/research-gold-v1.jsonl`, a set of real research items with a recorded verdict and provenance (see `products/rnd-research-fleet/eval/fixtures/RESEARCH_GOLD_V1.md`). It reports the count and the shortfall against 100 and scores nothing. The harness reads `products/rnd-research-fleet/eval/fixtures/queries.json` when that file is present. On 2026-11-11 that file is a search rubric of 6 prompts with `expected_qualities`. It has no acceptance labels. The work request's dependency is 100 or more labeled research examples. The harness therefore prints `status: NOT_MEASURED` and `quality_delta: null`. It does not score linear fan-out against PoT, and it does not print a lift. Exit 0 means the report was written. It does not mean the +20-30% criterion passed.

## GPU compute budget (estimate)

**This section is an estimate for planning. It is not a measured runtime, not an invoice, and not a benchmark.** No GPU was rented for this pull request. Audrey's approval is required before any of this spend happens.

### Rates read on 2026-11-11

Spheron's public pricing page, fetched 2026-11-11 from <https://www.spheron.network/pricing/>, listed these cheapest live on-demand rates, with spot where the page showed one:

| GPU | On-demand USD/hr | Spot USD/hr | Notes from that page |
| --- | --- | --- | --- |
| H100 80 GB | 3.96 | 2.21 | Page text: an H100 on Spheron is $3.96/hr on-demand right now |
| A100 80 GB | 1.43 | 1.20 | Ampere |
| RTX 4090 24 GB | 0.59 | not shown | Ada |
| L40S 48 GB | 0.96 | not shown | Ada |

The same page says billing is per minute after a 20-minute minimum on every instance. Spot can be reclaimed. A third-party table at <https://computeprices.com/providers/spheron>, collected Nov 11, 2026, listed Spheron H100 SXM on-demand at $2.39/hr and spot at $2.21/hr. That does not match the $3.96 figure on Spheron's own page the same day. The estimate below uses the page this repo fetched ($3.96 on-demand, $2.21 spot) and treats the marketplace as a moving price, not a contract.

Vast.ai is a marketplace, not a single rate card. Third-party snapshots, not a Vast invoice:

- <https://perunitprice.com/gpu-cloud/>, updated Nov 11, 2026 12:23 UTC, listed Vast.ai H100 SXM from $2.20/hr, H100 PCIe from $2.69/hr, A100 80 GB SXM from $1.14/hr, RTX 4090 from $0.38/hr.
- <https://computeprices.com/providers/vast>, prices collected Nov 10, 2026, listed Vast.ai H100 SXM at $2.20/hr and RTX 4090 at $0.34/hr.
- <https://gpueconomy.com/providers/vast-ai/rtx-4090>, read Nov 11, 2026, listed an RTX 4090 floor of $0.39/hr.

Use those as a band. Re-check the live pages before renting. Storage, egress, and idle disk are extra and were not priced here.

### Weights the estimate is built from

Qwen3-8B config fetched 2026-11-11 from <https://huggingface.co/Qwen/Qwen3-8B/raw/main/config.json>: `hidden_size` 4096, `num_hidden_layers` 36, `num_attention_heads` 32, `num_key_value_heads` 8, `head_dim` 128, `torch_dtype` bfloat16. The config does not include a parameter total. An 8-billion-parameter bfloat16 checkpoint is `8e9 * 2` bytes = 16 GB before activations. That is a nameplate conversion, not a weighed file.

LoRA rank 8 on Q, K, V, and O, the rank the paper uses for its transient adapter. Trainable count is `rank * (d_in + d_out)` per matrix:

- Q and O: `8 * (4096 + 4096) = 65536` each.
- K and V: output dim is `8 * 128 = 1024`, so `8 * (4096 + 1024) = 40960` each.
- One layer: 212992. Thirty-six layers: 7667712 parameters.
- Adapter bytes in bfloat16: about 15 MB. Adam first and second moments in fp32: about 61 MB.

Activations depend on sequence length and gradient checkpointing. This estimate does not pin that number down. A 24 GB card is a common operating point for an 8B bfloat16 model with checkpointing, and that fit was not measured here.

Llama 4 figures are from Meta's blog on April 5, 2025, <https://ai.meta.com/blog/llama-4-multimodal-intelligence/>:

- Scout: 17 billion active parameters, 16 experts, 109 billion total. Meta says it fits on a single H100 with Int4 quantization. Bfloat16 at 2 bytes per parameter is about 218 GB, which does not fit one 80 GB H100. Int4 at half a byte is about 54.5 GB, which is the claim to test on one H100.
- Maverick: 17 billion active, 128 experts, 400 billion total. Meta says a single H100 host (an 8-GPU DGX-class machine), not one GPU. Bfloat16 is about 800 GB.
- Behemoth: 288 billion active, nearly 2 trillion total, and the blog said it was still training. It is outside this budget.

The Hugging Face Llama 4 Scout config returned 401 on 2026-11-11, so the Scout numbers above are the blog's, not a config file read from this machine.

### Worked arithmetic (assumption, not a timing)

Assumption, stated so the dollars can be recomputed: one PoT problem on Qwen3-8B takes 0.1 GPU-hour, and 100 problems run back to back on one rented instance. `100 * 0.1 = 10` GPU-hours. Nobody timed this in this repo. If the assumption is wrong, scale the dollars linearly.

| Instance | Rate used | 10 GPU-hours |
| --- | --- | --- |
| Spheron H100 on-demand | $3.96/hr | $39.60 |
| Spheron H100 spot | $2.21/hr | $22.10 |
| Vast.ai H100 SXM snapshot | $2.20/hr | $22.00 |
| Spheron RTX 4090 on-demand | $0.59/hr | $5.90 |
| Vast.ai RTX 4090 snapshot | $0.34 to $0.39/hr | $3.40 to $3.90 |

The 4090 rows apply only if the 8B checkpoint and activations fit in 24 GB. Scout Int4 is an H100-class row, and its runtime was not measured, so do not reuse the 0.1 hour assumption for Scout.

Spheron's 20-minute minimum changes the bill if each problem is a fresh instance. One hundred cold starts cost `100 * (20/60)` hours even when the compute is shorter: 33.33 hours, about $132 at $3.96/hr, or about $19.67 at $0.59/hr. One long-lived instance avoids multiplying the minimum.

## What this file does not claim

The paper reports gains against other test-time methods. Those figures are the paper's. This repository has not reproduced them. The +20-30% criterion against the linear fan-out has not been measured.
