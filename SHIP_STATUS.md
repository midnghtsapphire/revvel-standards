# SHIP_STATUS.md — revvel-standards

> Machine-readable status of every workstream. Updated by humans and agents.
> Audited weekly by `ship-status-audit.yml`. Nothing sits in limbo.

## Terminal States Reference

| Artifact Type | Terminal States |
|---|---|
| Proposal | `shipped`, `rejected`, `superseded` |
| Bug | `fixed-deployed`, `wontfix-documented` |
| Feature | `deployed`, `cancelled-documented` |
| Research | `published`, `abandoned-documented` |
| Decision (ADR) | `accepted`, `rejected`, `superseded` |
| Refactor | `completed`, `abandoned-documented` |

## Active Workstreams

<!-- STATUS: active | implementing | blocked | stale -->
<!-- DEADLINE: ISO date or "none" -->
<!-- OWNER: GitHub handle or "unassigned" -->

| ID | Artifact | Type | Status | Owner | Deadline | Last Touched | Notes |
|---|---|---|---|---|---|---|---|
| RS-001 | Skills Vault system | feature | active | @midnghtsapphire | none | 2026-04-25 | 30+ skills created, REGISTRY.md exists |
| RS-002 | Fieldwork extraction proposal | proposal | active | @midnghtsapphire | none | 2026-04-25 | In docs/proposals/, needs council review |
| RS-003 | Agent Factory standard | feature | active | @midnghtsapphire | none | 2026-04-25 | Template + commands exist |
| RS-004 | Credential Gatekeeper + Doppler sync | feature | active | @midnghtsapphire | none | 2026-04-25 | PR #308 open |
| RS-005 | Ship Everything structure | feature | implementing | @midnghtsapphire | none | 2026-04-25 | This PR |

## Completed / Terminal

| ID | Artifact | Type | Terminal State | Date | Notes |
|---|---|---|---|---|---|
| RS-100 | Gap analysis quick wins | feature | deployed | 2026-04-25 | PR #300 merged |
| RS-101 | Gap analysis remaining items | feature | deployed | 2026-04-25 | PR #307 merged |
| RS-102 | Fork cleanup changelog | docs | published | 2026-04-25 | PR #309 merged |
| RS-103 | GrowlingEyes fork integration map | docs | published | 2026-04-25 | PR #310 merged |
