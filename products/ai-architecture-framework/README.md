# AI Architecture Framework

Module of the `oaudrey` ecosystem. Ladders directly to the prime directive:
**$10k/month → $10M in 3 years**.

## Contents

- `ai_architecture_system.md` — Chief AI Architect system prompt.
- `cuda_mlops_wrapper.py` — JIT compute provisioning via `nvidia-smi` (with CPU fallback).
- `market_evaluator.py` — Schedules 3 TEST VERSION products per run (Stripe + Gumroad mocks).
- `tests/test_harness.py` — Unit tests.

## Run

```bash
python products/ai-architecture-framework/market_evaluator.py
python -m unittest products/ai-architecture-framework/tests/test_harness.py
```

## Dashboard

See `oaudrey/hardware-dashboard.html` (linked from the main hub as the **Hardware Selection** tab).
