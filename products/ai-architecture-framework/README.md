# AI Architecture Framework

Part of the oAudrey ecosystem — implements JIT compute provisioning, market evaluation, and a hardware selection dashboard.

## Components

- `ai_architecture_system.md` — Expert system prompt documenting AI architecture best practices
- `cuda_mlops_wrapper.py` — Mock CUDA-based JIT compute provisioning wrapper
- `market_evaluator.py` — Scheduled market evaluator that creates 3 product listings on Stripe/Gumroad (mock)
- `tests/test_harness.py` — Validation test suite

## Revenue Alignment

Supports the $10k→$10M roadmap by:

1. Reducing training/inference costs via JIT compute provisioning
2. Automating product creation across Stripe and Gumroad
3. Providing a hardware selection dashboard for enterprise buyers

## Usage

```bash
python products/ai-architecture-framework/cuda_mlops_wrapper.py
python products/ai-architecture-framework/market_evaluator.py
python -m unittest products/ai-architecture-framework/tests/test_harness.py
```
