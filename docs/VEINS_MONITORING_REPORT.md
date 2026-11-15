# VEINS Monitoring Report

> **V.E.I.N.S.** — Vital Engine INtelligence Surveillance.
> An external self-healing engine (runs in Lovable, outside this repo) that
> watches GitHub Actions workflow runs for flakiness and stuck states.

## How to run a live snapshot

```bash
# Human-readable report (exit 0 = healthy, 1 = issues, 2 = proposals dir missing)
node scripts/veins-snapshot.js

# Machine-readable JSON
node scripts/veins-snapshot.js --json
```

CircleCI runs this automatically on every push and stores the JSON as an artifact
under **veins-monitor/veins-snapshot.json**. Download it from the CircleCI job
artifacts tab to track trends across builds.

---

## Live snapshot — 2026-11-10
## Live snapshot — 2026-11-12
## Live snapshot — 2026-11-13

```text
Overall: 🔴 DOWN  |  Effectiveness index: 0/100

── 1. WHAT IS VEINS CHANGING? ──────────────────────────────────
  7 proposal(s) across 1 component(s):
    • `🎛️ PR State Orchestrator`  (7 proposal(s))

  Severity distribution:
    low: 7

  Unique heal event IDs:
    • FLAKY-🎛️ PR S

── 2. HOW FREQUENTLY? ──────────────────────────────────────────
  Unique VEINS run IDs: 3
  First proposal commit:  2026-07-02T23:04:13.000Z
  Last proposal commit:   2026-07-22T19:32:41.000Z
  Span: 20 day(s)  |  Avg interval: 68.1 hour(s)
  Days since last proposal: 111  ⚠️  Engine appears silent (> 30 days).
  Days since last proposal: 113  ⚠️  Engine appears silent (> 30 days).
  Days since last proposal: 114  ⚠️  Engine appears silent (> 30 days).

── 3. ARE THEY DOING ANYTHING? ─────────────────────────────────
  Stub rate: 100%  (7 unactioned / 7 total)
  ⚠️  All proposals are stubs — no real patch has been applied.
  ⚠️  1 repeat-firing component(s) — VEINS keeps detecting without cure:
    • `🎛️ PR State Orchestrator`  (7 proposals, 3 unique run(s))

── SHEAF TOPOLOGY ─────────────────────────────────────────────
  dim H⁰: 1  dim H¹: 3  energy: 0
  Consistent: true  Obstruction: true
  Long-lived H¹ bars: 0  (as of 2026-11-10T09:10:28.181Z)
  ✅  Fingerprint is current — refreshed 2026-11-10.
```

**Bottom line (2026-11-10):**
**Bottom line (2026-11-12):**
**Bottom line (2026-11-13):**
- VEINS fired 3 times between 2026-07-02 and 2026-07-22, all targeting the same
  flaky workflow (`🎛️ PR State Orchestrator`), generating 7 stub proposals.
- **Zero proposals have been actioned.** The stub boilerplate is still in every file.
- The engine has been **silent for 114 days** — it stopped firing around 2026-07-22.
- The engine has been **silent for 113 days** — it stopped firing around 2026-07-22.
- The engine has been **silent for 111 days** — it stopped firing around 2026-07-22.
- The sheaf topology fingerprint (`docs/biome/bnat-fingerprint.json`) was refreshed
  2026-11-10 — the BIOME workers are all reporting `healthy`, E(x) = 0 (no live
  Laplacian disagreement), but dim H¹ = 3 means the graph has 3 independent cycles
  that *can* host obstructions the moment any worker diverges.

## Trend history (`docs/veins-history.jsonl`)

Three rows on record:
Five rows on record:
Six rows on record:

| snapshot_at | status | effectiveness | stubs | days_silent | sheaf_H¹ |
|---|---|---|---|---|---|
| 2026-11-06T09:12:33Z | 🔴 down | 0/100 | 7 | 107 | 3 |
| 2026-11-07T09:09:16Z | 🔴 down | 0/100 | 7 | 108 | 3 |
| 2026-11-10T09:09:22Z | 🔴 down | 0/100 | 7 | 111 | 3 |
| 2026-11-12T09:08:48Z | 🔴 down | 0/100 | 7 | 113 | 3 |
| 2026-11-13T09:08:45Z | 🔴 down | 0/100 | 7 | 114 | 3 |

Trend: **status unchanged; engine silent 1 more day(s) since last check.** All key metrics are flat
— stubs unresolved, engine offline, sheaf energy zero throughout. The only number
moving is `days_since_last_commit`, now at 114.
— stubs unresolved, engine offline, sheaf energy zero throughout. No change since 2026-11-06.

To add a row on demand:
```bash
node scripts/veins-state-log.js
```

