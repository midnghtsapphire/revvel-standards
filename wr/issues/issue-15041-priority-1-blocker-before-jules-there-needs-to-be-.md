# Issue #15041: Priority 1 Blocker - Before Jules, There Needs To Be...

## Priority
**P1 - Blocker**

## Status
Open - Requires immediate attention before Jules integration can proceed.

## Summary
Before Jules (LLM/copilot integration) can be enabled, we must implement and validate a WR (Work Request) enrichment parser that converts image inputs into structured text suitable for downstream LLM processing.

## Background
The WR pipeline currently lacks an image-to-text parser capable of extracting meaningful, structured content from screenshots, diagrams, and other visual artifacts attached to work requests. Without this parser, Jules cannot reliably enrich work requests, and the copilot integration will produce low-quality or hallucinated outputs.

## Scope

### In Scope
- Image-to-text parser for WR attachments (PNG, JPG, WEBP, PDF pages rendered as images).
- OCR pipeline with pre-processing (deskew, denoise, contrast normalization).
- Structured extraction: headings, bullet lists, tables, code blocks, UI element labels.
- LLM enrichment stage that takes parsed text + WR metadata and produces enriched WR payload.
- Integration hooks for Jules copilot.
- Validation harness with Jules-provided acceptance fixtures.

### Out of Scope
- Video frame extraction.
- Audio transcription.
- Real-time streaming ingestion.

## Technical Approach

1. **Parser Layer**
   - Use Tesseract (baseline) with optional cloud OCR fallback (Azure/GCP Vision) behind a feature flag.
   - Emit intermediate JSON schema: `{blocks: [{type, text, bbox, confidence}]}`.

2. **Normalization Layer**
   - Merge low-confidence blocks, dedupe, apply spell/format correction.
   - Preserve reading order and hierarchical structure.

3. **LLM Enrichment Layer**
   - Prompt template accepts normalized JSON + WR title/description.
   - Returns enriched fields: `summary`, `acceptance_criteria`, `risks`, `dependencies`, `estimated_effort`.
   - Guardrails: JSON schema validation, refusal on low-confidence inputs.

4. **Jules Integration**
   - Expose enrichment via internal API endpoint `/wr/enrich`.
   - Jules consumes enriched payload; failure modes documented.

## Dependencies
- Tesseract >= 5.x installed in CI and runtime containers.
- LLM provider credentials configured via env (`WR_LLM_API_KEY`).
- Jules acceptance fixture set (blocked on Jules team delivery).

## Risks
- OCR accuracy on low-resolution screenshots.
- LLM cost per WR at scale.
- Prompt drift as WR schemas evolve.

## Related
- PR #15045
- Jules integration epic (TBD link)

## Definition of Done

This issue is considered **DONE** only when **all** of the following criteria are met and verified.

### 1. Functional Requirements
- [ ] Image-to-text parser accepts PNG, JPG, WEBP, and PDF-rendered page images.
- [ ] Parser achieves **>= 92% character-level accuracy** on the Jules-provided acceptance fixture set.
- [ ] Parser achieves **>= 85% structural accuracy** (correct block typing: heading/list/table/code) on the same fixtures.
- [ ] LLM enrichment returns valid JSON conforming to the published `wr_enriched_v1` schema **100%** of the time (schema-validated at the boundary; invalid outputs are retried up to 2x then failed loudly).
- [ ] Enrichment produces non-empty `summary`, `acceptance_criteria`, and `risks` fields for all fixtures classified as "enrichable".

### 2. Integration Criteria
- [ ] `/wr/enrich` endpoint is deployed to staging and reachable by Jules service accounts.
- [ ] Jules team has run end-to-end validation against staging and signed off in writing (comment on this issue or linked PR).
- [ ] Feature flag `wr.enrichment.enabled` controls rollout; default off in production until sign-off.
- [ ] Backward-compatible: WRs without images continue to flow through the pipeline unchanged.

### 3. Testing Requirements
- [ ] **Unit tests** cover parser, normalizer, and enrichment prompt builder with **>= 85% line coverage** on new modules.
- [ ] **Integration tests** exercise the full pipeline (image → parsed JSON → enriched payload) against at least 20 fixtures.
- [ ] **Acceptance tests** derived from Jules fixtures run in CI and gate merges.
- [ ] **Regression suite** includes at least 5 known-difficult images (low contrast, rotated, handwritten, dense tables, multilingual).
- [ ] Load test demonstrates the endpoint sustains **>= 10 req/s** with p95 latency **<= 8s** end-to-end.

### 4. Documentation and Code Review
- [ ] `wr/docs/enrichment.md` documents architecture, schemas, prompts, feature flags, and runbook.
- [ ] Prompt templates are versioned in-repo under `wr/prompts/` with changelog entries.
- [ ] At least **two approving reviews** on the implementation PR, including one from the WR platform owner and one from the LLM/Jules integration owner.
- [ ] Security review completed: no PII leakage in logs, LLM inputs redacted per `wr/security/redaction.md`.
- [ ] Operational runbook covers OCR failures, LLM outages, and cost spike alerts.

### 5. Quality & Performance Metrics
- [ ] p95 parser latency **<= 3s** per image on standard runtime container.
- [ ] p95 enrichment latency **<= 5s** per WR.
- [ ] Per-WR LLM cost tracked and reported; **<= $0.05 median** at expected traffic.
- [ ] Dashboards published for: parser accuracy (rolling), enrichment schema-failure rate, latency, and cost.
- [ ] Alerts configured: schema-failure rate **> 2%** over 15m, p95 latency breach, cost anomaly **> 3σ**.

### 6. Sign-off
- [ ] WR platform owner sign-off.
- [ ] Jules integration owner sign-off.
- [ ] SRE sign-off on runbook and alerts.
- [ ] Product sign-off that acceptance fixtures reflect real-world WR distribution.

Only after every checkbox above is satisfied may this blocker be closed and Jules enablement proceed to production rollout.
