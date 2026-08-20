# WR: [WR] copilot which is any visiting llm or openrouter sometimes should always be 60 minutes copilot The job has exceeded the maximum execution time of 10m0s

**Issue:** #17775  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-20  
**Research Date:** 2026-08-20  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Issue Context

Jobs utilizing "copilot" integrations (including visiting LLMs and OpenRouter) are failing due to a default maximum execution time of 10 minutes (10m0s). The user request specifies these jobs should be allowed to run for 60 to 90 minutes to ensure successful completion of complex LLM tasks.

## Background & Motivation

LLM operations, especially those involving OpenRouter and complex data processing tasks orchestrated by the `dragnet-team`, often require significant processing time that exceeds the standard 10-minute CI/CD job limit. This premature termination blocks downstream workflows, disrupts productivity, and decreases reliability in the automated orchestration pipeline.

## Scope

- Identify all GitHub Actions workflows (`.github/workflows/*.yml`) containing jobs related to copilot, LLMs, or OpenRouter.
- Update the `timeout-minutes` configuration for these specific jobs from the implicit or explicit 10 minutes to 60 minutes.
- Out of scope: Global changes to all workflow timeouts (to avoid unnecessary resource consumption by unrelated hung jobs).

## Approach

1. Scan the `.github/workflows/` directory for jobs executing LLM operations, OpenRouter API calls, or Copilot integrations.
2. Explicitly define or update the `timeout-minutes: 60` property on these specific jobs.
3. Introduce a CI check (linter hook) to ensure future LLM-related jobs are configured with an explicit and sufficient timeout.
4. Establish basic monitoring for these long-running jobs to track resource utilization and detect potential infinite loops.

## Acceptance Criteria

- [ ] Jobs calling OpenRouter or LLM copilots have `timeout-minutes: 60` explicitly set.
- [ ] LLM jobs no longer fail prematurely due to the 10m0s timeout.
- [ ] Change delivers the described behavior end-to-end.
- [ ] Tests updated / added where applicable.
- [ ] Docs updated where applicable.
- [ ] No regressions in related workflows.

## Risks & Mitigations

**Risk:** Significant cost overruns and resource contention if long-running jobs hang or enter infinite loops.
**Mitigation:** Limit the timeout increase strictly to necessary LLM jobs (not globally). Implement logging and monitoring to track job durations and alert on jobs consistently nearing the 60-minute mark.

## Competitor & Pricing Intelligence

N/A — This is an internal technical fix.

## Learnings — What & Why

Default system timeouts (like 10 minutes) are often incompatible with the variable and extended response times of external LLM services. Standardizing an extended timeout explicitly for AI/LLM workloads prevents workflow interruptions, while targeted scoping ensures overall CI/CD resource constraints and cost controls are maintained.
