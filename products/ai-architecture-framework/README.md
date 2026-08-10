# AI Architecture Framework

Supports the PRIME DIRECTIVE: **$10k/month → $10M in 3 years**.

## Contents
- `ai_architecture_system.md` — expert system prompt & decision rubric.
- `cuda_mlops_wrapper.py` — JIT compute provisioning (CPU-safe by default).
- `market_evaluator.py` — daily 3-product scheduler (Gumroad + Stripe mocks).
- `tests/test_harness.py` — smoke tests.

## Run locally
```bash
python products/ai-architecture-framework/cuda_mlops_wrapper.py
python products/ai-architecture-framework/market_evaluator.py
python -m unittest products/ai-architecture-framework/tests/test_harness.py
```

## Safety
- No paid GPU is provisioned unless `ALLOW_PAID=1`.
- All product creations are mocked; wire real Stripe/Gumroad keys only after review.
