# AI Architecture Framework

Part of the `$10k → $10M in 3 years` prime directive.

## Contents
- `ai_architecture_system.md` — expert system prompt / decision matrix.
- `cuda_mlops_wrapper.py` — JIT compute provisioning (nvidia-smi + fallback).
- `market_evaluator.py` — schedules 3 TEST VERSION products per run.
- `tests/test_harness.py` — stdlib unittest suite.
- `../../oaudrey/hardware-dashboard.html` — responsive Tailwind dashboard.

## Run tests
```bash
python -m unittest products/ai-architecture-framework/tests/test_harness.py -v
```

## Run the evaluator locally
```bash
python products/ai-architecture-framework/market_evaluator.py
```

## Provisioning check
```bash
python products/ai-architecture-framework/cuda_mlops_wrapper.py --params-b 13 --budget 1.50
```

All runs write audit logs to `.sandbox/market-evaluator/` per the Visiting
Agent Sandbox Standard.
