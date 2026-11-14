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

## Notes for Audrey

- 

Rules: [`AGENTS.md`](../AGENTS.md)
