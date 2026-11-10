<!--
  PULL REQUEST TEMPLATE — Mirrors WR field-for-field
  Jules normalizes WR + PR text to canonical voice.
  This template enforces the mirror so normalization is deterministic.

  RULE: Every field in the WR must have a corresponding section here.
  RULE: No field may be omitted. N/A must state a reason.
  RULE: Agents never merge their own PRs. Owner review required.
-->

## WR Link

Closes <!-- WR issue number -->

## WR Class

<!-- bug | style | docs | product | research | infrastructure | compliance | security -->

## Summary

<!-- One paragraph: what does this PR do? Outcome-oriented, not process-oriented. -->

## Changes

<!-- Bullet list of every file changed and why. Link to specific lines where helpful. -->

- 

## Research Findings (Tiered)

<!-- Copy from WR. Every claim backed by citation. -->

### A1 — Proven (>95%)
- 

### A2 — Established (80-95%)
- 

### B2 — Emerging (60-80%)
- 

### B3 — Speculative (<60%)
- 

## Approach

<!-- Design decisions, alternatives considered, why this approach. -->

## Artifact Checklist

<!-- Check every artifact this PR produces. Unchecked = not delivered. -->

- [ ] Code — implementation complete, no scaffolding
- [ ] Tests — unit + integration, all passing
- [ ] Docs — README, API reference, inline comments updated
- [ ] Monitoring — metrics, alerts, logs where applicable
- [ ] Ops — deployment notes, rollback plan, runbook entry
- [ ] Skills — SKILL.md for agent reuse (if agent-facing)
- [ ] MCP manifest — updated (if agent-facing)
- [ ] OpenAPI spec — updated (if API change)
- [ ] PDF / booklet — generated (if user-facing product)

## Validation

<!-- How do you know this works? Evidence required. -->

### Test Evidence
- [ ] CI passes (link to run)
- [ ] New tests added: <!-- count --> tests, <!-- coverage -->% coverage
- [ ] Manual verification: <!-- what was tested, on what environment -->
- [ ] Screenshots / recordings: <!-- attach or link -->

### Regression Check
- [ ] Existing tests still pass
- [ ] No breaking changes to public API
- [ ] Database migrations are backward-compatible (if applicable)

## Risks & Mitigations

<!-- Updated from WR. Any new risks discovered during build? -->

| Risk | Status | Mitigation Applied |
|------|--------|-------------------|
| | | |

## Checkpoint Status (if checkpoint-gated)

<!-- Only for Grid PRs. Which Block is this? -->

- [ ] Block N of M
- [ ] Previous Blocks merged: <!-- list -->
- [ ] This Block is complete (no scaffolding for future Blocks)
- [ ] Owner approval received (`checkpoint-approved` or `next` comment)

## Self-Healing Log

<!-- Any failures encountered and fixed during this PR? -->

| Failure | Root Cause | Fix | Prevention |
|---------|-----------|-----|------------|
| | | | |

## Learnings — What & Why

<!-- What was learned and why it matters. Not just what changed. -->

- **What:** 
- **Why:** 
- **Source:** <!-- link to docs, issue, or experiment -->

## Checklist (Hard Gates)

<!-- These are enforced by wr-lint.mjs. Red = PR blocked. -->

- [ ] Closes #N is present so the issue auto-closes on merge
- [ ] No hardcoded secrets or credentials (verified by `secrets-health-check.yml`)
- [ ] PR title uses conventional-commit format (`feat:`, `fix:`, `docs:`, `chore:`, etc.)
- [ ] WR scope is delivered in full — no deferred items without explicit documentation above
- [ ] No scaffolding: no `TODO`, no `FIXME`, no raw `[placeholders]`, no `coming soon`
- [ ] No orphaned artifacts: every file is referenced and used
- [ ] Research brief is attached and tiered
- [ ] Agent scorecard updated (if applicable)
- [ ] LEDGER.md updated in same commit
- [ ] CHANGELOG.md updated in same commit
- [ ] Library/ updated in same commit (if new sources)

## Deferred Items (if any)

<!-- Explicitly list anything intentionally deferred. Link to follow-up WR. -->

- 

## Review Notes for Owner

<!-- Anything the owner should know before reviewing. -->

- 
