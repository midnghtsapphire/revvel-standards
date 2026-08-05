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

```text
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

## CLI

`orchestrate.js` is the runnable implementation. It refuses intake without a
revenue target (Rule 4), writes a schema-valid `state.json` (Rule 3), and routes
to the correct `deliver:*` label that `ship-to-market.yml` consumes.

```bash
# From a JSON intake file
npm run engine -- --wr intake.json

# Or inline
npm run engine -- --slug cpap-mask-finder --revenue 2000 --output-type sellable-pdf

# Also run the research engine, or just preview the plan
npm run engine -- --wr intake.json --research
npm run engine -- --wr intake.json --dry-run
```

Intake fields: `intake_id`, `product_slug`, `revenue_target_monthly_usd`
(required), `goal_phase` (1-4), `output_type` and/or `shape`. `output_type`
matches the Work Request form dropdown; the orchestrator maps it to a deliver
channel (e.g. `sellable-pdf` → `deliver:pdf`, `api-product` → `deliver:api`).

## Files

- `orchestrate.js` — the runnable orchestrator CLI (`npm run engine`).
- `state.json` — runtime state per intake (schema-enforced).
- `engines/CONTRACT.md` — engine + runner interface.
- `schemas/state.schema.json` — validation.

## Invariants

- The orchestrator NEVER calls a runner directly. Only engines do.
- The orchestrator NEVER discards a revenue target.
- The orchestrator NEVER continues past a `needs_procurement` step.
