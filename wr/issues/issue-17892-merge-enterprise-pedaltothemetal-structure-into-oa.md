# WR: [WR] Merge enterprise PedalToTheMetal structure into oAudrey SSOT

**Issue:** #17892  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-22  
**Research Date:** 2026-08-22  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Scope

Merge the enterprise PedalToTheMetal architecture (near-metal + deterministic-AI structure aimed at enterprise oAudrey) into midnghtsapphire/revvel-standards. The output must include both documentation and real, working code (research-only is insufficient). The merge is constrained to existing patterns and must not create a standalone findings repository, invent a second fleet controller, add secrets, or rely on Vercel deployment success.

## Approach

- Create `standards/PEDAL_TO_THE_METAL_ENTERPRISE.md` to map oAudrey, OpenRouter, GOAP, and existing fleet files. Ensure a START_HERE line is included to anchor the design.
- Define a JSON schema at `schemas/metal-findings.schema.json` that is Ajv-valid and CONTRACT-compatible.
- Implement a validation script or engine to process metal findings and emit `{ artifacts[], next_engine?, status }`. Rely on `engines/runner-orchestrator/orchestrate.js` extension points if clean; otherwise, implement a `scripts/` module with a unit test.
- Document insertion points conceptually (e.g., consume `research:complete` and emit `wr:code`). Ensure this fits within the existing `fleet-controller.yml` and `openrouter-assignee.yml` ecosystems without adding another `issues: opened` workflow.

## Acceptance Criteria

- [ ] Change delivers the described behavior end-to-end
- [ ] Tests updated / added where applicable
- [ ] Docs updated where applicable
- [ ] No regressions in related workflows
- [ ] `standards/PEDAL_TO_THE_METAL_ENTERPRISE.md` maps files and has a `START_HERE` line
- [ ] `schemas/metal-findings.schema.json` created (Ajv-valid, CONTRACT-compatible)
- [ ] Validation script or orchestrator extension implemented and unit tested
- [ ] Insertion points documented
- [ ] No new `issues: opened` workflow added
- [ ] Issue labeled with `wr:code`
- [ ] CircleCI lint-and-test green (or proven flake8/grounding gate issue)

## Risks & Mitigations

- **Risk:** Creating multiple competing pipelines. **Mitigation:** Strictly document the START_HERE approach and rely solely on the existing `fleet-controller.yml`.
- **Risk:** Flaky tests on existing codebase. **Mitigation:** Explicitly prove any failure is a known gate issue.

## Competitor & Pricing Intelligence

N/A — This is an internal technical fix

## Learnings — What & Why

Preventing architecture fragmentation when merging deterministic-AI structures into existing orchestrator patterns requires strict adherence to defined extension points and JSON schemas over new workflows. The constraint against inventing a second fleet controller guarantees unified swarm management by NoseyNoodle.
