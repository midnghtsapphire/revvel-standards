# AI Architecture Framework

Expert system for hardware selection, JIT compute provisioning, and
cost-efficient AI product deployment.

## Components

- `ai_architecture_system.md` — Expert system prompt
- `cuda_mlops_wrapper.py` — Mock CUDA JIT provisioner with CPU fallback
- `market_evaluator.py` — Schedules 3 product creations (Stripe/Gumroad mocks)
- `tests/test_harness.py` — Validation suite
- `../../oaudrey/hardware-dashboard.html` — Tailwind dashboard

## Run Tests

```bash
python -m unittest products/ai-architecture-framework/tests/test_harness.py
```

## Run Evaluator

```bash
python products/ai-architecture-framework/market_evaluator.py
```

## Revenue Alignment

Supports the $10k → $10M mission via:

1. **Polar.sh** — fundable ML infrastructure tools
2. **OSINT** — cost-efficient ML pipelines for intelligence products
3. **Automated pipeline** — 3 TEST VERSION products created per run
