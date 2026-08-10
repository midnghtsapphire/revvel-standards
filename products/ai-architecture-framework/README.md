# AI Architecture Framework

Productized AI/ML compute advisory toolkit inside the `oaudrey` ecosystem.

## Modules

- `ai_architecture_system.md` — expert system prompt & reasoning contract.
- `cuda_mlops_wrapper.py` — JIT CUDA / CPU-fallback provisioning.
- `market_evaluator.py` — schedules **3 product creations** per run
  (Stripe + Gumroad mocks).
- `tests/test_harness.py` — CI-safe test suite (no GPU / no network).

## Prime Directive

This framework exists to move revenue from **$10k/month → $10M in 3 years**
by shipping small, testable AI-infra products daily.

## Run locally

```bash
python -m products.ai-architecture-framework.cuda_mlops_wrapper
python -m products.ai-architecture-framework.market_evaluator
python products/ai-architecture-framework/tests/test_harness.py
```

## Dashboard

See `oaudrey/hardware-dashboard.html` and the **Hardware Selection** tab in
`oaudrey/index.html`.
