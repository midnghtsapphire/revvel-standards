# Model Configuration

## Active Model

**Model:** `google/gemini-2.5-pro`

## Previous Model

- `anthropic/claude-3.5-sonnet` (deprecated)

## Rationale

Switched to `google/gemini-2.5-pro` for:
- Improved reasoning capabilities
- Larger context window
- Better cost-efficiency aligned with Phase 1 ($10k/month) economics

## Usage

All agent invocations, OSINT pipelines, and Polar.sh automation scripts should reference the `google/gemini-2.5-pro` model identifier.

## Mission Alignment

This change supports the PRIME DIRECTIVE: $10k/month → $10M in 3 years by reducing per-call inference cost and improving throughput on the automated product pipeline.
