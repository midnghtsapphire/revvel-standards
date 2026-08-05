# WR Agent Hierarchy

This hierarchy follows locked decisions from WR PR #1.

## Layer 0 — Local LLMs / LM Studio
- Target share: 60–70% of work.
- Free, private, and suitable for overnight batches.

## Layer 1 — OpenRouter (prepaid)
- Handles cron execution and frontier reasoning.
- Model-agnostic routing for routine automation.

## Layer 2 — Direct APIs
- Specialized services as needed (Whisper, DALL-E, Claude long-context).

## Layer 3 — GitHub Copilot
- Escalation-only layer.
- Human-invoked, rare usage.

## Router logic
1. Default to Layer 0.
2. Escalate to Layer 1 when complexity score exceeds threshold.
3. Use Layer 2 for specialized I/O.
4. Use Layer 3 only when Audrey explicitly requests it or Layer 1 fails twice.
