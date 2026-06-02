# WR: [WR] Fix non-existent model name in provenance example to prevent inaccurate records

**Issue:** #14031  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-06-02
**WR Status:** ✅ Complete

## Issue Context
### Summary
The agent monitoring standard document includes a canonical provenance example that hardcodes `anthropic/claude-opus-4.7` as the model name. This version does not exist and contradicts the actual model configuration defined in the repository. Because agents are expected to copy-paste this example directly into PR bodies, using a fabricated model slug will result in systematically inaccurate provenance records across all agent-generated pull requests.

### Details
The file `docs/AGENT_MONITORING_STANDARD.md` at line 82 contains a provenance block intended as a reference template for agents. It specifies `anthropic/claude-opus-4.7` as the model identifier, which is a speculative or hallucinated version string. The repository's `standards/AGENT_STACK_SETUP.md` defines the actual primary model as `claude-3.7-sonnet` with `deepseek-v3.2` as the fallback. Since this example is canonical and copy-paste-oriented, the incorrect model name will propagate into real provenance records, undermining traceability and auditability of agent-driven changes. The discrepancy also introduces confusion about which models are actually sanctioned for use.

### Location
- File: `docs/AGENT_MONITORING_STANDARD.md`, line 82
- Pull Request: Add Agent Monitoring Standard (verify + grow standards from agent runs) (#13989)
- URL: https://github.com/midnghtsapphire/revvel-standards/pull/13989

### Suggested Action
1. Replace `anthropic/claude-opus-4.7` in the provenance example with the actual primary model slug `claude-3.7-sonnet` as documented in `standards/AGENT_STACK_SETUP.md`.
2. Consider cross-referencing `standards/AGENT_STACK_SETUP.md` in this section so readers know where the authoritative model list is maintained.

## Summary
Update the canonical provenance example in `docs/AGENT_MONITORING_STANDARD.md` to use the correct model identifier (`claude-3.7-sonnet`) and cross-reference the active model configuration.

## Objective
Ensure agent-generated provenance records accurately reflect sanctioned models to maintain traceability and auditability.

## Required Bundle
- `docs/AGENT_MONITORING_STANDARD.md`

## Definition of Done
- The `AGENT_MONITORING_STANDARD.md` file is updated to use `claude-3.7-sonnet` instead of `anthropic/claude-opus-4.7`.
- A cross-reference to `standards/AGENT_STACK_SETUP.md` is added to the relevant section.
- This WR document passes all `wr-lint` checks.

## Validation
- Verify that the updated model name in `docs/AGENT_MONITORING_STANDARD.md` matches `standards/AGENT_STACK_SETUP.md`.
- Ensure `wr-lint.mjs` passes for this WR document.

## Blockers
N/A — No blockers identified.
