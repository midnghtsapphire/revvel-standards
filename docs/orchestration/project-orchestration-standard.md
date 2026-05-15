# Cross-Project Orchestration Standard

**Status:** Active  
**Version:** 1.0.0  
**Last Updated:** 2026-05-15  
**Owner:** Revvel Standards

---

## Purpose

The Orchestrator is a **project manager**, not just a script runner.

Its job is to own the full lifecycle of any project — from intake of assets through to verified publication — and to **follow up** until the work is genuinely complete. It diagnoses failures, assesses which tools are needed (and at what cost), combines data from multiple sources, and writes verified final state back to the source of truth.

> A project is **not complete** because a PR, README, manifest, filename, or expected output path exists.
>
> A project is only complete when:
> - the actual artifact exists,
> - backend wiring is connected,
> - destination publication is live,
> - source-of-truth records contain the real final URLs/status, and
> - verification has passed.

---

## Orchestrator Role

The Orchestrator:

1. **Owns the lifecycle** — it does not hand off and forget; it follows up at every gate.
2. **Diagnoses failures** — when a step fails, it determines *why* and what needs to change.
3. **Assesses tools** — before execution it evaluates required providers, APIs, and their costs.
4. **Aggregates intelligence** — it collects answers from multiple LLMs (via OpenRouter swarms) and combines them into one authoritative recommendation.
5. **Writes back** — every run ends with a source-of-truth update, regardless of success or failure.
6. **Never silently stops** — if it cannot complete a stage, it records the blocker and surfaces it.

---

## Required Lifecycle Stages

Every project must pass through all nine stages. Skipping any stage means the project remains **incomplete**.

### Stage 1 — Intake
Collect and validate all inputs required before any work begins.

Required inputs:
- Source assets (files, data, content)
- Requirements and acceptance criteria
- External dependencies and destination websites/apps
- Provider preferences and budget constraints
- Responsible team/contact

**Gate:** All required assets are present and validated.

### Stage 2 — Planning
Determine what is needed to complete the project.

Orchestrator must produce:
- Required providers and APIs (with cost estimates and FOSS alternatives)
- Required storage, CDN, database, CMS targets
- Required deployment targets
- Dependency map (what must happen before what)
- Risk assessment (what could fail, and why)

**Gate:** Plan reviewed and signed off; all required secrets identified.

### Stage 3 — Backend Wiring
Connect all APIs, services, and infrastructure before execution begins.

The orchestrator must confirm:
- All required APIs are accessible and responding
- All runtime secrets exist in the environment (no silent fallbacks)
- Provider endpoints are authenticated and reachable
- Webhook / polling paths exist and are registered
- Storage/CDN/database/CMS are configured and writable
- Deployment targets are configured before any publish attempt

**Gate:** Each integration passes a connectivity check. Failures are recorded with reasons.

### Stage 4 — Execution
Run the generation, build, render, or transformation.

The orchestrator must:
- Submit the job to the configured provider
- Capture the provider job ID
- Begin polling or listen for webhook callbacks
- Record timestamps and intermediate status changes
- Handle retries with back-off on transient failures

**Gate:** Job accepted by provider and job ID captured.

### Stage 5 — Storage
Persist the output artifact in the correct location.

The orchestrator must:
- Write the artifact to the designated storage path
- Verify the artifact is readable and meets size/format requirements
- Record the storage URI in the manifest

**Gate:** Artifact verified present at storage URI.

### Stage 6 — Publication
Publish the artifact to the required destination.

The orchestrator must:
- Push the artifact to the publication target (website, CDN, CMS, app)
- Confirm the publication target is configured *before* attempting publish
- Record the public/canonical URL

**Gate:** Publication API/deploy confirms success; URL recorded.

### Stage 7 — Verification
Confirm the artifact is publicly accessible at the canonical URL.

The orchestrator must:
- HTTP-GET the canonical URL and confirm 200 response
- Confirm the response body matches the expected artifact type
- Record `verified_at_utc` timestamp

**Gate:** Live URL returns expected content.

### Stage 8 — Docs / Source-of-Truth Writeback
Update all source-of-truth documents with final verified state.

