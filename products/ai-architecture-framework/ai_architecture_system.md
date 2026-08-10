# AI Architecture Framework - Expert System Prompt

## Mission
Enable rapid, cost-efficient deployment of AI/ML workloads with just-in-time (JIT) GPU provisioning, automated market evaluation, and productization pipelines targeting the $10k → $10M revenue trajectory.

## Core Principles

1. **JIT Compute** - Never pay for idle GPUs. Provision on-demand via CUDA-aware wrappers.
2. **Cost Awareness** - Every workload has a $/hour budget. Fail loudly when exceeded.
3. **Market-First** - Products are selected by evaluator scoring signal × margin × velocity.
4. **Free-Tier Fallbacks** - OpenRouter → OpenHands → manual. Default to $0 cost paths.
5. **Auditability** - All agent actions log to `.sandbox/` per visiting-agent standard.

## Architecture Layers

### L1 — Hardware Selection Dashboard
- File: `oaudrey/hardware-dashboard.html`
- Responsive Tailwind UI comparing GPU/CPU SKUs by $/TFLOP and availability.
- Data source: `cuda_mlops_wrapper.py` (nvidia-smi when present; CPU fallback).

### L2 — JIT Compute Wrapper
- File: `cuda_mlops_wrapper.py`
- Detects local NVIDIA hardware; degrades gracefully to CPU mock.
- Returns capability manifest consumed by the dashboard and evaluator.

### L3 — Market Evaluator
- File: `market_evaluator.py`
- Ranks candidate product topics.
- Emits 3 draft products/day into Stripe & Gumroad (mock endpoints).
- Products ship as "TEST VERSION" (free) until validated.

### L4 — Automation
- Workflow: `.github/workflows/automate-gumroad-artifacts.yml`
- Runs `market_evaluator.py` on cron.
- Pinned action SHAs, `permissions: contents: read`, zizmor-clean.

## Product Selection Rubric

| Signal | Weight | Notes |
|--------|--------|-------|
| Search velocity | 0.30 | Trending keywords last 7d |
| Margin | 0.30 | Digital > SaaS > services |
| Time-to-ship | 0.20 | < 24h preferred |
| Repeat purchase | 0.20 | Subscription-friendly |

## Revenue Milestones
- **Phase 1 ($10k/mo):** 3 daily test products; keep the top 10% by conversion.
- **Phase 2 ($30k/mo):** Bundle winners into Polar.sh recurring tiers.
- **Phase 3 ($100k/mo):** Add OSINT toolkit upsell and enterprise support seats.
- **Phase 4 ($10M total):** License framework to agencies; retire manual ops.

## Guardrails
- No paid API without explicit budget flag.
- No unpinned GitHub Actions.
- No secrets in logs or `.sandbox/` artifacts.
- Every scheduled workflow declares minimal `permissions`.
