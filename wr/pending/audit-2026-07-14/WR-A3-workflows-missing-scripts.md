# [WR] P1 — Workflows call scripts that do not exist

## Title
[WR] Fix dead script paths in agent-fallback.yml, ship-to-market.yml, vine-to-marketplace.yml

## Description
**Problem (broken wiring).**
- `.github/workflows/agent-fallback.yml` → `scripts/call-cursor-api.sh` (missing)
- `.github/workflows/ship-to-market.yml` → `scripts/record.js` (missing)
- `.github/workflows/vine-to-marketplace.yml` → `node index.js fetch|summary|post` — no root `index.js` exists

**Fix.** For each: either restore/author the script, point at the correct existing path, or comment-out per COMMENT-DONT-DELETE standard with a WR reference. Then extend automation-doctor to statically verify every `run:` file path resolves (it can, once WR-A1 lands).

**Acceptance.** All three workflows dry-run past the script-invocation step; automation-doctor gains a `--paths` check that would have caught these.

## Agent learning note
Workflows fail at *runtime*, often on cron at 3am, when the file they call was renamed at *review time*. Static path resolution in CI turns a runtime failure class into a review-time failure class — always prefer moving failures leftward.

Assignee: Devin | Labels: P1, wiring, actions
