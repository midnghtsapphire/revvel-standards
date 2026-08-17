# [WR] Client contract fleet — hook into any client stack and do the work

## Output Type

internal-script-automation

## Objective

Enable paid contract engagements: client says "we do C# / .NET" (or any
stack) and the fleet plugs in and works. Deliver an engagement kit:

1. **Stack detection**: point at a client repo/backend and produce a stack
   profile (language, framework, test runner, CI, package manager) — the
   Agent Creator's matching approach, aimed outward.
2. **Polyglot lanes**: per-stack prompt packs + verify commands (C#/.NET,
   Java, Python, TS, PHP…) so the coding lane emits idiomatic code and runs
   the CLIENT'S tests, not ours. Stored as skills (`skills/client-stacks/`).
3. **Integration tiers**, cheapest first: (a) API-only (their REST/Graph
   APIs, e.g. Microsoft Graph for email cleanup), (b) repo-level (fork/PR
   into their GitHub/Azure DevOps), (c) fleet-in-their-infra (deploy our
   workflow pack into their org with scoped tokens).
4. **Remedial-work menu**: email triage/cleanup, data hygiene, backlog
   grooming, dependency updates — productized as WR templates with fixed
   pricing hooks (ties into ship-to-market payment rails WR).
5. **Isolation rules**: client secrets NEVER enter our repo; per-client
   secret scope; audit log of every action taken in client systems.

## Definition of Done

- One reference engagement runs end-to-end against a sample .NET repo:
  stack detected, task executed, client-style PR opened, action log emitted
- Engagement checklist + contract-scoped security rules documented
