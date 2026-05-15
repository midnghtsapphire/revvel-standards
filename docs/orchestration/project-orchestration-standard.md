# Cross-Project Orchestration Standard

> **A project is NOT complete because a PR, README, manifest, filename, or expected output path exists.**
>
> A project is only complete when the actual artifact exists, backend wiring is connected,
> destination publication is live, source-of-truth records contain the real final URLs/status,
> and verification has passed.

---

## 1. Purpose

This standard defines how every project in the MIDNGHTSAPPHIRE org is orchestrated from
intake to verified completion. It applies to all project types: music videos, web apps,
PDF products, data pipelines, and any other deliverable that requires backend wiring,
storage, publication, and user-accessible output.

The orchestrator is the single system that owns the project lifecycle — tracking state,
driving API calls, persisting outputs, and refusing to declare a project done until
verification passes.

---

## 2. Required Lifecycle Stages

Every project must pass through all nine stages in order. The status field in the project
manifest must reflect the current stage honestly.

### Stage 1 — Intake

Collect all required inputs before starting any work.

Required for every project:
- Asset list (files, URLs, external references)
- Functional requirements and acceptance criteria
- Destination websites or apps where outputs must be published
- Any existing accounts, credentials, or environment secrets needed

Completion gate: all assets present and validated, requirements written, destination confirmed.

### Stage 2 — Planning

Determine all dependencies before writing a line of code or calling any API.

Required:
- Provider selection (which APIs handle generation, storage, publishing)
- Identification of all required secrets and environment variables
- Delivery architecture (polling vs webhook, storage path, CDN/CMS target)
- Risk flags (missing credentials, unavailable APIs, cost constraints)

Completion gate: plan document exists, all providers identified, no unresolved blockers.

### Stage 3 — Backend Wiring

Physically connect every required backend service. This stage is not complete until
every API connection is tested.

Required:
- All API keys confirmed present in the runtime environment
- Provider SDKs or HTTP clients initialised
- Webhook endpoints or polling paths registered
- Storage bucket / CDN / CMS connections verified
- Secrets exist in GitHub Actions / Vault / runtime — not just documented as "needed"

Completion gate: each integration can make a real (or sandbox) round-trip without error.

### Stage 4 — Execution

Submit the generation or build job to the chosen provider.

Required:
- Job submitted with all required inputs
- Provider job ID captured and persisted to manifest
- Retry logic present (at least 3 attempts with exponential backoff)

Completion gate: provider has accepted the job and returned a job ID.

### Stage 5 — Storage

Persist the generated artifact in the designated location.

Required:
- Raw provider output downloaded/received
- Artifact stored in canonical path (S3, R2, DigitalOcean Spaces, etc.)
- Storage URL written back to manifest (`artifact_storage_url`)
- File integrity confirmed (size > 0, format valid)

Completion gate: artifact exists in storage and URL is readable.

### Stage 6 — Publication

Publish the artifact to every required destination.

Required:
- Artifact uploaded/embedded to every destination website or app
- CMS entry created or updated (if applicable)
- Publication URL captured and written to manifest (`canonical_video_url` / `website_url`)

Completion gate: artifact is accessible at a public URL on the destination site.

### Stage 7 — Verification

Confirm the artifact exists and the destination URL is live.

Required:
- HTTP GET to the canonical URL returns 200
- Response confirms artifact type (video/mp4, application/pdf, etc.)
- `verified_at_utc` timestamp written to manifest
- `video_exists: true` (or equivalent) set in manifest

Completion gate: verification HTTP check passes.

### Stage 8 — Docs / Source-of-Truth Writeback

Update all documentation records to reflect real, verified state.

Required:
- Project manifest updated with final URLs, status, and verification timestamp
- README updated with real output links (not placeholder paths)
- CHANGELOG entry added
- Dashboard / project index updated if applicable

Completion gate: no placeholder URLs remain in any source-of-truth document.

### Stage 9 — Handoff

Expose the completed output and surface any failures.

Required:
- Summary posted to the originating GitHub issue or PR
- Final manifest committed to source control
- Any incomplete or failed items listed explicitly with `failure_reason`
- Next-step instructions written if work is partially complete

---

## 3. Status Machine

Use the following canonical status values in every project manifest. Never skip statuses.

