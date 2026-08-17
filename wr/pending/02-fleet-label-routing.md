# [WR] Fleet phase 2 — label routing + workflow instantiation (supplements #15503)

## Output Type

internal-script-automation

## Objective

Phase 1 is DONE (PR #15497): the nine pattern experts are derived from
`FLEET.yml` into `PERSONA_REGISTRY` and resolvable via `getPersona('chain')`
… `getPersona('loop')` plus aliases (`prompt-chaining`, `fleet-chain`, …).
Phase 2 makes them reachable from the WR pipeline:

1. Labels `fleet:chain` … `fleet:loop` in `.github/labels.yml`, applied by
   the orchestrator when a WR decomposes into pattern work.
2. A dispatcher workflow (or extension of `agent-dispatcher.yml`) that
   instantiates the labeled member via `instantiate(handle, { task })` and
   posts its output back to the issue.
3. Entry-point rule: `@conductor` decomposes/delegates; `@switchboard`
   classifies intake — mirroring the Agent Creator fleet manifest.
4. Mention routing: `@chain` etc. in issue/PR comments summons that member
   (same machinery as existing `@oaudrey` personas).

## Definition of Done

- A test issue labeled `fleet:critic` gets a Whetstone evaluation comment
- All nine labels defined + documented in `docs/AGENT_MONITORING_STANDARD.md`
- FLEET.yml remains the single source of truth (no copied prompts)
