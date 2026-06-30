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
  "synthesis": { "completed": 1, "pending": 1, "answers": [], "citations": [], "note": "…" }
}
```

## Running

```bash
cd products/rnd-research-fleet
# Demo with a stubbed dispatch (no API key needed) — writes a checkpoint + handoff:
ORCH_OUT_DIR=/tmp/orch npm run orchestrate -- "your research question"

# Live: spawn the real runners (needs a funded OPENROUTER_API_KEY):
ORCH_LIVE=1 OPENROUTER_API_KEY=… ORCH_OUT_DIR=/tmp/orch npm run orchestrate -- "your research question"
```

## Live wiring (`dispatch-arms.js`)

The twin/triplet/deep-search runners keep their network orchestration under
`if (require.main === module)` and emit their result on **stdout** (twin/triplet
print an eval-compatible JSON report; deep-search prints the answer text). They
expose no in-process run function, so `dispatch-arms.js` drives them the way
they're built to be driven — as a **subprocess**:

- `makeDispatch(query, opts)` returns a `dispatch(arm, ctx)` that spawns the
  runner for `arm.kind` (`'single'` → `deep-search-router.js`, `'twin'` →
  `twin-search.js`, `'triplet'` → `triplet-search.js`), streams `onProgress` on
  every stdout/stderr chunk, and **SIGTERMs the child when `ctx.signal` aborts** —
  so the orchestrator's stall/stop genuinely cuts a live arm.
- `parseRunnerOutput(kind, stdout)` normalizes a runner's output to the
  `{answer, citations, cost_usd}` arm-result shape (pure; tested without network).
- Per-arm model overrides map to what each runner reads: `single` → a
  `--profile` argv (`deep-search-router.js` `ROUTING_PROFILES`); `twin`/`triplet`
  → `TWIN_MODEL_A` / `TRIPLET_MODEL_1` env. Fallbacks reassign through
  `profileModels` exactly as for any arm.

`dispatch` is handed a **frozen read-only `{id, model, kind}` view**, never the
live arm, so a misbehaving runner adapter can't corrupt orchestrator state.

**Runners that aren't merged yet are skipped, not crashed.** The `ORCH_LIVE`
CLI keeps only the candidate arms whose runner script actually exists on the
branch (logging any it skips), so today it runs the `single` deep-search arm and
the `twin`/`triplet` arms auto-activate once their PRs land — additive, no hard
dependency on the unmerged twin/triplet PRs.

## Tests

`tests/research-orchestrator.test.js` covers the pure logic (stall detection,
fallback selection, budget state, progress rollup, incremental merge, and the
checkpoint/handoff shape) plus driver integration cases: reassign-on-reject,
`armSpecs` validation, the stale-dispatch race guard, soft-budget `stop`, and
that a `stop` does not reassign an arm whose dispatch rejects on abort.
`tests/dispatch-arms.test.js` covers the live adapter — output parsing for each
runner kind, progress streaming, abort-kills-the-child, and graceful failure —
all with an injected fake `spawn` (no network).
