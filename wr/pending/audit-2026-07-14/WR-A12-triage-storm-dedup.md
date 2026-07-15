# [WR] P2 — Triage storm: weekly-research + triage bots post 3x duplicate comments per issue

## Title
[WR] Dedup bot comments per issue — one triage, one tracker, one greeting; update-in-place after that

## Description
**Problem (observed live, issue #16054).** Within ~3 minutes one WR received: 3× "Automated Triage" comments, 3× "Research Progress Tracker" comments, 3× "Weekly Research task detected" greetings, plus both a "WR PR Created" and two "WR PR Creation: Skipped" notices. The weekly-research workflow evidently fired on multiple issue events (opened + labeled + edited) without an already-commented guard. This is the VEINS alert-storm failure class (see learnings.md 2026-07-07) recurring one layer up — and at 78 scheduled workflows (WR-A8) this noise also burns Actions minutes.

**Fix.** (1) In weekly-research.yml and the triage workflow: before posting, search existing comments for the bot's own marker (e.g. `<!-- wr-triage-v1 -->`); if found, UPDATE that comment instead of creating a new one (the Progress Tracker already claims "this comment will be updated" — make it true). (2) Gate multi-event triggers: run full triage on `opened` only; on `labeled`/`edited` run only if the marker comment is absent. (3) The PR-creation lane must not post both "Created" and "Skipped" for the same run family — short-circuit the skip notice when a create succeeded in the same event window.

**Acceptance.** Open a test WR: exactly one triage comment, one tracker comment, one greeting; subsequent label/edit events update in place; zero contradictory Created+Skipped pairs.

## Agent learning note
Hidden-marker dedup must exist at EVERY layer that posts (VEINS lesson, reapplied): an issue-creating gate does not protect comment-posting workflows. "This comment will be updated" is a contract — if the workflow can't find its own prior comment, that contract is broken and the fix is search-then-update, not post-again.

Assignee: Coder | Labels: P2, hygiene, cost
