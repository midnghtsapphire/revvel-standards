# AI Architecture Framework

Additive module supporting the $10k → $10M roadmap.

## Contents
- `ai_architecture_system.md` — expert system prompt
- `cuda_mlops_wrapper.py` — JIT compute provisioning (nvidia-smi + CPU fallback)
- `market_evaluator.py` — picks 3 topics, schedules mock Stripe/Gumroad products
- `tests/test_harness.py` — unit tests (all mocked)

## Usage

```bash
MOCK_MODE=1 python products/ai-architecture-framework/market_evaluator.py
MOCK_MODE=1 python products/ai-architecture-framework/cuda_mlops_wrapper.py
python -m unittest products/ai-architecture-framework/tests/test_harness.py
```

## Safety
- All external service calls (Stripe, Gumroad, nvidia-smi) are gated by `MOCK_MODE=1` by default.
- No secrets are read at import time.
- CI runs in mock mode only.

## Dashboard
See `oaudrey/hardware-dashboard.html` — linked from the main hub as **Hardware Selection**.
