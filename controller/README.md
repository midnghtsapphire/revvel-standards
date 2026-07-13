# Fleet Controller — the grid scheduler over every orchestrator

> **Governance:** `standards/CONTROLLER_CHARTER.md` — mission, authority,
> limits, testable invariants, and model policy. Changes to controller
> behavior must keep the charter, code, and tests in agreement.

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

- **Credit-free** — no paid API key is ever required (no OpenRouter / Anthropic),
  so it keeps scheduling even when Doppler wipes the AI-lane secrets. It uses the
  free `GITHUB_TOKEN` via the shared BIOME `gh` helper, with the repo-standard
  `ADMIN_GITHUB_TOKEN` fallback when present — needed so a re-dispatch can
  actually trigger the target workflow (the default `GITHUB_TOKEN` can't trigger
  other workflows; see CLAUDE.md gotcha #2).
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
| `controller-state.json` | `fleet-controller-state/v1` | **The controller itself** — the durable reassignment scoreboard (see below) |

## The scoreboard and the heartbeat (2026-07-10 convergence fixes)

Two failure modes made the controller *look* broken — it thrashed instead of
converging:

1. **Amnesia loop.** Reassignment history used to live only inside the last
   feed's `preemptions` array. One quiet tick (fresh relaunches are young and
   healthy) emptied that array, wiped the history, and the next stall restarted
   the model chain from step 1 — `reassign_count: 1` forever, never reaching
   `maxReassigns`, never escalating to self-healing. The fix is a **durable
   scoreboard** (`controller-state.json`) keyed by workflow path, carried
   forward across ticks regardless of what the current tick preempted, expiring
   `STATE_TTL_MS` (6h) after a workflow's last cut so recovered workflows get a
   clean slate. CUDA framing: the warp scheduler's scoreboard must outlive the
   current issue cycle, or eviction can never converge.
2. **False stalls.** A run's `updated_at` does not tick while one long step
   executes, so a legitimately slow research step read as "stalled" and was cut
   every 15 minutes while healthy. Before evicting a *stalled* run (runaways are
   cut regardless), the driver now checks the run's **jobs/steps heartbeat**
   (`lastJobActivityMs`) — recent step activity spares the run
   (`cut: 'spared(step-progress)'` in the feed; spared runs never reach the stop
   signal or the ingestion feed). Check the warp's scoreboard before eviction:
   an in-flight op that recently issued is not a stall.

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
