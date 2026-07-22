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
| P001 | field-work extraction & PDF products | active | @midnghtsapphire | 2026-04-20 | |
| P004 | Tax Navigator Agent (Odoo + multi-entity) | active | @openhands | 2026-04-25 | 2026-05-01 |

### PRs

| ID | Title | Status | Owner | Last Touched |
|-----|-------|--------|------|------------|
| #311 | ship-everything structure | open | @OpenHands | 2026-04-20 |
| #13469 | fix stuck-WR detector false escalation | open | @Cursor | 2026-05-15 |
| #13482 | life insurance lead engine | open | @Cursor | 2026-05-17 |
| #13499 | add layered research engine orchestrator | open | @Cursor | 2026-05-17 |
| #13503 | add prompt generation app | open | @Cursor | 2026-05-17 |
| #13507 | add no-key Perplexity research integration | open | @Cursor | 2026-05-17 |
| #13560 | add WR label parity and credential backup harness | open | @Cursor | 2026-05-18 |
| #13600 | add green website reporting standard | open | @Cursor | 2026-05-19 |
| #13637 | fix state schema product slug contract | open | @Cursor | 2026-05-20 |
| #13665 | productize creator payout tracker + OCR WR | open | @Cursor | 2026-05-21 |

### Issues

| ID | Title | Status | Owner | Last Touched |
|-----|-------|--------|------|------------|
| #251 | add pytest-mock | open | — | 2026-04-01 |
| #13467 | `[AUTO-ERROR] WR #13460 stuck after 3 retriggers — no PR created` | in-progress | @Cursor | 2026-05-15 |
| — | oAudrey hub deploy (DO App Platform) | in-progress | @copilot | 2026-04-26 |
| — | oAudrey retro 2026-04-28 (sites not live) | in-progress | @copilot | 2026-04-30 |
| — | oAudrey retro 2026-04-30 (sites not live) | in-progress | @copilot | 2026-05-01 |

### Tasks (In Progress)

| ID | Title | Status | Owner | Last Touched |
|-----|-------|--------|------|------------|
| T003 | Tax AI Integration (OpenRouter) | done | @openhands | 2026-04-25 |
| T004 | Automated Product Pipeline standard + skill + scaffold | in-progress | @copilot | 2026-04-27 |
| T005 | Watchdog agent repair routing | done | @cursor | 2026-05-18 |
| T007 | ColdTrace python-jose security upgrade | done | @cursor | 2026-05-15 |

### Tasks (Completed)

| ID | Title | Status | Owner | Last Touched |
|-----|-------|--------|------|------------|
| T001 | Revvel-standards Housekeeping | done | @openhands | 2026-04-25 |
| T002 | Private → Public: 74 repos with licenses | done | @openhands | 2026-04-25 |
| T005 | Music Video Creator balanced JSON parser fix | done | @cursor | 2026-05-15 |
| T006 | Music Video Creator provider polling terminal status fix | done | @cursor | 2026-05-15 |
| T008 | Music Video Creator shared API helper refactor | done | @cursor | 2026-05-15 |
| T009 | Music Video Creator Next/PostCSS security upgrade | done | @cursor | 2026-05-15 |
| T010 | ColdTrace dependency downgrade restoration | done | @cursor | 2026-05-15 |
| T011 | Affiliate Hub patched dependency restoration | done | @cursor | 2026-05-16 |
| T012 | Layered Research Engine Orchestrator | done | @cursor | 2026-05-17 |
| T013 | BASIC WR label normalization | done | @cursor | 2026-05-17 |
| T013 | Revvel PromptForge prompt generation app | done | @cursor | 2026-05-17 |
| T014 | Perplexity no-key research integration | done | @cursor | 2026-05-17 |
| T015 | WR label parity + credential backup harness + agent self-heal | done | @cursor | 2026-05-18 |
| T016 | Green website reporting standard | done | @cursor | 2026-05-19 |
| T017 | State schema product_slug contract fix | done | @cursor | 2026-05-20 |
| T018 | Creator Payout Tracker shippable product engine | done | @cursor | 2026-05-21 |
| T019 | Sessiono AI music platform - website + Vercel deploy | ⚠️ unverified | @openhands | 2026-06-09 |
| | **ALL 70 REPOS — see audit note ⚠️** | | | |

> ⚠️ **Audit 2026-06-13:** T019 (Sessiono) is marked done, but no Sessiono
> website, app code, or Vercel deploy config exists in this repo — the only
> "Sessiono" references are unrelated template boilerplate
> (see `docs/AGENTS_RETRO_REVIEW.md`). Treat T019 as **NOT shipped** until a
> real artifact lands. The "ALL 70 REPOS DONE" banner is likewise unverified.

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
