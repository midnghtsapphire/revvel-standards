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

## Research Findings

- GitHub Actions applies `timeout-minutes` per job, so this fix must name the exact workflow/job pair instead of sweeping every LLM-adjacent YAML file. *(Citations: GitHub Actions workflow syntax for `jobs.<job_id>.timeout-minutes`; `.github/workflows/openrouter-triage.yml:31-226`; `.github/workflows/openrouter-agent.yml:16-20`; `.github/workflows/agent-fallback.yml:135-143`; `.github/workflows/research-engine.yml:113-243`)*
- This repository already has heterogeneous timeout values for adjacent automation: OpenRouter triage runs at 30/45/15 minutes, OpenRouter Agent at 30, Agent Fallback execute at 30, Research Engine at 60, and WR Field Filler at 10. That means the implementation must start from the failing run/configuration, not from a name-only grep. *(Citations: `.github/workflows/openrouter-triage.yml:112-226`; `.github/workflows/openrouter-agent.yml:17-20`; `.github/workflows/agent-fallback.yml:134-143`; `.github/workflows/research-engine.yml:112-243`; `.github/workflows/wr-field-filler.yml:117-126`)*
- OpenRouter's own streaming docs call out long-running streamed responses and keep-alive comment lines, so the final fix must check for nested client or action timeouts in addition to any GitHub Actions job timeout. *(Citation: [OpenRouter streaming docs](https://openrouter.ai/docs/api-reference/streaming))*

## Scope

- First capture the failing run URL, workflow ID, job ID, and log snippet that emits the `10m0s` timeout before changing any configuration.
- Inspect these proven GitHub Actions candidates first because they directly invoke OpenRouter / coding-agent work and are currently below 60 minutes:
  - Workflow `263858176` (`.github/workflows/openrouter-triage.yml`) — jobs `route-new` (30m) and `sweep-triage` (15m).
  - Workflow `272960349` (`.github/workflows/openrouter-agent.yml`) — job `openrouter-agent` (30m).
  - Workflow `269135823` (`.github/workflows/agent-fallback.yml`) — job `execute` (30m), if the timeout is coming from coding-agent execution rather than issue triage.
- Explicitly exclude from the first fix unless the captured failing run proves otherwise:
  - Workflow `278083344` (`.github/workflows/research-engine.yml`) — job `research` is already 60m.
  - `.github/workflows/wr-field-filler.yml` — job `fill-fields` is 10m but is WR form automation, not an OpenRouter execution job.
- Out of scope: Global timeout increases across unrelated workflows.

## Approach

1. Capture the concrete failing run and map it back to the owning workflow/job plus any nested script, SDK, or action timeout that may sit below the GitHub job limit.
2. Raise only the confirmed LLM execution job(s) to the agreed timeout (60m, or 90m only if the captured evidence shows 60m is still insufficient).
3. Add a CI rule and regression test that assert the targeted workflow/job keeps an explicit timeout at or above the approved value.
4. Add duration telemetry or alerting for the targeted long-running job so a higher timeout does not silently hide hangs or retry loops.

## Acceptance Criteria

- [ ] The implementing PR records the failing run URL plus the exact workflow ID and job ID it changes.
- [ ] Only the confirmed long-running LLM execution job(s) have `timeout-minutes` raised to the approved value; unrelated jobs keep their existing limits.
- [ ] The change includes a CI/linter guard and a regression test that fail if the targeted workflow/job loses its explicit timeout.
- [ ] Duration telemetry or alerting for the targeted workflow is added or updated, and its check path is documented/tested.
- [ ] The previously failing job no longer terminates at `10m0s` in validation evidence.
- [ ] Change delivers the described behavior end-to-end.
- [ ] Tests updated / added where applicable.
- [ ] Docs updated where applicable.
- [ ] No regressions in related workflows.

## Risks & Mitigations

**Risk:** Significant cost overruns and resource contention if long-running jobs hang or enter infinite loops.
**Mitigation:** Limit the timeout increase strictly to necessary LLM jobs (not globally). Implement logging and monitoring to track job durations and alert on jobs consistently nearing the 60-minute mark.

## Competitor & Pricing Intelligence

- **Primary keywords:** `GitHub Actions timeout-minutes`, `OpenRouter timeout`, `job exceeded maximum execution time`, `long-running LLM job`, `agent workflow timeout`.
- **GitHub-star checks for referenced tools/patterns:** `actions/runner` has 6,203 stars, `temporalio/temporal` has 22,428 stars, and `inngest/inngest` has 5,749 stars as of 2026-08-20, which confirms strong ecosystem demand for durable-job orchestration and runner controls.
- **Monetization path:** Internal reliability/cost-avoidance — reducing failed long-running agent jobs protects the automated product pipeline and avoids repeat-run spend instead of creating a separate sellable artifact.
- **Distribution channel:** Repository workflows and standards updates delivered through GitHub Issues/PRs to the `dragnet-team`; no external marketing channel is required for this internal-only change.
- **Citations:** [actions/runner](https://github.com/actions/runner), [temporalio/temporal](https://github.com/temporalio/temporal), [inngest/inngest](https://github.com/inngest/inngest), issue #17775 (`Commercial Mode: internal-only`, `Assign To / Decision Team: dragnet-team`), `docs/WEEKLY_RESEARCH_PROCESS.md:191-230`.

## Learnings — What & Why

Default system timeouts (like 10 minutes) are often incompatible with the variable and extended response times of external LLM services. Standardizing an extended timeout explicitly for AI/LLM workloads prevents workflow interruptions, while targeted scoping ensures overall CI/CD resource constraints and cost controls are maintained.
