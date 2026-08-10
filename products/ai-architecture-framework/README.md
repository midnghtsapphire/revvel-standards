# AI Architecture Framework

Monetization-first AI compute planning inside the oAudrey ecosystem.

## Contents
- `ai_architecture_system.md` — Expert system prompt & decision framework.
- `cuda_mlops_wrapper.py` — JIT compute detection (nvidia-smi + CPU fallback).
- `market_evaluator.py` — Scheduler that picks 3 product ideas per run and creates mock Stripe/Gumroad TEST VERSION SKUs.
- `tests/test_harness.py` — Unit tests (`python -m unittest discover -s tests`).

## Quick start
```bash
cd products/ai-architecture-framework
python market_evaluator.py
python -m unittest discover -s tests -v
```

## Revenue attribution
Every compute unit returned by `provision()` carries `est_cost_per_hour_usd`. Product ideas in `market_evaluator.CANDIDATES` carry `price_usd`. Divide to get target sell-through.

## Dashboard
See `oaudrey/hardware-dashboard.html` for the live Tailwind view (linked from the main hub as the **Hardware Selection** tab).
