# AI Architecture Framework

Monetization-focused AI architecture toolkit for the $10M/3yr mission.

## Components

- `ai_architecture_system.md` — Expert system prompt for AI architecture decisions.
- `cuda_mlops_wrapper.py` — Mock JIT compute provisioning via CUDA interfaces (nvidia-smi with CPU fallback).
- `market_evaluator.py` — Schedules 3 product creations/day (Stripe + Gumroad mocks).
- `tests/test_harness.py` — Validation suite.

## Revenue Path

Phase 1 ($10k/mo): sell hardware-selection reports + CUDA cost calculators on Gumroad.
Phase 2 ($30k/mo): SaaS dashboard subscription (Stripe).
Phase 3 ($100k/mo): enterprise MLOps consulting funnel.

## Usage

```bash
python products/ai-architecture-framework/market_evaluator.py --count 3
python products/ai-architecture-framework/cuda_mlops_wrapper.py --probe
python products/ai-architecture-framework/tests/test_harness.py
```

Dashboard: open `oaudrey/hardware-dashboard.html` or the "Hardware Selection" tab in `oaudrey/index.html`.