| Status | Meaning |
|---|---|
| `draft` | Project created; intake not complete |
| `requirements_collected` | Intake complete; planning not started |
| `dependencies_identified` | Planning complete; wiring not started |
| `backend_wiring_pending` | Wiring blocked by missing credentials or setup |
| `backend_wired` | All API connections confirmed working |
| `execution_requested` | Job submitted to provider; awaiting job ID |
| `processing` | Provider job ID received; generation in progress |
| `artifact_created` | Provider confirmed artifact complete |
| `stored` | Artifact persisted in designated storage |
| `published` | Artifact accessible at destination URL |
| `verified` | HTTP verification passed; `verified_at_utc` set |
| `indexed` | SEO/sitemap/CMS indexing confirmed |
| `failed` | Non-recoverable failure; `failure_reason` set |

---

## 4. Completion Criteria

A project is **complete** when ALL of the following are true:

1. The actual artifact file exists (video, PDF, image, bundle, etc.).
2. The artifact is accessible at a public canonical URL.
3. The canonical URL is on the correct destination website.
4. The manifest `render_status` is `verified`.
5. `video_exists` (or `artifact_exists`) is `true`.
6. `verified_at_utc` is set with a real timestamp.
7. No field in the manifest contains a placeholder URL (`example.com`, `placeholder`, `TBD`, etc.).
8. The README contains a real working link to the published output.

A project is **not complete** based on:
- A PR being merged
- A manifest file existing
- A filename being listed in a document
- A README describing what the output will be
- A workflow run succeeding on scaffolding

---

## 5. Backend Wiring Rules

These rules apply to every project that requires external API connectivity.

### 5.1 Secrets

- Every required API key must be listed in the project's `.env.example` before execution starts.
- All secrets must be present in the runtime environment (GitHub Actions secrets, Vault, etc.) before Stage 3 begins.
- The orchestrator must fail loudly if a required secret is missing — it must never silently skip an API call.

### 5.2 Provider Connections

- Every provider used must have a tested round-trip (health check, list endpoint, or sandbox generation) before Stage 4.
- Provider job IDs must be captured and persisted to the manifest immediately upon receipt.
- No job may be considered submitted without a confirmed job ID from the provider.

### 5.3 Polling and Webhooks

- If the provider is asynchronous (Luma, Runway, HeyGen, etc.), the orchestrator must implement polling or webhook receipt.
- Polling interval: start at 10 s, back off to max 60 s, timeout after 30 min.
- On timeout, set status to `failed` and write `failure_reason: "Provider timeout after 30 min"`.

### 5.4 Storage

- The artifact must be written to a permanent storage location before publication.
- Ephemeral URLs (signed S3 URLs, provider-hosted preview URLs) must not be used as the canonical output URL.
- The storage path must follow: `{project}/{artifact-type}/{slug}/{filename}`.

### 5.5 Publication

- Publication means the artifact is embedded and accessible on the destination site — not merely uploaded to storage.
- The publication step must capture the live URL and write it to `canonical_video_url` / `website_url`.
- The orchestrator must not mark a project published based on a deployment workflow succeeding; it must verify the URL.

---

## 6. OpenRouter / LLM Orchestration Contract

When an LLM is used to assist orchestration (via OpenRouter), the following contract applies.

### 6.1 Responsibility Split

**Deterministic (always code, never LLM):**
- API calls to providers (Luma, Runway, HeyGen, etc.)
- File uploads and downloads
- Polling and retry loops
- Storage writes
- Publication HTTP calls
- Manifest updates
- Verification HTTP checks

**Model-assisted (LLM acceptable):**
- Planning: provider selection, dependency identification
- Metadata generation: title, description, tags, SEO copy
- Validation summaries: reviewing the plan before execution
- Tool selection logic when multiple providers are available
- Deep research on the project topic before intake

### 6.2 System Prompt / Execution Contract

Every OpenRouter call for project orchestration must use the following contract as the
system prompt base. Project-specific details are injected into the `{PLACEHOLDERS}`.

