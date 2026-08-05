# Project Orchestration Standard

> **Status:** Standard / Specification  
> **Applies to:** All projects tracked by `revvel-standards`  
> **Purpose:** Prevent false completion by requiring real end-to-end delivery evidence (artifact + wiring + publication + verification), not just docs/spec/manifest updates.

---

## 1) Why this standard exists

A project is **not complete** because a PR merged, a checklist was checked, or a manifest names an output file.

A project is complete only when required runtime work has actually happened and can be verified:

- required backend/API wiring is connected,
- required output artifacts exist,
- required publication/deployment targets are live,
- source-of-truth records are updated with verified facts.

This standard defines the orchestration contract that enforces those outcomes.

---

## 2) Scope and boundary

### In scope

- Cross-project orchestration behavior and completion gates.
- Lifecycle stages from intake to handoff.
- Required evidence and audit trail per stage.
- Backend/API wiring completeness requirements.
- LLM/OpenRouter orchestration governance.

### Out of scope

- Provider-specific implementation code for every project.
- Secret values or account credentials.

`revvel-standards` remains the contract layer. Runtime automation may live in other repositories/services, but it must implement this contract.

---

## 3) Standards/specs vs runtime orchestration

### Standards/specs define

- required stages and gates,
- required fields and records,
- required evidence,
- completion policy,
- ownership and accountability.

### Runtime orchestration executes

- API calls, webhooks, polling, retries,
- artifact generation/build/render jobs,
- publication/deployment actions,
- verification probes and writeback.

If runtime orchestration cannot prove completion evidence, status must remain non-complete.

---

## 4) Required lifecycle stages (must be explicit)

1. **Intake**  
   Capture request, scope, required outputs, and target environments/domains.
2. **Planning**  
   Build executable stage plan, dependencies, and gate criteria.
3. **Dependency discovery**  
   Identify provider/tool/API/CMS/storage/database dependencies.
4. **Backend/API wiring**  
   Connect required integrations and callback/polling paths.
5. **Generation/build**  
   Execute render/build/transform jobs to create required artifacts.
6. **Storage**  
   Persist outputs to required storage/CDN and record canonical identifiers/URLs.
7. **Publication**  
   Publish/deploy to required target (site/app/platform).
8. **Verification**  
   Validate artifacts truly exist, endpoints are live, and target publishes are reachable.
9. **Docs/README sync**  
   Update source-of-truth docs/manifests with verified values only.
10. **Handoff**  
   Mark complete only after all mandatory gates pass with evidence.

---

## 5) Stage evidence requirements (minimum)

| Stage | Required evidence |
| --- | --- |
| Intake | Request ID, inputs, required output definition, publication target |
| Planning | Stage plan with dependencies + gate criteria |
| Dependency discovery | Integration inventory (providers/services) and required interfaces |
| Backend/API wiring | Connection checks, endpoint mapping, callback/poll contract |
| Generation/build | Job IDs, timestamps, status transitions, output metadata |
| Storage | Canonical object URL/ID, storage location, write confirmation |
| Publication | Live public URL/deployment target + publication timestamp |
| Verification | Artifact existence check + HTTP/status checks + content sanity checks |
| Docs/README sync | Manifest/README updated with verified URLs, statuses, timestamps |
| Handoff | Final completion record referencing all prior evidence |

---

## 6) Completion criteria (hard gate)

A task/project **MUST NOT** be marked complete unless all required criteria are true:

1. Required output artifact(s) exist and are retrievable.
2. Backend/API wiring required for the workflow is connected.
3. Publication/deployment target is live (when publication is required).
4. Source-of-truth records contain verified values from runtime output.
5. Verification timestamps and operator/agent attribution are recorded.

### Explicit prohibition

The following **do not** constitute completion by themselves:

- a merged PR,
- a standards update,
- a manifest listing an expected filename,
- a README claiming publication without verified URL checks.

---

## 7) Status model and state machine

### Canonical status set

- `intake_received`
- `planned`
- `dependencies_resolved`
- `wiring_in_progress`
- `wiring_ready`
- `generation_in_progress`
- `generated`
- `stored`
- `publish_in_progress`
- `published`
- `verification_in_progress`
- `verified`
- `docs_synced`
- `handoff_ready`
- `complete`
- `failed`
- `blocked`

### Required transition rule

Status can only move forward when stage evidence exists.  
`complete` is only valid after `verified` and `docs_synced`.

---

## 8) Retry, failure, and recovery policy

