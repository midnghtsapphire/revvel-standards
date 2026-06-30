# R&D Research Fleet — Orchestration Standard

How the **research orchestrator** (`orchestrator.js`) monitors parallel search
arms (twin / triplet / swarm), keeps work from being lost, and decides when to
pause — a Manus-style monitor layer over the runners.

## Responsibilities

1. **Monitor + stall→reassign.** Each arm reports progress (a heartbeat as output
   streams). If an arm produces nothing for `stallMs` (default 2 min), the
   orchestrator **cuts it and reassigns** the query to the arm's next untried
   fallback model. No silent hangs.
2. **Realtime checkpoint / handoff.** Every monitor tick it writes a resumable
   **checkpoint** (`research-checkpoint/v1` JSON) + a **handoff doc** (Markdown)
   via the caller's persist hook — so a cut-off at minute 50 loses seconds, not an
   hour. The handoff doc is "read this, continue from here."
3. **Soft budget (the 15-min gateway).** At `softBudgetMs` (default 15 min) it
   asks the caller's `onSoftBudget(state)` gateway whether to `continue` or `stop`
   — instead of hard-killing. Great progress past 15 min just keeps going.
4. **Incremental synthesis.** Completed arms are merged (`mergePartials`) as they
   land — the orchestrator organizes/refines results immediately, not at the end.

## Design split

- **Runtime-agnostic core (pure, tested):** `isStalled`, `nextFallbackModel`,
  `budgetState`, `summarizeProgress`, `mergePartials`, `buildCheckpoint`,
  `buildHandoffDoc`. Identical wherever it runs.
- **Driver (`orchestrate`)** wires the core to real model calls. The caller
  supplies:
  - `dispatch(arm, { onProgress, signal })` — runs one arm; call `onProgress()` as
    output streams; honor `signal` so a cut arm can be aborted.
  - `onCheckpoint(checkpoint, handoffMd)` — where checkpoints land (git commit,
    workspace file, …).
  - `onSoftBudget(state) → 'continue' | 'stop'` — the 15-min gateway.

This split is why the same core serves both runtimes:

| Runtime | `onCheckpoint` | `onSoftBudget` |
| --- | --- | --- |
| **In-session / sandbox** (Manus-style) | write to workspace + commit | the agent genuinely asks the human and waits |
| **Headless (CI / cron)** | commit-if-changed to the repo | post a "continue? 👍" comment; auto-continue (default) or stop; resume from checkpoint next run |

## Checkpoint schema (`research-checkpoint/v1`)

```json
{
  "schema": "research-checkpoint/v1",
  "query": "…",
  "started_at": "<ISO>", "updated_at": "<ISO>",
  "soft_budget_ms": 900000, "budget_state": "within | soft-exceeded",
  "progress": { "total": 3, "running": 1, "done": 1, "stalled": 0, "failed": 0, "reassigned": 1 },
  "arms": [{ "id": "arm-1", "model": "…", "status": "running|done|failed|stalled",
             "tried_models": ["…"], "last_progress_at": 0, "has_result": true, "error": null }],
  "synthesis": { "completed": 1, "pending": 1, "answers": [], "citations": [] }
}
```

## Running

```bash
cd products/rnd-research-fleet
# Demo with a stubbed dispatch (no API key needed) — writes a checkpoint + handoff:
ORCH_OUT_DIR=/tmp/orch npm run orchestrate -- "your research question"
```

Wire `dispatch` to the twin/triplet/deep-search arms (their fallback model lists
live in `deep-search-router.js` `ROUTING_PROFILES`) to orchestrate live search.

## Tests

`tests/research-orchestrator.test.js` covers the pure logic (stall detection,
fallback selection, budget state, progress rollup, incremental merge, and the
checkpoint/handoff shape) plus two driver integration cases (reassign-on-reject,
soft-budget `stop`).
