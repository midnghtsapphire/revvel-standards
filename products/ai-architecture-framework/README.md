# AI Architecture Framework

Additive module inside the `oaudrey` ecosystem providing:

- Expert system prompt (`ai_architecture_system.md`)
- Mock CUDA JIT provisioning wrapper (`cuda_mlops_wrapper.py`)
- Market evaluator scheduling 3 product creations (`market_evaluator.py`)
- Test harness (`tests/test_harness.py`)

## Quickstart

```bash
python products/ai-architecture-framework/cuda_mlops_wrapper.py
python products/ai-architecture-framework/market_evaluator.py
python -m unittest products/ai-architecture-framework/tests/test_harness.py
```

## Revenue Mapping

Each scheduled market run creates 3 `TEST VERSION` products across Stripe and
Gumroad mocks. Real credentials replace mocks in production to progress from
$10k/month → $10M in 3 years.
