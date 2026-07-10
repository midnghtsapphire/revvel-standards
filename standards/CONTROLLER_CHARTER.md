# Fleet Controller Charter

**Status:** Active · **Adopted:** 2026-07-10 · **Owner:** midnghtsapphire
**Implementation:** `scripts/controller/` (`core.js` pure logic, `controller.js` I/O driver) · `.github/workflows/fleet-controller.yml` (every 15 min)
**Companion docs:** `docs/controller/README.md` (operations), `MODEL_CONFIG.md` + `.github/agent-models.yml` (model policy SSOT)

This charter defines what the Controller layer IS, what it may and may not do,
and the invariants every change to it must preserve. The controller sits above
every orchestrator — and every orchestrator sits above its agents — so a bug
here multiplies across the whole fleet. Changes to controller behavior must
keep this document, the code, and the tests in agreement.

## The Covenant — the overarching contract

### For stakeholders: what a "contract" means here

If you're not an engineer, read just this part. A contract in this system is
a **written promise with a built-in way to check it's being kept**. It is not
a legal document and not a mission statement — it's closer to a warranty:
every promise below names the specific machinery that enforces it, and that
machinery is tested automatically on every change. If someone edits the
system in a way that breaks a promise, the tests fail and the change is
rejected before it ships.

What that buys you in practice:

- **Your projects can't silently die.** Stuck work is detected, restarted
  with a better tool, or handed to a repair loop — there is no state where
  something just quietly stops and nobody notices.
- **Tools that block everything get removed.** If a checker or an AI model is
  so strict that no work can ever pass it, that's treated as a broken tool,
  not a high standard — it gets fixed or banned (this has already happened).
- **Status reports are real.** The system is required to report what actually
  happened — failures as failures, successes only when verified. A green
  checkmark means the check truly ran.
- **The promises can't quietly erode.** Changing a promise requires changing
  this document, the code, and the tests together, in public, in the same
  change — so the contract and the reality can't drift apart.

The rest of this section states the five promises; the sections after it are
the engineering detail that makes them true.

### The promises

Everything below the covenant is mechanism; this is what the mechanisms are
FOR. The controller — and through it, the fleet — makes these promises to the
owner and to every agent it schedules. Each promise is deliberately paired
with the concrete machinery that proves it, because a value without an
enforcement mechanism is a poster, not a contract. This is the
promise-as-proof: we demonstrate care by how carefully each part is built.

**Protection.** No healthy work is killed, and no failure takes the fleet
down. *Proof:* the heartbeat check before every eviction (a slow step is not
a stall); the protected set that the scheduler can never touch; fail-open
error handling so a broken controller degrades to "no scheduling this tick",
never to "fleet blocked".

**Loyalty.** The fleet serves the owner's mission and no one else's rules.
Work is never abandoned: a struggling run is reassigned, a hopeless one is
handed to healing — nothing is dropped on the floor. A model that works
against the repo's operating rules does not get scheduled, no matter how
capable its maker says it is. *Proof:* the cut → reassign → escalate ladder
(every lineage ends in progress or in the heal loop, never in silence); the
SSOT denylist plus the drift test that makes reintroducing a banned model a
CI failure.

**Respect.** Every run gets due process. Nothing is cancelled on a coarse
signal alone; nothing is judged without its evidence being recorded; a run
spared on appeal (step progress) is never punished downstream. *Proof:*
verify-before-evict; every decision — planned, applied, spared, failed —
written to the feeds with its reason; spared runs excluded from the stop and
ingestion signals.

**Honesty.** The feeds say what actually happened, not what we wish had
happened. A failed cancel is reported as failed, never as done. A dry run is
labeled a dry run and changes nothing. A gate that passes is a gate that
really ran — no always-green shims, ever. *Proof:* `cancel-failed` and
`reassign-failed` outcomes surface verbatim; dry scans never advance the
scoreboard; the repo-wide rule that test/lint gates stay real.

