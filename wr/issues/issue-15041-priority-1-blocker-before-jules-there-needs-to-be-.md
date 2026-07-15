# Issue #15041: Priority 1 Blocker - WR Enrichment Parser & LLM Integration (Before Jules)

**Priority:** P1 - Blocker
**Status:** Open
**Related PR:** #15045
**Tracking Issue:** #16062

## Summary

Before Jules can proceed with downstream WR (Work Request) enrichment, we need a robust image-to-text parser feeding an LLM/copilot integration that produces structured enrichment data compatible with Jules' pipeline.

This issue previously lacked a Definition of Done, blocking implementation and validation. This document remedies that gap.

## Context

- WR enrichment currently depends on manually transcribed image content.
- Jules' pipeline requires structured, validated enrichment payloads.
- A parser + LLM integration is the minimum viable bridge.

## Scope

1. Image-to-text parser (OCR + preprocessing)
2. LLM/copilot integration that transforms parsed text into structured WR enrichment records
3. Validation layer ensuring outputs meet Jules' schema contract
4. Handoff artifacts (tests, docs, metrics)

## Out of Scope

- Jules' downstream consumers
- UI changes
- Non-WR enrichment flows

---

## Definition of Done

This section defines the explicit, measurable acceptance criteria required to close this issue. All items MUST be checked before merging PR #15045 or marking the issue complete.

### 1. Functional Requirements

- [ ] **Image parser** accepts PNG, JPEG, and PDF (single- and multi-page) inputs.
- [ ] **OCR accuracy** ≥ 95% character-level accuracy on the reference test set (`wr/tests/fixtures/ocr/`).
- [ ] **Structured output** conforms to the WR enrichment JSON schema at `wr/schemas/enrichment.schema.json`.
- [ ] **LLM integration** produces deterministic outputs given `temperature=0` and a fixed seed for the same input (idempotency check).
- [ ] **Error handling**: parser returns a typed error object (never throws) for unsupported formats, corrupt files, or empty images.
- [ ] **Fallback path**: when OCR confidence < 80%, the record is flagged `needs_human_review: true` rather than silently emitted.

### 2. Integration Criteria (Jules Handoff)

- [ ] Sample enrichment payload validated end-to-end against Jules' consumer contract (sign-off recorded in this issue).
- [ ] Contract test suite `wr/tests/contract/jules_enrichment_test.py` passes in CI.
- [ ] Schema version pinned and documented (`schema_version` field present in every payload).
- [ ] Backwards-compatibility check: prior fixtures in `wr/tests/fixtures/legacy/` still parse without regression.

### 3. Testing Requirements

- [ ] **Unit tests** cover parser, LLM adapter, validator — ≥ 85% line coverage on new modules.
- [ ] **Integration tests** exercise the full image → parsed text → LLM → validated payload pipeline.
- [ ] **Acceptance tests** run against 20+ real-world WR sample images with a documented pass rate ≥ 90%.
- [ ] **Golden-file tests** for LLM outputs on canonical inputs (diff-review required on changes).
- [ ] CI green on `main` merge candidate.

### 4. Documentation & Code Review

- [ ] `README.md` in `wr/parser/` documenting install, usage, config, and known limitations.
- [ ] Architecture note in `wr/docs/architecture/enrichment-pipeline.md`.
- [ ] Public API docstrings on every exported function/class.
- [ ] At least two approving code reviews on PR #15045, one from a Jules-side reviewer.
- [ ] CHANGELOG entry under `## [Unreleased]`.

### 5. Performance & Quality Metrics

- [ ] **Throughput**: ≥ 30 images/minute on the reference worker (4 vCPU, 8 GB RAM).
- [ ] **Latency**: p95 end-to-end (image in → validated payload out) ≤ 8 seconds per image.
- [ ] **LLM cost budget**: ≤ $0.02 per enrichment record on the default model tier.
- [ ] **Observability**: structured logs, metrics (`enrichment_records_total`, `ocr_confidence_bucket`, `llm_latency_seconds`), and traces emitted.
- [ ] **Failure rate**: < 2% unrecoverable failures on the acceptance test set.

### 6. Sign-Off

- [ ] Engineering lead sign-off
- [ ] Jules-side integration owner sign-off
- [ ] QA sign-off on acceptance test report
- [ ] Product/PM confirmation that DoD is satisfied

---

## Validation Checklist (pre-merge for PR #15045)

1. All Definition of Done boxes above are checked.
2. Test artifacts and metrics are attached as PR comments.
3. Jules-side reviewer has confirmed contract compatibility in writing.
4. No open P1/P2 review comments remain.

## References

- Tracking issue: #16062
- PR: <https://github.com/midnghtsapphire/revvel-standards/pull/15045>
- Jules enrichment contract: `wr/schemas/enrichment.schema.json`
- Architecture doc: `wr/docs/architecture/enrichment-pipeline.md`