---

## Prior readings (kept per RVS-PRESERVE-001)

The 2026-11-05 and 2026-11-06 readings from earlier in this branch are merged
into the table above. The 2026-11-06 figures matched `docs/veins-history.jsonl`
row 1 (`days_since_last_commit`: 107). The 2026-11-07 figures are row 2 above,
with the fingerprint now refreshed (no longer stale).

---

## VEINS Algorithm & Structure

### Where VEINS runs

VEINS runs **externally** in Lovable using the owner's GitHub token. It is not a
workflow in this repo — it reaches in to open PRs that commit proposal files and
to open `[VEINS] ...` issues.

### Detection (what triggers a proposal)

VEINS watches `workflow_run` events on GitHub Actions. When a workflow's pass/fail
history shows 3+ flips within its recent run window **without a code change as the
cause**, VEINS classifies it as a flaky-quarantine candidate and generates a heal
event (`FLAKY-<hash>`).

### Proposal format (`.veins/proposals/*.md`)

Each proposal is a markdown stub committed on a branch and opened as a PR:

```markdown
**Title:** Flaky workflow candidate: <workflow-name>
**Severity:** `low` / `medium` / `high`
**Source:** `workflow_run` — <GitHub Actions run URL>
**Component:** `<workflow-name>`
**Heal event id:** `FLAKY-<hash>`

[stub boilerplate — must be replaced with a real patch before merging]
```

A proposal is an **unactioned stub** while it still contains the stub boilerplate
marker. Once a human or bot edits the file and removes the marker (replacing it
with an actual patch), `analyzeProposals()` counts it as actioned.

### Dedup gate (`.github/workflows/veins-intake-dedup.yml`)

VEINS can burst — it opened 6 near-identical `[VEINS]` issues within minutes on
2026-07-02 (#14929, #14953, #14968, #14979, #14982, #14985). The dedup gate fires
on `issues: opened` and normalizes issue titles by stripping volatile numbers
(e.g. `(3767m)` → `()`) before comparing. If a matching open issue already exists,
it closes the newcomer as a duplicate. After 3 duplicates it escalates the survivor
to `lifecycle:stuck + auto-fix`.

### Sheaf mathematics (the theoretical backbone)

VEINS and the BIOME fleet use a **cellular sheaf on a graph** to measure fleet-wide
health coherence:

| Sheaf concept | Fleet meaning |
|---|---|
| Vertex | A fleet component (workflow, WR stage, agent) |
| Stalk `x_v ∈ ℝⁿ` | Health state of that component (severity vector) |
| Edge `(u, v)` | Shared context — dependency or overlap between components |
| Restriction map `R_{u→e}` | Linear map projecting stalk `x_u` onto edge `e` |
| Coboundary `δx\|_e = R_u x_u − R_v x_v` | Disagreement between adjacent components on edge `e` |
| Sheaf Laplacian energy `E(x) = Σ_e ‖δx\|_e‖²` | Total fleet disagreement |

**E(x) = 0** ⟺ the assignment is a **global section** (H⁰ exists, H¹ ≈ 0):
every component is in mutual agreement — the fleet is coherent.

**E(x) > 0** ⟺ there is an **H¹ obstruction**: a persistent disagreement between
components that cannot be resolved by any local gluing. This is VEINS' geometric
signal for a "stuck state." VEINS fires an alert when it detects a positive-birth
H¹ bar that has been alive longer than the staleness threshold (default: 7 days).

The BIOME implementation (`scripts/bnatsheaf/sheaf.js`) maps worker statuses to
1-dimensional stalks (`healthy=0, degraded=1, down=2`) and constructs a clique
(all pairs of workers connected), so any two workers in disagreement produce a
non-zero edge residual that surfaces in `h1Obstructions()`.

**What the current fingerprint means:**
- `dim H⁰ = 1`: one global section attempt — the fleet has a single connected
  component; everyone is trying to agree.
- `dim H¹ = 3`: three independent H¹ classes — three persistent "loops of
  disagreement" across the 4-worker BIOME graph (C1=6 edges, rank_delta=3 means
  6−4+1=3 independent cycles exceed the spanning tree).
- `energy = 0`: at the time of the snapshot, all 4 workers reported `healthy`, so
  the Laplacian energy was zero (no live disagreement). H¹ = 3 here reflects
  topological structure (how many independent cycles the graph has), not an active
  obstruction signal.
- `obstruction = true`: the graph topology supports H¹ — disagreements *can*
  appear. This is a warning posture, not an active fire.

### VEINS scan logic (`.github/workflows/veins-monitor.yml`)

The in-repo `veins-monitor.yml` is a companion workflow (not VEINS itself) that
handles the in-repo side of recovery. It is `workflow_dispatch` only — no cron per
the 2026-08-21 cron freeze. It scans three cases:

| Case | Condition | Recovery action |
|---|---|---|
| 1 | WR open > 7d, no PR, `research:blocked` or no completion label | Add `wr:reset` + `lifecycle:stuck`, dispatch `wr-pr-creation.yml` |
| 2 | Issue stuck in `triage:new` > 7d | Cycle `triage:new`, add `lifecycle:stuck` |
| 3 | Issue with `lifecycle:stuck` > 7d | Re-add `auto-fix`, post escalation comment |

VEINS de-duplicates comments: it only posts once per 6-hour window per issue.

---

## Monitoring infrastructure

| File | Purpose |
|---|---|
| `scripts/veins-tracker.js` | Parses `.veins/proposals/`, answers the 3 questions |
| `scripts/veins-snapshot.js` | Full snapshot: proposals + git history + sheaf topology |
| `scripts/veins-state-log.js` | Appends compact summary row to `docs/veins-history.jsonl` for trend tracking |
| `scripts/biome/veins-observer.js` | Queries GitHub for `[VEINS]` issue alerts |
| `docs/veins-history.jsonl` | Persistent JSONL state log — one row per monitoring run |
| `tests/veins-tracker.test.js` | Regression-pins the parser and analyser |
| `tests/veins-snapshot.test.js` | Pins frequency, effectiveness, snapshot builder |
| `tests/veins-state-log.test.js` | Pins row builder and trend analysis |
| `.github/workflows/veins-monitor.yml` | In-repo recovery workflow (manual dispatch) |
| `.github/workflows/veins-intake-dedup.yml` | Dedup gate for new `[VEINS]` issues |
| `docs/biome/bnat-fingerprint.json` | Sheaf topology snapshot (run BNAT CLI to refresh) |

CircleCI artifact chain:
```text
Every push → veins-monitor job
           → veins-snapshot.js --json  → artifact: veins-monitor/veins-snapshot.json
           → veins-state-log.js        → artifact: veins-monitor/veins-state-log.txt
                                       → artifact: veins-monitor/veins-history.jsonl
```

To query the JSONL trend history locally:
```bash
# latest entry
tail -1 docs/veins-history.jsonl | jq .

# all entries, human-readable table
jq -r '[.snapshot_at, .status, .effectiveness_index, .stub_unactioned, .days_since_last_commit] | @tsv' \
  docs/veins-history.jsonl
```

To refresh the sheaf fingerprint manually:
```bash
node scripts/bnatsheaf/cli.js imprint_agent --agent <name>
node scripts/bnatsheaf/cli.js consistency_check --epsilon 1e-9
```

---

## Action items (as of 2026-11-10)

| Priority | Item | Status |
|---|---|---|
| P1 | VEINS engine has been **silent 111 days**. Check that it is running in Lovable and watching `midnghtsapphire/revvel-standards`. | 🔴 Open |
| P1 | VEINS engine has been **silent 113 days** (as of 2026-11-12). Check that it is running in Lovable and watching `midnghtsapphire/revvel-standards`. | 🔴 Open |
| P1 | VEINS engine has been **silent 114 days** (as of 2026-11-13). Check that it is running in Lovable and watching `midnghtsapphire/revvel-standards`. | 🔴 Open |
| P1 | **7 unactioned stubs** in `.veins/proposals/` all target `🎛️ PR State Orchestrator`. Either apply a real quarantine patch (edit the stub files, remove boilerplate, add an actual fix) or close them as resolved if the flakiness is no longer observed. | 🔴 Open |
| P2 | `🎛️ PR State Orchestrator` is the **only component VEINS has ever flagged** (3 runs, 7 proposals, all stubs). The underlying flakiness was never resolved. Check if this workflow is still flaky or if the problem self-healed; either action the stubs or close them. | 🔴 Open |
| P2 | `bnat-fingerprint.json` refreshed 2026-11-10T09:10:28Z — topology is current. | ✅ Done |
| P3 | `veins-monitor.yml` has no schedule (cron freeze). Consider running it manually on a cadence or via the VEINS WR process. | 🟡 Open |

### Prior readings (kept per RVS-PRESERVE-001)

Earlier readings (2026-11-05, 2026-11-06, 2026-11-07) are merged into the trend table above.
Key counts at each point: 106 / 107 / 108 / 111 days silent, fingerprint refreshed
Earlier readings (2026-11-05 through 2026-11-13) are merged into the trend table above.
Key counts: 106 / 107 / 108 / 111 / 112 / 113 / 114 days silent, fingerprint refreshed
2026-11-07 and again 2026-11-10. Items P1 and P2 (engine silence, unactioned stubs) remain open.