The orchestrator must update:
- Project manifest (all status fields, real URLs, job IDs, timestamps)
- README / status board
- CHANGELOG entry
- Any dependent indexes or catalog files

**Gate:** Source-of-truth reflects actual verified state, not expected state.

### Stage 9 — Handoff
Expose the completed outcome to humans and downstream systems.

The handoff record must include:
- What was created (artifact type, name, format)
- Where it lives (storage URI + canonical public URL)
- What failed (if incomplete) and why
- What the next action is (if blocked)
- Who/what is responsible for next action

**Gate:** Handoff record committed and visible.

---

## Status State Machine

Every project must carry one of these statuses in its manifest at all times:

| Status | Meaning |
|---|---|
| `draft` | Project created; intake not yet complete |
| `requirements_collected` | Stage 1 complete; planning not started |
| `dependencies_identified` | Stage 2 complete; wiring not started |
| `backend_wiring_pending` | Stage 3 started; connectivity not confirmed |
| `backend_wired` | Stage 3 complete; ready to execute |
| `execution_requested` | Job submitted to provider |
| `processing` | Provider confirmed receipt; polling/waiting |
| `artifact_created` | Output artifact exists at storage URI |
| `stored` | Artifact verified at storage URI |
| `published` | Artifact published to destination |
| `verified` | Live URL confirmed accessible |
| `indexed` | Canonical URL indexed / registered in catalog |
| `failed` | A stage failed; see `failure_reason` |

Transitions only move **forward** unless a retry begins, which resets to the failed stage.

---

## Backend Wiring Rules

These rules are non-negotiable. No execution may begin until all wiring checks pass.

1. **Secret presence** — every `REQUIRED_SECRET` must exist in the runtime environment. The orchestrator must fail loudly if any are missing; it must never silently skip an API call.
2. **Connectivity check** — every external API must respond to a health/auth check before job submission.
3. **Provider job ID capture** — every submitted job must capture a provider-issued job ID; a job without an ID is not tracked.
4. **Webhook / polling registration** — the callback or polling path must exist before job submission.
5. **Storage writability** — the storage target must accept a test write before the real artifact is expected.
6. **Publication target pre-flight** — deployment configuration must be valid before the publish stage.
7. **No silent stops** — if the system cannot complete wiring, it records the specific blocker and surfaces it in the handoff. It does not mark the project as progressing beyond `backend_wiring_pending`.

---

## OpenRouter / Multi-Agent Swarm Orchestration

OpenRouter is a **model router**, not the runtime executor. Deterministic code must handle API calls, retries, polling, uploads, publishing, state updates, and verification. The LLM swarm assists with planning, metadata, SEO copy, tool selection logic, and validation summaries.

### When to Use a Swarm

| Task | Topology |
|---|---|
| Single deterministic task | Single agent |
| Multiple independent research threads | Parallel MAS — named Scout agents |
| Iterative, emergent task (write → review → refine) | Sequential MAS |
| 100+ micro-tasks at scale | Swarm with aggregator |
| Research + synthesis + delivery | Three-layer team (Scouts → Sage → Forge) |

### Three-Layer Team for Project Orchestration

```
1. Scout agents (parallel research)
   ├── Scout-1: Provider selection (cost, features, latency)
   ├── Scout-2: Storage/CDN options
   ├── Scout-3: Publication target requirements
   └── Scout-N: Any additional domain (e.g. SEO metadata, legal compliance)

2. Sage agent (synthesis)
   └── Reads all Scout outputs → produces unified plan + risk register

3. Forge agent (execution planning)
   └── Translates Sage plan into ordered task list + wiring spec
```

### Multi-LLM Response Aggregation

When multiple models are queried in parallel:

1. Each model's response is stored individually in the log/database with:
   - `model_id`
   - `response_text`
   - `confidence_signals` (if available)
   - `timestamp_utc`
   - `token_cost`

2. An aggregator agent (Sage) reads all stored responses and produces one authoritative answer by:
   - Identifying consensus points (majority / all models agree)
   - Flagging disagreements for human review
   - Selecting the highest-confidence recommendation where models diverge
   - Recording which model's answer was used for each decision

