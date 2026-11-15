<!--
  Rules live in AGENTS.md at the repo root. The old long template is kept at legacy/.github/pull_request_template.md.
  Open this PR as a DRAFT and assign midnghtsapphire (C1).
-->

Closes #<!-- WR issue number -->

## Summary

<!-- One paragraph: what this PR does and why. -->

## Live test surface (D1, D2)

<!-- A page Audrey can click, even for an API, CLI or MCP. Local run, tunnel, preview or hosted all count. If no host exists, give the local run command and add a BOM row. -->

- Where: 
- How to run it: 

## BOM: what is paused, not failed (C4)

<!-- Missing data, API, secret or host: one row each on the BOM "Audrey to get" list. Write "none" if nothing is missing. -->

- 

## Checks (C3)

- [ ] Opened as a draft, assigned to midnghtsapphire
- [ ] CircleCI green
- [ ] No secret in the diff (B4)
- [ ] Nothing deleted, no force-push (B1, B3)
- [ ] Fake data, if any, is labeled and dev-only, and none is in Linear A work (B10)
- [ ] `LEDGER.md` and `CHANGELOG.md` updated in the same commit (C7)
- [ ] Deliverables checklist (D3): done, or N/A (scope pending Audrey)

## PR Deliverables (proposed scope, Audrey to confirm)

<!-- See docs/PR_DELIVERABLES.md. Applies to product and app work. Docs-only, chore, standards and bot-ops PRs: tick N/A and say why.
     A "blocked on BOM" row never fails this PR: list the missing hosting, secret or data on the BOM "Audrey to get" list and ship the rest. -->

- [ ] N/A: not a qualifying PR (reason: )
- [ ] GitHub Action or Docker package, with a live test surface (or "blocked on BOM" row)
- [ ] GitHub App or app, with a live test surface (or "blocked on BOM" row)
- [ ] CLI, with a live test surface (or "blocked on BOM" row)
- [ ] MCP server, with a live test surface (or "blocked on BOM" row)
- [ ] API, with a live test surface (or "blocked on BOM" row)
- [ ] Skill (`SKILL.md`)
- [ ] Tool, with a live test surface (or "blocked on BOM" row)
- [ ] 3 sellable PDFs, drawn from the group above or new
- [ ] `DELIVERABLES.md` lists all ten rows (built, or blocked on BOM with a link to the BOM row)

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

## Estimated Effort

<!-- Actual effort vs. estimate. -->

- **Estimated:** {e.g., 3-5 days}
- **Actual:** {e.g., 4 days}

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
- [ ] No scaffolding: no deferred work markers, no raw `[placeholders]`, no `coming soon`
- [ ] No orphaned artifacts: every file is referenced and used
- [ ] Research brief is attached and tiered
- [ ] Agent scorecard updated (if applicable)
- [ ] LEDGER.md updated in same commit
- [ ] CHANGELOG.md updated in same commit
- [ ] Library/ updated in same commit (if new sources)

## Deferred Items (if any)

<!-- Explicitly list anything intentionally deferred. Link to follow-up WR. -->
## Notes for Audrey

- 

Rules: [`AGENTS.md`](../AGENTS.md)
