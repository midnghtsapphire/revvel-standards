# Fleet Controller — the grid scheduler over every orchestrator

The controller is a **grid-level scheduler** for the automation fleet, borrowing
the CUDA execution model ([Oxford CUDA course, lec 3](https://people.maths.ox.ac.uk/gilesm/cuda/lecs/lec3.pdf)):
a device runs many SMs, each running many blocks of warps, and a scheduler
watches occupancy and **evicts warps that stall** so others make progress.

| CUDA | Fleet |
| --- | --- |
| Grid scheduler | **Fleet Controller** (this) |
| Thread block on an SM | An **orchestrator** (research orchestrator, twin/triplet run, any fleet workflow) |
| Warp / thread | An **arm / agent** inside an orchestrator |
| Evict a stalled warp, schedule a replacement | **Cut + reassign** a stalled orchestrator to the next LLM |

## What it does

1. **Discover** — scans `in_progress` (orchestrators) + `queued` (triggers)
   workflow runs via the GitHub API.
2. **Monitor** — classifies each run's health from its heartbeat:
   - `healthy` — running within budget,
   - `stalled` — no update for ≥ `stallMs` (default **15 min**, mirroring the
     orchestrator's soft cutoff),
   - `runaway` — running ≥ `maxRunMs` (default **60 min**, over budget),
   - `queued` / `done`.
3. **Cut + reassign** — a stalled/runaway orchestrator is **cancelled and
   re-launched on its next fallback LLM** (not just killed), up to `maxReassigns`
   (default **2**) times.
4. **Escalate** — once the model chain / cap is exhausted, it stops re-launching
   and hands the orchestrator to **self-healing** via the ingestion feed.
5. **Protect** — it **never** cuts the fleet's own immune system or itself
   (`self-healing`, `repo-self-healer`, `fleet-controller`, `agent-monitor`,
   `secret-persistence-guard`, `biome-*`). The scheduler never kills the scheduler.

## Credit-free & fail-open by design

- **Credit-free** — GITHUB_TOKEN only (the shared BIOME `gh` helper). No
  OpenRouter / Anthropic / paid key is ever required, so it keeps scheduling even
  when Doppler wipes the AI-lane secrets.
- **Fail-open** — any error is caught and the process still exits `0`. A broken
  controller can never wedge the fleet — it is *always there, and always fails
  open*.
- **Preemption is gated** — cutting/reassigning only happens when
  `CONTROLLER_PREEMPT=1` (set by the scheduled workflow). A manual
  `workflow_dispatch` with `preempt: false` does a **dry scan** (reports the cuts
  it *would* make as `would-cancel`).

## Feeds (what Lovable / self-healing read)

Written to `docs/controller/` every run and committed back by the workflow:

| File | Schema | Consumer |
| --- | --- | --- |
| `controller-status.json` | `fleet-controller/v1` | Lovable monitor — occupancy, per-orchestrator health, planned/applied cuts + reassignments |
| `controller-stop.json` | `fleet-controller-stop/v1` | An **in-process** orchestrator reads this at its `onSoftBudget` tick to self-halt (the "signal stop" half of preemption) |
| `controller-ingestion.json` | `fleet-controller-ingestion/v1` | **Self-healing** — orchestrators that exhausted reassignment and need the heal loop |

## As a node for self-healing ingestion

The controller is also a Node module the self-healing loop can ingest directly —
no subprocess, no side effects:

```js
const { ingest } = require('./scripts/controller/controller');
const { needs_healing } = await ingest(); // read-only scan; no cancel, no dispatch
// hand needs_healing[] to the heal loop (file [SELF-HEAL] WRs, route, …)
```

The pure decision core is also importable on its own (`scripts/controller/core.js`)
— `evaluate(runs, nowMs, opts)` returns `{ classified, preemptions, feed, stop,
ingestion }` with no I/O, so any runtime can reuse the scheduling logic.

## Running

```bash
# dry scan (no cancels) — writes the feeds to ./docs/controller:
node scripts/controller/controller.js

# real scheduling (cut + reassign):
CONTROLLER_PREEMPT=1 GITHUB_TOKEN=… node scripts/controller/controller.js
```

The cron workflow (`.github/workflows/fleet-controller.yml`) runs every 15 min
(`actions: write` to cancel/dispatch, `contents: write` to commit the feed).

## Tuning

Defaults live in `scripts/controller/core.js` `DEFAULTS` (`stallMs`, `maxRunMs`,
`occupancyCap`, `maxReassigns`, `protectedRe`) and `DEFAULT_MODEL_CHAIN` (the
fallback LLMs a cut orchestrator is reassigned through).
