# Runner Orchestrator

The **Runner Orchestrator** is the top-level dispatcher in the Revvel Execution OS. It owns `state.json`, routes intake to engines, and enforces the Procurement BOM rule.

## Responsibilities

1. **Ingest** new items from `docs/inbox/` matching `TEMPLATE.md` frontmatter.
2. **Validate** revenue target and goal phase — refuse intake without them.
3. **Initialize** `state.json` per intake, validated against `schemas/state.schema.json`.
4. **Dispatch** to the engine declared in `route_to_engine` (or routing engine if absent).
5. **Persist** engine outputs as steps; chain to `next_engine` until `status = done`.
6. **Halt on BOM.** If any engine or runner returns `needs_procurement`, set state status to `needs_procurement`, write the BOM, and stop.

## State Flow

```
intake (inbox)
   │
   ▼
orchestrator.init() ──► state.json (status=routed)
   │
   ▼
engine.run() ──► artifacts | next_engine | runner_calls | bom
   │                                          │
   │                                          ▼
   │                                    runner.execute()
   │                                          │
   │                                  result | bom
   ▼
state.append_step(...) ──► validate against schema
   │
   ▼
if bom → status=needs_procurement, STOP
else if next_engine → loop
else → status=done
```

## Supported Runner Targets

See [`docs/standards/RUNNER_TARGETS.md`](../../docs/standards/RUNNER_TARGETS.md).

## Files

- `state.json` — runtime state per intake (schema-enforced).
- `engines/CONTRACT.md` — engine + runner interface.
- `schemas/state.schema.json` — validation.

## Invariants

- The orchestrator NEVER calls a runner directly. Only engines do.
- The orchestrator NEVER discards a revenue target.
- The orchestrator NEVER continues past a `needs_procurement` step.
