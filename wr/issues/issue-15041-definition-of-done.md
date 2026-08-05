# Definition of Done — Issue #15041 (Priority 1 Blocker)

> Companion document that fills the missing Definition of Done for
> `wr/issues/issue-15041-priority-1-blocker-before-jules-there-needs-to-be-.md`.
>
> This DoD MUST be satisfied before the WR enrichment parser and LLM/copilot
> integration can be handed off to Jules or merged into `main`.

---

## 1. Functional Requirements

### 1.1 Image-to-Text Parser
- [ ] Parser accepts PNG, JPG/JPEG, WEBP, and PDF inputs.
- [ ] Parser returns structured JSON: `{ text, blocks[], confidence, source_meta }`.
- [ ] OCR/vision accuracy ≥ **95%** character-level on the WR golden fixture set
      (`wr/fixtures/golden/*`).
- [ ] Deterministic output for identical inputs (stable ordering of `blocks`).
- [ ] Graceful failure: returns `{ error, retryable: bool }` — never throws
      uncaught exceptions to the caller.

### 1.2 LLM / Copilot Integration
- [ ] LLM call is behind a provider-agnostic interface (OpenRouter primary,
      OpenHands fallback, manual queue as final fallback).
- [ ] Prompt templates are versioned in `wr/prompts/` with a `version` field.
- [ ] Output validated against a JSON schema before being written to WR.
- [ ] Token/cost budget enforced per call; overflow → truncation + warning log.

### 1.3 WR Enrichment Pipeline
- [ ] Enrichment writes to WR via the existing WR client (no direct DB writes).
- [ ] Idempotent: re-running on the same input produces no duplicate records.
- [ ] Emits structured events: `wr.enrich.started`, `wr.enrich.completed`,
      `wr.enrich.failed`.

---

## 2. Integration Criteria (Jules Handoff)

- [ ] End-to-end run on Jules' sample batch produces WR entries that Jules
      signs off on in writing (comment on PR #15045).
- [ ] Runbook published at `wr/docs/runbooks/enrichment.md`.
- [ ] Rollback procedure documented and tested in staging.
- [ ] Feature flag `wr.enrichment.v1` gates the new pipeline in production.

---

## 3. Testing Requirements

### 3.1 Unit Tests
- [ ] ≥ **85%** line coverage on parser and enrichment modules.
- [ ] Every public function has at least one happy-path and one error-path test.

### 3.2 Integration Tests
- [ ] Parser → LLM → WR client round trip exercised with mocked LLM.
- [ ] Provider failover path tested (OpenRouter down → OpenHands used).

### 3.3 Acceptance Tests
- [ ] Golden fixture suite passes in CI.
- [ ] Jules' sample batch passes with zero P1/P2 defects.
- [ ] Performance test: p95 end-to-end latency ≤ **8s** per image.

---

## 4. Documentation & Code Review

- [ ] README updated in `wr/` describing the new parser and enrichment flow.
- [ ] API reference generated (docstrings on all public symbols).
- [ ] CHANGELOG entry under the next release heading.
- [ ] At least **two** approving reviews on PR #15045, one from a WR owner.
- [ ] All CI checks green; no `TODO`/`FIXME` left in touched files without
      a linked follow-up issue.

---

## 5. Quality & Performance Metrics

| Metric                              | Target        | Measured In              |
|-------------------------------------|---------------|--------------------------|
| OCR character accuracy              | ≥ 95%         | Golden fixture eval      |
| LLM JSON-schema validity rate       | ≥ 99%         | Production sample (24h)  |
| End-to-end p95 latency              | ≤ 8s / image  | Load test + prod metrics |
| Enrichment failure rate             | ≤ 1%          | Prod metrics (7d window) |
| Cost per 1k enrichments             | ≤ $2.00       | Provider billing export  |
| Duplicate WR entries introduced     | 0             | WR audit query           |

---

## 6. Sign-Off Checklist

- [ ] Engineering owner sign-off
- [ ] Jules sign-off (WR consumer)
- [ ] SRE/Ops sign-off (runbook + rollback verified)
- [ ] Product sign-off (metrics + acceptance evidence attached to PR #15045)

---

_This DoD supersedes the empty "No response" field at line 313 of
`wr/issues/issue-15041-priority-1-blocker-before-jules-there-needs-to-be-.md`.
Link this file from that issue before merging PR #15045._
