# AG-UI + A2UI Protocols — Real-Time Product Demos

Closes WR #18342.

## AG-UI (Agent↔User Interaction)
SSE/WebSocket event stream between agent backend and the browser so a visitor
watches the agent work live. Event types: `RUN_STARTED`, `STEP_STARTED`,
`TEXT_MESSAGE_CHUNK`, `TOOL_CALL`, `STATE_SNAPSHOT`, `RUN_FINISHED`.

## A2UI (Agent→UI composition)
The agent emits **declarative UI blocks** (cards, tables, charts, forms) instead
of raw text; the frontend renders them from a registry. Lets the fleet build
its own demo interface per product without hand-coding React each time.

## Where it lands
- `docs/fleet/index.html` (oaudrey front page) already shows live telemetry —
  AG-UI events feed it: `scripts/ag_ui_bridge.mjs` translates fleet-status.json
  + A2A bus events into AG-UI SSE on `/events`.
- Product demos: any project under `projects/<slug>/` can `POST /demo` to get a
  live session URL rendered from A2UI blocks.

## Contract
`docs/fleet/` = viewer. `scripts/ag_ui_bridge.mjs` = emitter. State snapshots
every 5s max, tool calls streamed as they happen.
