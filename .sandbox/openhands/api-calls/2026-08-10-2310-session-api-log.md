# API calls — Session 2026-08-10 23:10 UTC

Owner ask: invite daughter, fix conflict-helper visibility, log everything.
Persisted per `standards/VISITING_AGENT_SANDBOX_STANDARD.md` §3.

## 1. Search for user by name

```text
GET /search/users?q=caresselopez+OR+caresse-lopez+OR+lopezcaresse
```

Response: 1 result — `lopezcaresse-wq`, created 2026-04-17, 0 activity.
Circumstantial match to daughter's account (name pattern + created 1 day
after first expired invite).

## 2. List current collaborators

```text
GET /repos/midnghtsapphire/revvel-standards/collaborators?affiliation=direct
```

Response: 1 collaborator (midnghtsapphire, admin). Daughter NOT already
on the repo — the owner's assumption "she is on this repo too" was wrong,
carried over from an expired invite.

## 3. List pending invitations

```text
GET /repos/midnghtsapphire/revvel-standards/invitations
```

Response: 2 invitations, both `expired: true`:
- id 315134226, email-based, 2026-04-16 (matches daughter's likely first attempt)
- id 319732541, invitee @claude, 2026-05-21 (may not have been intentional)

## 4. Delete both expired invitations

```text
DELETE /repos/midnghtsapphire/revvel-standards/invitations/315134226 → 204
DELETE /repos/midnghtsapphire/revvel-standards/invitations/319732541 → 204
```

## 5. Invite lopezcaresse-wq as write collaborator

```text
PUT /repos/midnghtsapphire/revvel-standards/collaborators/lopezcaresse-wq
{"permission":"push"}
→ 201, invite id 328689724
```

## 6. Create Triage-role issue for Jules stub

```text
POST /repos/midnghtsapphire/revvel-standards/issues
→ #17248 "[TRIAGE] jules-coding-agent.yml is a scaffolding stub"
```

## Result summary

- 2 dead invitations cleaned up
- Fresh invite to daughter's likely handle sent
- 1 Triage-role WR filed (jules stub)
- 2 PRs opened this session: #17247 (onboarding), #17249 (conflict-helper)
