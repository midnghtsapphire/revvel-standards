# AI Architecture Framework

Part of the `oaudrey` ecosystem. Aligned with PRIME DIRECTIVE:
**$10k/month → $10M in 3 years.**

## Contents
- `ai_architecture_system.md` — expert system prompt & decision matrix.
- `cuda_mlops_wrapper.py` — JIT compute provisioning (CUDA-first, CPU fallback).
- `market_evaluator.py` — schedules 3 TEST VERSION products (Stripe/Gumroad mocks).
- `tests/test_harness.py` — unittest suite.

## Run

```bash
python products/ai-architecture-framework/cuda_mlops_wrapper.py
python products/ai-architecture-framework/market_evaluator.py
python -m unittest products/ai-architecture-framework/tests/test_harness.py
```

## Revenue Mapping
| Module               | SKU                          | Platform |
|----------------------|------------------------------|----------|
| System prompt        | polar:ai-arch-consult        | Polar.sh |
| JIT wrapper          | stripe:jit-gpu-optimizer     | Stripe   |
| Market evaluator     | gumroad:market-evaluator     | Gumroad  |
