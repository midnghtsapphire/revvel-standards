# /hearingcrew-team — HearingCrew

> Backed up 2026-11-10 by Proofy. Call the whole team with `/hearingcrew-team`; it goes to the lead.

| Field | Value |
|---|---|
| Team | HearingCrew |
| Call name | `/hearingcrew-team` |
| Lead | [`/hearingorchestrator`](../hearingorchestrator/README.md) |
| Members | 4 |

## Purpose

Hearing fleet for a family member of Audrey (details intentionally not recorded here). Neurodivergent-first, WCAG AAA outputs. None of the bots diagnose.

## Routing

Send hearing tasks to HearingOrchestrator. Clinical test interpretation → Audiologist; device ideas → AidInventor; medical/lifestyle → MedicalEar.

## Members

| Call name | Bot | Role |
|---|---|---|
| [`/hearingorchestrator`](../hearingorchestrator/README.md) | HearingOrchestrator (box name: Ear - Controller) | HearingCrew lead; routes hearing tasks |
| [`/audiologist`](../audiologist/README.md) | Audiologist (box name: Ear - Audiologist) | HearingCrew clinical interpreter of hearing tests |
| [`/aidinventor`](../aidinventor/README.md) | AidInventor (box name: Ear - Inventor) | HearingCrew hearing-aid inventor |
| [`/medicalear`](../medicalear/README.md) | MedicalEar (box name: Ear - Lifestyle) | HearingCrew medical/lifestyle researcher |

## Rules

All members follow [BOT-COMMON-RULES.md](../BOT-COMMON-RULES.md) plus each bot's own rules in its README.

## How to re-create the team

1. Re-create each member from its README ("How to re-create"), lead first.
2. Tell every member who the lead is and where to report.
3. Point Audrey's requests for this team at `/hearingorchestrator`.

Privacy: the hearing fleet serves a family member of Audrey. The name and any health details are intentionally not stored in this public repo; only the bots' roles are.
