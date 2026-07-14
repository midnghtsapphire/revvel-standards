# Issue #15041: Priority 1 Blocker - WR Enrichment Parser and LLM Integration (Before Jules)

## Priority
**P1 - Blocker**

## Summary
Before Jules can proceed with WR enrichment validation, we need a working image-to-text parser and LLM/copilot integration pipeline. This issue tracks the implementation and acceptance criteria for that foundational work.

## Context
The WR (Work Request) enrichment pipeline requires:
1. An image-to-text parser capable of extracting structured data from source images.
2. An LLM/copilot integration that can enrich the extracted text with contextual metadata.
3. A validation loop with Jules to confirm the enrichment meets downstream requirements.

Without these components, downstream automation (including the $10k/month → $10M revenue pipeline dependencies on OSINT and automated product tooling) cannot advance.

## Scope
- Implement image-to-text parser module.
- Wire parser output into LLM/copilot enrichment step.
- Produce structured WR enrichment records.
- Provide validation harness for Jules to sign off.

## Out of Scope
- Full production deployment (tracked separately).
- Downstream consumer refactors beyond the enrichment contract.

## Dependencies
- Access to source image corpus.
- LLM/copilot API credentials.
- Jules availability for enrichment validation review.

## Related
- PR #15045
- Tracking issue #16062

---

## Definition of Done

This section defines the explicit, measurable acceptance criteria required to close issue #15041. All items MUST be satisfied and evidenced (linked PRs, test runs, screenshots, or reviewer sign-off) before the issue is marked complete.

### 1. Functional Requirements

#### 1.1 Image-to-Text Parser
- [ ] Parser accepts supported input formats: PNG, JPEG, PDF (single- and multi-page), and WebP.
- [ ] Parser produces structured text output conforming to the documented schema (`schemas/wr-parser-output.json`).
- [ ] Character-level accuracy ≥ **97%** on the curated validation set (see `tests/fixtures/wr-parser/`).
- [ ] Field-level extraction accuracy ≥ **95%** for required WR fields (title, identifier, timestamp, body, attachments metadata).
- [ ] Parser handles rotated (90°/180°/270°) and moderately skewed (±15°) images without accuracy dropping below 90%.
- [ ] Graceful failure: unsupported or corrupt inputs return a structured error rather than crashing.

#### 1.2 LLM / Copilot Enrichment
- [ ] Enrichment step consumes parser output and emits an enriched WR record conforming to `schemas/wr-enriched.json`.
- [ ] Enrichment includes: entity extraction, category/tag assignment, summary (≤ 280 chars), and confidence scores per field.
- [ ] LLM output is deterministic given fixed seed/temperature settings used in tests (temperature ≤ 0.2 for validation runs).
- [ ] Hallucination guard: any field not supported by source text is flagged with `confidence < 0.5` and `source_span = null`.
- [ ] Rate limiting, retry with exponential backoff, and API error handling are implemented.

### 2. Integration Criteria

- [ ] End-to-end pipeline (image → parser → LLM enrichment → WR record) runs via a single CLI entry point: `wr-enrich <input>`.
- [ ] Jules has reviewed at least **25 sampled enriched records** and signed off in writing (comment on this issue or PR #15045).
- [ ] Enrichment output validates against the WR consumer contract (schema validation passes in CI).
- [ ] Feature flag / config toggle allows enabling the new pipeline without breaking existing WR flows.

### 3. Testing Requirements

#### 3.1 Unit Tests
- [ ] ≥ **85%** line coverage across parser and enrichment modules.
- [ ] All public functions have at least one positive and one negative test case.
- [ ] Schema validation tests for both parser output and enriched records.

#### 3.2 Integration Tests
- [ ] End-to-end test suite exercises the full pipeline on the fixture corpus.
- [ ] Mocked LLM tests confirm prompt construction, retry logic, and error propagation.
- [ ] Live LLM smoke test (gated behind an env flag) runs in nightly CI.

#### 3.3 Acceptance Tests
- [ ] Jules-approved acceptance checklist executed against the release candidate.
- [ ] Regression suite compares outputs against a golden fixture set; diffs must be reviewed and approved.
- [ ] Performance acceptance: parser + enrichment completes within **10 seconds per single-page image** on the reference runner.

### 4. Documentation and Code Review

- [ ] `README.md` in the parser/enrichment module documents: setup, configuration, CLI usage, supported formats, and troubleshooting.
- [ ] Architecture diagram added to `docs/wr-enrichment-architecture.md`.
- [ ] Prompt templates and versioning strategy documented in `docs/wr-enrichment-prompts.md`.
- [ ] CHANGELOG updated.
- [ ] PR #15045 (and any follow-ups) reviewed and approved by at least **two** maintainers, one of whom is Jules or a Jules-designated reviewer.
- [ ] All CI checks pass on the merge commit.

### 5. Performance and Quality Metrics

- [ ] Throughput: pipeline sustains ≥ **6 images/minute** on the reference runner.
- [ ] p95 latency per image ≤ **12 seconds** (parser + enrichment combined).
- [ ] Error rate on the validation corpus ≤ **2%** (hard failures) and ≤ **5%** (low-confidence outputs).
- [ ] Cost per enriched record tracked and reported; must be within the budget documented in `docs/wr-enrichment-cost-model.md`.
- [ ] Observability: structured logs, metrics (counts, latency, error rates), and traces emitted for each pipeline stage.

### 6. Sign-off

- [ ] Engineering lead sign-off.
- [ ] Jules sign-off on enrichment quality.
- [ ] Product/stakeholder sign-off on the acceptance demo.

Only when every checkbox above is checked (or explicitly waived with written justification linked in this issue) may issue #15041 be closed.