- Every runtime stage must define retry policy (max attempts + backoff).
- Hard failures must capture `failure_reason`, stage, timestamp, and last known provider/job state.
- Partial success must not advance to `complete`.
- Manual override requires explicit justification and owner approval in source-of-truth records.

---

## 9) Auditability and observability

At minimum, orchestration must capture:

- correlation/request ID,
- stage transitions with timestamps,
- provider job IDs,
- output URLs/identifiers,
- verification results,
- failure events and retries,
- who/what system performed each writeback.

Without auditable events, completion cannot be trusted.

---

## 10) Ownership and responsibility boundaries

- **Standards owners** define the contract, required fields, and completion gates.
- **Automation/runtime owners** implement and run orchestrators/adapters.
- **Project owners** provide inputs, approve publication targets, and validate business acceptance.
- **Reviewers/operators** verify evidence integrity before accepting completion.

If ownership is unclear, default to non-complete status.

---

## 11) Backend wiring requirements (mandatory section)

Orchestration must ensure the following are complete before completion:

1. **Required APIs identified and connected**  
   Providers, CMS, storage, database, and internal APIs mapped and reachable.
2. **Secrets policy enforced**  
   Credentials/secrets are expected in runtime environment only; never stored in standards docs/manifests.
3. **Callbacks/webhooks/polling handled**  
   Asynchronous job completion must be tracked via webhook or deterministic polling contract.
4. **Storage/CDN/database/CMS connected**  
   Output and metadata persistence paths are wired and tested.
5. **Website publication target configured**  
   Required target domains/routes are defined and validated before publish.
6. **Source-of-truth writeback complete**  
   Provider outputs and final URLs are written back into canonical records (manifest/README/database rows).

---

## 12) LLM/OpenRouter orchestration governance

OpenRouter is a **model gateway/router**, not the runtime executor.

If an LLM-driven orchestrator is used, it must operate under a strict execution contract.

### Required orchestrator prompt contract

The system prompt/instruction set must include:

1. **Goal definition** — exact required end state and completion gates.
2. **Input contract** — validated inputs and required metadata.
3. **Required outputs** — artifact(s), publication URL(s), writeback record requirements.
4. **Allowed tools/providers** — explicitly enumerated tool and API surface.
5. **Stage order** — required lifecycle sequence and gating rules.
6. **Failure policy** — retries, failure recording, and stop conditions.
7. **Completion policy** — explicit prohibition on docs-only completion.
8. **Writeback policy** — where and how verified outputs must be persisted.

### Deterministic code vs model-assisted tasks

Keep these deterministic in code:

- API execution, webhook verification, polling logic,
- status transitions and gate checks,
- verification checks and URL existence tests,
- schema validation and record writeback.

Use model assistance for:

- plan drafting,
- natural-language summaries,
- non-authoritative content generation (descriptions, SEO suggestions),
- triage support (never as sole completion evidence).

---

## 13) Music video example (reference workflow)

Reference folder: `docs/videos-music/bulletproof-love/`

Required flow:

1. Intake avatar + WAV metadata.
2. Submit lip-sync render (e.g., HeyGen) and record `provider_job_id`.
3. Optional helper roles: Leonardo (imagery/thumbnails), ElevenLabs (optional TTS/voice enhancement), Nano Banana (optional creative support).
4. Produce final MP4 artifact.
5. Store the MP4 in the configured website/CDN storage target and record canonical storage URL(s).
6. Publish to `meetaudreyevans.com`.
7. Write verified `website_url` and `canonical_video_url` to manifest + README.
8. Verify video truly exists and is publicly live.

### Truthfulness rule for manifests

A known/expected filename in a manifest is **not proof** that an MP4 exists.

`video_exists: true` and verification timestamps must only be set after real existence checks pass.

---

## 14) Minimum verification checklist before "complete

- [ ] Required output artifact exists and is accessible.
- [ ] Required backend/API wiring is connected and functioning.
- [ ] Publication target is live and reachable.
- [ ] Manifest/README records contain verified values (not placeholders).
- [ ] Verification timestamps and evidence references are recorded.
- [ ] Failure fields are empty or resolved with documented remediation.

---

## 15) Related standards

- [`../videos-music/README.md`](../videos-music/README.md)
- [`../videos-music/video-publishing-standard.md`](../videos-music/video-publishing-standard.md)
- [`../videos-music/_template/video-manifest-template.json`](../videos-music/_template/video-manifest-template.json)
