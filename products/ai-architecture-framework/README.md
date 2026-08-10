# AI Architecture Framework

JIT compute + market evaluator + hardware dashboard.
Part of the $10k → $10M revenue trajectory.

## Contents
- `ai_architecture_system.md` — expert system prompt / architecture doc
- `cuda_mlops_wrapper.py` — nvidia-smi JIT wrapper with CPU fallback
- `market_evaluator.py` — scores topics, emits 3 TEST products/day (Stripe + Gumroad mocks)
- `tests/test_harness.py` — unit tests (stdlib only)

## Run locally

```bash
python products/ai-architecture-framework/cuda_mlops_wrapper.py
python products/ai-architecture-framework/market_evaluator.py
python -m unittest products/ai-architecture-framework/tests/test_harness.py
```

## Dashboard

See `oaudrey/hardware-dashboard.html` (linked from the oAudrey hub as **Hardware Selection**).

## Automation

`.github/workflows/automate-gumroad-artifacts.yml` runs the evaluator on cron and uploads the JSON artifact.
