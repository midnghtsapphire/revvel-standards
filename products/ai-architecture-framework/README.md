# AI Architecture Framework

Aligned with the PRIME DIRECTIVE: $10k/month → $10M in 3 years.

## Contents
- `ai_architecture_system.md` — Expert system prompt / playbook.
- `cuda_mlops_wrapper.py` — JIT compute provisioning (nvidia-smi based, CPU fallback).
- `market_evaluator.py` — Daily scheduler picking 3 product candidates and creating mock Stripe/Gumroad listings.
- `tests/test_harness.py` — Unit tests for wrapper + evaluator.

## Run locally
```bash
python products/ai-architecture-framework/cuda_mlops_wrapper.py
python products/ai-architecture-framework/market_evaluator.py
python -m unittest discover -s products/ai-architecture-framework/tests -v
```

## Dashboard
Open `oaudrey/hardware-dashboard.html` in a browser (Tailwind via CDN).

## Automation
See `.github/workflows/ai-architecture-market-evaluator.yml` for the daily cron.
