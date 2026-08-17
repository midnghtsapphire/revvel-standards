# [WR] P2 — Self-heal loop steps 4 & 6 are manual despite CLAUDE.md documenting them as automatic

## Title
[WR] Automate self-heal-pr.yml + reset-self-heal-issue.yml, or fix the docs — close the docs/reality gap

## Description
**Problem (found by parallel Claude Code session, 2026-07-14; verify against live HEAD before fixing).** CLAUDE.md documents an automatic self-healing loop, but its steps 4 (`self-heal-pr.yml`) and 6 (`reset-self-heal-issue.yml`) are 100% manual (workflow_dispatch only). Docs advertising automation that doesn't exist is the drift class this repo has already been burned by (stale AUTOMATION_AUDIT.md, stale OAUDREY_DEPLOYMENT_STANDARD.md, reviewer-roster comments advertising bots that no-op).

**Fix.** Decide per step, then make docs and reality agree:
- If automation is wanted: wire step 4 to trigger on the self-heal issue's ready label, step 6 on PR-merged of the self-heal PR; keep a manual dispatch override. Guard with the WR-A12 dedup marker + concurrency group so the loop can't storm.
- If manual-by-design (checkpoint gating): update CLAUDE.md to say so explicitly, with the dispatch commands inline.
Either way add a docs-freshness assertion: a tiny test greps CLAUDE.md's loop table against the actual `on:` triggers of the named workflows and fails on mismatch.

**Acceptance.** CLAUDE.md's loop description matches the workflows' real triggers, enforced by a test; a dry-run of the full loop completes without undocumented manual steps (or with documented ones only).

## Agent learning note
Docs are load-bearing for an agent fleet — agents plan against them. A documented-automatic-but-actually-manual step doesn't just confuse humans; it makes agents wait forever for an event that will never fire. Make docs assertions, not prose: if a doc claims a trigger, a test should verify the trigger exists.

Assignee: Jules + Dragnet | Labels: P2, docs-drift, self-healing, wiring