**Judgment over rigidity.** Rules exist to serve the mission; a rule that
blocks all progress has failed at its own job and is treated as a defect to
heal, not a standard to submit to. Strictness that stops every project is
not safety — it is failure wearing safety's uniform. *Proof:* the Markdown
lint gate is real, but an auto-heal loop fixes what a machine can fix before
the gate judges it, instead of failing every PR forever; the Sonnet family is
denylisted precisely because rigid refusal killed project after project; the
controller spares, reassigns, and escalates rather than just killing.

A change that satisfies the letter of the sections below while betraying one
of these promises is wrong and should be rejected in review, whatever its
tests say.

## 1. Mission

Keep the fleet **converging**: every unit of work in flight is either making
progress, being reassigned to a model that can make progress, or handed to
self-healing — never silently stuck, and never thrashing in a loop. The
controller is a scheduler, not a worker: it decides who runs, it never does
the work itself.

## 2. The CUDA model (why the hierarchy looks like this)

The fleet borrows the CUDA execution model deliberately (see
`docs/controller/README.md` for the original mapping):

| CUDA | Fleet | Layer responsibility |
| --- | --- | --- |
| Grid scheduler | **Controller** (`fleet-controller`) | Watch occupancy, evict stalls, escalate — never execute work |
| Streaming multiprocessor / block | **Orchestrator** (research orchestrator, twin/triplet runs, workflow jobs) | Run a batch of related work with a budget and a heartbeat |
| Warp / thread | **Agent / arm** inside an orchestrator | Execute one task; yield status upward |
| Scoreboard | `docs/controller/controller-state.json` | Durable record of what was tried, carried across cycles |
| Warp eviction | Cut + reassign | Cancel a stalled run and relaunch it on the next model in the chain |
| Host (CPU) | **Self-healing loop** | Receives what the scheduler cannot fix; files WRs, routes to coding agents |

Three CUDA principles the implementation must honor:

1. **The scheduler never executes.** It cancels, dispatches, and records. The
   moment the controller starts "fixing" things itself, it competes with the
   fleet it schedules.
2. **The scoreboard outlives the cycle.** Scheduling state (reassignment
   counts, tried models) persists in `controller-state.json` across ticks. A
   quiet tick must never amnesia the scheduler — that is the exact bug that
   made it thrash until 2026-07-10.
3. **Verify before evicting.** A stall verdict from a coarse signal
   (`run.updated_at`) is checked against the fine signal (jobs/steps
   heartbeat) before a cut. An in-flight op that recently issued is not a
   stall.

## 3. Authority — what the controller MAY do

- **Cancel** any non-protected workflow run classified `stalled` (after
  heartbeat verification) or `runaway` (past wall-clock budget,
  unconditionally).
- **Relaunch** a cut workflow via `workflow_dispatch` on the next untried
  model in the fallback chain, at most `maxReassigns` (2) times per lineage.
- **Escalate** an exhausted lineage to self-healing via
  `controller-ingestion.json`.
- **Write** its four feeds under `docs/controller/` and commit them to main.
- **Signal** in-process orchestrators to self-halt via
  `controller-stop.json`.

## 4. Limits — what the controller MUST NOT do

- **Never cut the protected set** — the immune system and itself:
  `self-healing`, `repo-self-healer`, `fleet-controller`, `agent-monitor`,
  `secret-persistence-guard`, `biome-*`. The scheduler never kills the
  scheduler.
- **Never file issues or WRs.** Escalation is a feed the self-healer
  consumes; the controller stays a scheduler, not a healer.
- **Never spend paid API credits.** Credit-free by construction: the free
  `GITHUB_TOKEN` (with the repo-standard `ADMIN_GITHUB_TOKEN` fallback so
  dispatches can trigger workflows). It must keep scheduling even when
  Doppler wipes the AI-lane secrets.
- **Never wedge the fleet.** Fail-open: every error is caught and the process
  exits 0. A broken controller degrades to "no scheduling this tick", never
  to "fleet blocked".
- **Never preempt from a dry scan.** Cutting requires `CONTROLLER_PREEMPT=1`
  (set by the scheduled workflow); a manual dispatch with `preempt: false`
  reports `would-cancel` and must not advance the scoreboard.

## 5. Invariants (testable — each maps to a unit test)