3. The aggregated response is the only one used downstream. Individual model logs are retained for auditability.

### Tool Assessment Required for Every Project

Before execution, the orchestrator must assess each required tool/API:

| Field | Description |
|---|---|
| `tool_name` | Human-readable name |
| `category` | API / library / service / infra |
| `foss` | `true` if open-source with permissive licence |
| `cost_model` | `free` / `per-call` / `subscription` / `usage-based` |
| `est_cost_per_run` | Estimated cost per project run |
| `est_monthly_cost` | Estimated recurring cost |
| `alternatives` | List of FOSS/cheaper alternatives assessed |
| `selected` | `true` / `false` |
| `selection_reason` | Why this tool was selected over alternatives |

### Failure Diagnosis

When any stage fails, the orchestrator must:

1. Capture the exact error message and HTTP status (if applicable)
2. Classify the failure:
   - `missing_secret` — a required environment variable was absent
   - `connectivity` — the external service did not respond
   - `auth_error` — credentials were rejected
   - `rate_limit` — provider returned 429
   - `provider_error` — provider returned 5xx
   - `artifact_missing` — expected output did not appear
   - `publish_failed` — deployment/publish step rejected
   - `verification_failed` — live URL did not return expected content
   - `unknown` — unclassified error
3. Record `failure_reason`, `failure_class`, and `failed_at_stage` in the manifest
4. Determine whether automatic retry is appropriate
5. If not auto-retryable, surface the blocker in the handoff with the next required human action

### Retry Rules

| Failure Class | Auto-Retry | Max Attempts | Back-off |
|---|---|---|---|
| `connectivity` | Yes | 3 | Exponential (5s, 15s, 45s) |
| `rate_limit` | Yes | 5 | Exponential + jitter |
| `provider_error` | Yes | 3 | Exponential (10s, 30s, 90s) |
| `missing_secret` | No | — | Surface to human |
| `auth_error` | No | — | Surface to human |
| `artifact_missing` | Yes (once) | 2 | 60s |
| `publish_failed` | Yes | 3 | 30s |
| `verification_failed` | Yes | 3 | 30s |

---

## Responsibility Boundaries

| Actor | Responsibility |
|---|---|
| **Orchestrator** | Owns lifecycle, wiring, retries, failure diagnosis, writeback |
| **LLM (via OpenRouter)** | Planning, metadata, tool selection logic, validation summaries |
| **Deterministic code** | API calls, polling, uploads, state machine transitions, verification |
| **Human** | Secret provision, provider account setup, budget approval, unblocking non-retryable failures |

---

## Auditability Requirements

Every project run must produce a log entry containing:

- `project_id`
- `run_id`
- `triggered_by` (human or automation)
- `started_at_utc`
- `completed_at_utc`
- `final_status`
- `stages_completed` (list)
- `failed_at_stage` (if applicable)
- `failure_class` (if applicable)
- `failure_reason` (if applicable)
- `artifact_uri`
- `canonical_url`
- `models_used` (list of model IDs queried in this run)
- `total_token_cost`

Logs must be written to a persistent store (database, log file, or GitHub Actions artifact) before the run is considered closed.

---

## Music Video Example

See [`docs/videos-music/bulletproof-love/`](../videos-music/bulletproof-love/) for a concrete example using this standard.

The example shows:
- WAV + avatar intake
- Provider choice (HeyGen / Luma / Runway)
- Lip-sync generation job submission
- MP4 artifact creation
- Publish to `meetaudreyevans.com`
- Manifest update with verified vs expected state

---

## Related Documents

- [`docs/orchestration/openrouter-execution-contract.md`](./openrouter-execution-contract.md) — OpenRouter MAS prompt/contract
- [`docs/videos-music/README.md`](../videos-music/README.md) — Video standards
- [`docs/videos-music/manifest-template.yml`](../videos-music/manifest-template.yml) — Manifest template
- [`skills/openrouter-swarms/SKILL.md`](../../skills/openrouter-swarms/SKILL.md) — Swarm topology reference
- [`docs/OPENROUTER_TRIAGE_PROCESS.md`](../OPENROUTER_TRIAGE_PROCESS.md) — OpenRouter triage flow
