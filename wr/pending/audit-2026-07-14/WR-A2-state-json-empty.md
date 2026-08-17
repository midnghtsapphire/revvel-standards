# [WR] P0 — state.json is `{}`: state engine not persisting (issue-13555 still live)

## Title
[WR] Restore state engine writes to state.json + add non-empty schema guard

## Description
**Problem.** Root `state.json` contains `{}`. Open issue-13555 ("state engine failing") predicted this; it has not been fixed. Any workflow or agent reading fleet state gets nothing; `tests/state-schema.test.js` was also failing (masked by WR-A1's missing `ajv`).

**Fix.** (1) Land WR-A1 so state-schema tests actually run. (2) Trace the writer (engines/runner-orchestrator + scripts writing state) and confirm it commits state back. (3) Add a CI guard: fail if state.json is empty when the state-writing workflow reports success.

**Acceptance.** state.json populated per schemas/, guard test green, issue-13555 closed with root cause documented in learnings.md.

## Agent learning note
An empty-but-valid file is worse than a missing file — everything "works" while carrying no data. Guards must assert *content invariants*, not just parseability.

Assignee: Dragnet + GOAP | Labels: P0, state-engine