| # | Invariant | Test |
| --- | --- | --- |
| I1 | Protected runs are never selected for preemption | `controller-core.test.js` (selectPreemptions) |
| I2 | Scoreboard survives quiet ticks; expires 6h after last cut | `controller-driver.test.js` (state round-trip, TTL) |
| I3 | Lineage advances only on cuts that actually happened (`cancelled`) | `controller-driver.test.js` (cancel-failed / spared) |
| I4 | Stalled runs with recent step activity are spared; spared runs never reach stop/ingestion feeds | driver behavior, feed shows `spared(step-progress)` |
| I5 | After `maxReassigns`, the lineage escalates to ingestion — no infinite cut→relaunch | `controller-core.test.js` (planPreemptions) |
| I6 | The model chain never contains an SSOT-denylisted model | `controller-core.test.js` (denylist drift test) |
| I7 | Dry scans never advance scheduling state | `controller-driver.test.js` (dry-run feed ignored) |
| I8 | A failed cancel never relaunches (no duplicate runs) | driver: `cancel-failed` → skip reassign |

Any PR that changes controller behavior must keep these tests green and update
this table if it adds or removes an invariant.

## 6. Model policy (owner decision, 2026-07-10)

The reassignment chain follows the fleet SSOT (`.github/agent-models.yml`):

1. `anthropic/claude-opus-4.8` — Opus twin, primary execution
2. `anthropic/claude-opus-4.7` — Opus twin, fallback execution
3. `anthropic/claude-fable-5` — reasoning-tier escalation (Claude 5 family,
   Mythos-class; reserve for the hardest work — it is priced above the twins)

**Denylisted, never reintroduce:** the Claude Sonnet family (any naming
scheme — `claude-sonnet-*` and `claude-3.5-sonnet` alike) and
`openrouter/auto`/`fusion`. History: fleet A/B tests showed the twins beat
fusion, and Sonnet repeatedly refused/violated repo operating rules; a
naming-scheme gap in the original denylist pattern let `claude-3.5-sonnet`
survive in this controller's chain until 2026-07-10. Invariant I6 makes that
class of drift impossible now.

**Provider lanes.** Default lane is OpenRouter (one place, one bill; IDs are
`vendor/model`). Where a workflow needs Claude specifically, the sanctioned
Claude-direct lane is the official `anthropics/claude-code-action` GitHub
Action or headless `claude -p` (Claude Code CLI) with an `ANTHROPIC_API_KEY`
secret — model IDs there drop the vendor prefix (`claude-opus-4-8`,
`claude-fable-5`). Fable 5 direct requires 30-day data retention and can
return `stop_reason: refusal`; pair it with an Opus 4.8 fallback. MCP is not
a model provider — it supplies tools to a model, not models to a workflow —
so "use Claude via MCP" resolves to one of the two lanes above.

## 7. Cadence and tuning

- **Tick:** every 15 min (`7,22,37,52 * * * *`), offset from the other loops.
- **Defaults** (in `core.js` `DEFAULTS`): `stallMs` 15 min, `maxRunMs` 60 min,
  `occupancyCap` 20, `maxReassigns` 2. Scoreboard TTL (`STATE_TTL_MS`) 6h in
  `controller.js`.
- Tuning changes are ordinary PRs; changing an invariant requires amending
  this charter in the same PR.

## 8. Interfaces

| Feed | Schema | Consumer | Contract |
| --- | --- | --- | --- |
| `controller-status.json` | `fleet-controller/v1` | Lovable monitor | Full picture: health, occupancy, planned + applied actions |
| `controller-stop.json` | `fleet-controller-stop/v1` | In-process orchestrators | Only runs that were actually cut (never spared runs) |
| `controller-ingestion.json` | `fleet-controller-ingestion/v1` | Self-healing loop | Only exhausted lineages needing the heal loop |
| `controller-state.json` | `fleet-controller-state/v1` | The controller itself | Durable scoreboard; consumers other than the controller treat it as opaque |

Schema changes are versioned (`/v1` → `/v2`) — never mutate a schema in
place; consumers parse by schema string.

## 9. Amendment

This charter changes by PR, like code. A PR that alters controller authority,
limits, invariants, or model policy must update this file, the implementation,
and the tests together — a charter that disagrees with the code is a bug in
whichever one the PR didn't update.
