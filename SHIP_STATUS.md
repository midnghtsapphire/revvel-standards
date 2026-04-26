# Ship Status

> Machine-readable tracking of every active workstream with terminal states.
> Updated by agents before declaring done. Nothing sits in limbo.

## Format

| Artifact | Active States | Terminal States |
|----------|--------------|-----------------|
| Proposal | `active`, `review`, `implementing` | `shipped`, `rejected`, `superseded` |
| PR | `open`, `changes-requested` | `merged`, `closed` |
| Issue | `open`, `in-progress` | `closed`, `wontfix`, `duplicate` |
| Task | `todo`, `in-progress` | `done`, `blocked` |

## Active Workstreams

### Proposals

| ID | Title | Status | Owner | Last Touched | Deadline |
|-----|-------|--------|------|------------|----------|
| P001 | field-work extraction & PDF products | active | @midnghtsapphire | 2026-04-20 | 2026-05-01 |

### PRs

| ID | Title | Status | Owner | Last Touched |
|-----|-------|--------|------|------------|
| #311 | ship-everything structure | open | @devin | 2026-04-20 |

### Issues

| ID | Title | Status | Owner | Last Touched |
|-----|-------|--------|------|------------|
| #251 | add pytest-mock | open | — | 2026-04-01 |

### Tasks

| ID | Title | Status | Owner | Last Touched |
|-----|-------|--------|------|------------|
| TBD | Enable revvel-standards Pages | todo | @midnghtsapphire | — |

---

## Terminal State Definitions

| Type | Terminal | Description |
|------|----------|-------------|
| Proposal | shipped | Decision made, work spawned |
| Proposal | rejected | Declined with rationale |
| Proposal | superseded | Replaced by newer proposal |
| PR | merged | Code landed |
| PR | closed | Withdrawn or declined |
| Issue | closed | Resolved |
| Issue | wontfix | Accepted as won't fix |
| Issue | duplicate | Duplicate of another |
| Task | done | Completed |
| Task | blocked | Waiting on dependency |

## Update Rules

- Update `Last Touched` before declaring done
- All artifacts must reach terminal state
- Proposals: update in `docs/proposals/[status]/`
- PRs: link to issue/PR ID
- Issues: use labels for tracking
