# AI Architecture Framework

Part of the `$10k/month → $10M in 3 years` pipeline.

## Contents

- `ai_architecture_system.md` — expert system prompt + hardware heuristics.
- `cuda_mlops_wrapper.py` — JIT compute lease helper (GPU when available, CPU mock otherwise).
- `market_evaluator.py` — daily scheduler that drafts 3 mock products across Stripe/Gumroad.
- `tests/test_harness.py` — dependency-free test runner.

## Run locally

```bash
python products/ai-architecture-framework/cuda_mlops_wrapper.py
python products/ai-architecture-framework/market_evaluator.py
python products/ai-architecture-framework/tests/test_harness.py
```

## Companion dashboard

See `oaudrey/hardware-dashboard.html` — a responsive Tailwind view of the
hardware selection matrix, linked from the main `oaudrey/index.html` hub.
