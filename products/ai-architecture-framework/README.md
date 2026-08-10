# AI Architecture Framework

Part of the $10k → $10M product pipeline. Provides:

- **System prompt** for AI architecture expert (`ai_architecture_system.md`)
- **CUDA JIT wrapper** with CPU fallback (`cuda_mlops_wrapper.py`)
- **Market evaluator** that schedules 3 product launches (`market_evaluator.py`)
- **Hardware dashboard** at `oaudrey/hardware-dashboard.html`

## Usage

```bash
python cuda_mlops_wrapper.py
python market_evaluator.py
python -m unittest discover tests -v
```

## Revenue Path

Targets Phase 1 ($10k/mo) via cheap-tier hardware selection consulting products.
