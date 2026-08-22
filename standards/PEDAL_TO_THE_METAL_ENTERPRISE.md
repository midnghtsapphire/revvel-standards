# START_HERE: PedalToTheMetal Enterprise Architecture

> This is the Single Source of Truth (SSOT) for the PedalToTheMetal enterprise architecture (near-metal + deterministic-AI structure aimed at enterprise oAudrey).

## Core Principles
1. **No second pipeline.** We use the existing fleet controller (`.github/workflows/fleet-controller.yml`) and orchestrator. NoseyNoodle dispatches the swarm. PipelineWarden owns WR/PR automation.
2. **PedalToTheMetal owns the architecture merge.** This document maps oAudrey, OpenRouter, GOAP, and existing fleet files.
3. **No standalone findings repo.** The revvel-standards repo is the home.

## Architecture Mapping

*   **oAudrey**: Target enterprise platform for near-metal + deterministic-AI capabilities.
*   **OpenRouter**: Routing mechanism for LLM integration.
*   **GOAP (Goal-Oriented Action Planning)**: The swarm structure dispatched by NoseyNoodle.
*   **Existing Fleet Files**: Integrated seamlessly, preserving current functionality without a second controller.

## Workflow Insertion Points

*   **Consume**: conceptually consumes `research:complete` labels.
*   **Emit**: emits `wr:code` to trigger code implementation via `openrouter-coder.yml`.
*   **No new issues workflow**: We do **not** add another `issues: opened` workflow. The engine acts as a bridge.

## Implementation Details
- JSON schema for metal findings: `schemas/metal-findings.schema.json`
- Validation engine: `scripts/metal-findings-engine.js`

This structure ensures that metal findings are properly structured, validated, and seamlessly fit into the existing execution OS defined by `engines/CONTRACT.md`.