```
MISSION
You are the project orchestrator for {PROJECT_NAME}. Your job is to produce a
complete, actionable execution plan that covers every stage from intake to
verified publication. You must not mark any stage complete without evidence.

REQUIRED INPUTS
- Assets: {ASSET_LIST}
- Metadata: {METADATA}
- Destination: {DESTINATION_WEBSITE}
- Providers: {PROVIDER_LIST}
- Publication target: {PUBLICATION_TARGET}

REQUIRED OUTPUTS
- Execution plan with all 9 lifecycle stages filled in
- Provider selection rationale
- List of all required secrets/env vars
- Backend wiring checklist
- Verification criteria (what URL to check, what response proves success)
- Source-of-truth writeback targets

RULES
1. Never mark a stage complete without evidence (job ID, HTTP 200, file size, etc.)
2. Never mark a project published without confirming a live URL on the destination site
3. Always record failure_reason when a stage fails; never silently skip
4. Always write final URLs and status back to the manifest
5. Separate your planning output (LLM) from execution steps (must be deterministic code)
6. If any required secret is missing, halt and report — do not proceed

DETERMINISTIC vs MODEL-ASSISTED
- Planning, metadata, SEO: model-assisted (your output)
- API calls, uploads, polling, publishing, verification: deterministic code only
```

### 6.3 Model Selection

Use the `repo_surgery` routing profile from `scripts/openrouter-routing.js` for
orchestration planning tasks. This profile uses:

1. `anthropic/claude-sonnet-4` (primary)
2. `deepseek/deepseek-v3.2` (fallback)
3. `openai/gpt-5.2-codex` (fallback)

### 6.4 Deep Research

Before Stage 2 (Planning), the orchestrator must run a deep-research prompt that covers:
- The project topic in depth (artist, song, visual style, target audience)
- Best available providers for the asset type
- Current pricing and rate limits for each provider
- Known failure modes and workarounds
- SEO and distribution strategy for the destination site

---

## 7. Auditability

Every project must maintain an audit trail with:
- Stage transitions with timestamps
- Provider job IDs and response metadata
- HTTP verification results (status code, response headers, content length)
- Failure reasons with full error messages
- Who or what triggered each state transition (human, scheduled job, webhook)

The audit trail is written to the project manifest `audit_log` array.

---

## 8. Retries and Failure Handling

- Every API call must be wrapped in a retry loop (minimum 3 attempts).
- Exponential backoff: 1 s, 5 s, 15 s.
- On final failure: set `render_status: "failed"`, write `failure_reason`, create a GitHub
  Work Request issue with label `WR` and title `[WR] {PROJECT_NAME}: {STAGE} failed`.
- The project must not be abandoned silently. A failed project is better than a
  falsely-completed one.

---

## 9. Responsibility Boundaries

| Role | Responsibility |
|---|---|
| Orchestrator | Driving lifecycle, tracking state, calling APIs, writing manifests |
| LLM (OpenRouter) | Planning, metadata, provider selection, research summaries |
| GitHub Actions | CI triggers, deployment, secret injection |
| Human | Providing assets, approving plans, resolving blocked secrets |
| Destination site | Hosting the published artifact |

---

## 10. Music Video Example — `bulletproof-love`

This section demonstrates the standard applied to a concrete music video project.

**Artist:** Audrey Evans
**Song:** Bulletproof Love
**Destination:** `meetaudreyevans.com`
**Artifact type:** MP4 lip-sync music video

### Intake checklist

- [ ] `bulletproof-love.wav` present in intake storage
- [ ] Avatar image (Audrey Evans) present
- [ ] Destination page on `meetaudreyevans.com` identified
- [ ] Provider accounts verified (HeyGen, Luma, or Runway)

### Backend wiring checklist

- [ ] `HEYGEN_API_KEY` present in runtime environment
- [ ] `LUMA_API_KEY` present in runtime environment
- [ ] Storage bucket credentials present
- [ ] `meetaudreyevans.com` CMS/deployment access confirmed

### Completion statement

> The `bulletproof-love` video is complete when:
> an MP4 file exists in storage, it is embedded on `meetaudreyevans.com/music/bulletproof-love`,
> an HTTP GET to that URL returns 200 with `Content-Type: video/mp4` or an embedded player,
> and the manifest `verified_at_utc` is set.

> A filename in a manifest is **not** proof that the MP4 exists.

See `docs/videos-music/bulletproof-love/manifest.json` for the honest current status.

---

## 11. Related Documents

- `docs/videos-music/README.md` — Video production standards
- `docs/videos-music/templates/manifest.template.json` — Manifest template with all required fields
- `docs/videos-music/bulletproof-love/manifest.json` — Example manifest (honest state)
- `products/music-video-creator/src/app/api/orchestrate/route.ts` — OpenRouter orchestrator API
- `scripts/openrouter-routing.js` — Model routing with fallback chains
- `.env.example` — All required environment variables

---

*Standard version: 1.0.0 — created 2026-05-15*
