# VEINS Monitor — Vital Engine INtelligence Surveillance

VEINS is the standing watch that guarantees **nothing sits idle for 7+ days**.
It scans every open issue and Work Request hourly, posts a human-readable
diagnosis explaining why something is stuck, and applies automated recovery
where possible.

## Why VEINS Exists

The existing self-healing suite (`stuck-wr-detector.yml`, `stuck-check-watchdog.yml`,
`auto-reset-stuck-issues.yml`) handles specific, well-defined failure modes. But
there were gaps:

| Gap | Pre-VEINS behaviour | VEINS fix |
|---|---|---|
| WR with `research:blocked` | `stuck-wr-detector` skipped it (requires completion label) | VEINS adds `wr:reset` to force PR skeleton |
| WR open > 7 days, no PR, no research | Silently ignored | VEINS detects, posts diagnosis, adds `wr:reset` |
| Issue stuck in `triage:new` > 7 days | `auto-reset-stuck-issues` only targets self-heal issues | VEINS cycles `triage:new` for ALL issues |
| Any issue with `lifecycle:stuck` > 7 days | No re-escalation | VEINS re-posts diagnostic comment, adds `auto-fix` |
| No human-readable "why is it stuck" | Engineers had to infer from labels | VEINS always posts a root-cause comment |

## How It Works

```text
Hourly cron (0 * * * *)
    │
    ├── Case 1: open work-request issues > 7 days, no PR
    │     └── root cause: research:blocked / no completion signal
    │     └── fix: add wr:reset + lifecycle:stuck, dispatch wr-pr-creation
    │
    ├── Case 2: issues stuck in triage:new > 7 days
    │     └── root cause: triage pipeline did not fire
    │     └── fix: cycle triage:new label, add lifecycle:stuck
    │
    └── Case 3: issues with lifecycle:stuck > 7 days
          └── root cause: prior recovery failed
          └── fix: re-add auto-fix, post escalation comment
```

Each detected issue receives a VEINS comment with:

- **Diagnosis** — what state the issue is in
- **Root Cause** — why it got stuck
- **Auto-Fix Applied** — what VEINS did automatically
- **Manual Fix** — step-by-step instructions if automation isn't enough

VEINS de-duplicates: it only posts one comment per issue per 6-hour window.

## SLA

VEINS enforces a **7-day stuck SLA**. Any issue open longer than 7 days
without progressing will receive a diagnosis and an auto-recovery attempt.

To change the threshold, trigger the workflow manually:

```text
Actions → VEINS Monitor → Run workflow → max_age_days=3
```

## Manual Trigger

```bash
# Run VEINS in dry-run mode (logs findings, no changes)
gh workflow run veins-monitor.yml \
  --field dry_run=true \
  --repo midnghtsapphire/revvel-standards

# Run VEINS with a tighter 3-day threshold
gh workflow run veins-monitor.yml \
  --field max_age_days=3 \
  --repo midnghtsapphire/revvel-standards
```

## Recovery Actions Reference

| Condition | VEINS action |
|---|---|
| WR > 7d, no PR, `research:blocked` | Add `wr:reset`, `lifecycle:stuck`, dispatch `wr-pr-creation.yml` |
| WR > 7d, no PR, no completion label | Add `wr:reset`, `lifecycle:stuck`, dispatch `wr-pr-creation.yml` |
| Issue > 7d in `triage:new` | Remove + re-add `triage:new`, add `lifecycle:stuck` |
| Issue > 7d with `lifecycle:stuck` | Add `auto-fix`, post escalation comment |

## Interaction with Other Healers

VEINS is additive to — not a replacement for — the existing healer suite:

| Workflow | Scope | Frequency |
|---|---|---|
| `stuck-wr-detector.yml` | WRs with completion labels, no PR | Every 6h |
| `stuck-check-watchdog.yml` | WRs stuck in `wr:checking` | Every 30m |
| `stuck-label-watchdog.yml` | PRs with stuck lifecycle labels | Every 1h |
| `auto-reset-stuck-issues.yml` | Self-heal issues in `triage:new` | Every 30m |
| **`veins-monitor.yml`** | **ALL issues and WRs > 7 days** | **Every 1h** |

VEINS is the final backstop — it catches everything the other healers miss.

## Algorithm — External VEINS Engine

The external V.E.I.N.S. engine runs **outside this repo** (hosted on Loveable) and
interacts via the owner's GitHub token. Its algorithm, as observed from repo artifacts:

1. **Flaky detection**: Monitor CI workflow runs. When a workflow flips pass/fail
   3× in the last 8 runs with no code-intent, classify it as flaky.
2. **Proposal commit**: For each flaky signal, the engine commits a stub markdown
   file to `.veins/proposals/` on a new `veins/heal-*` branch. These are
   **human-reviewable proposals**, not auto-applied patches.
3. **Issue creation**: Open a `[VEINS]` issue in the repo with severity, component,
   and the upstream CI run URL.

Current known gaps:
- **Dedup at proposal level**: the engine can commit multiple proposal files for
  the same upstream CI run (run 28634026490 generated 5 files). `veins-intake-dedup.yml`
  catches duplicate *issues* at intake, but not duplicate proposal *files* in `.veins/`.
- **No patch content**: every proposal file ends with "Edit or replace with the real
  patch on this branch before merging." — VEINS creates the branch; humans supply the fix.
- **Single target so far**: as of 2026-10-22, all 7 proposals targeted one component
  (`🎛️ PR State Orchestrator`) across a July 2026 burst. The engine has been dormant
  for 92+ days since.

## Sheaves — BNAT Knowledge Sheaf

VEINS's WR cites a "Vascular-Sheaf Policy Repair" (VSPR) architecture. The in-repo
implementation of its sheaf layer is `scripts/bnatsheaf/`:

| Concept | Implementation |
|---|---|
| Vertices | BIOME workers (`sentinel`, `homeostat`, `medic`, `sheaf`) |
| Stalks | 1-d severity vector per worker: healthy=0, degraded=1, down=2 |
| Edges | All worker pairs; default identity restriction maps |
| Laplacian energy E(x) | Sum of squared disagreements across all edges |
| H¹ obstruction | Any edge where `\|Ru xu − Rv xv\|² ≥ ε` |
| Global section | E(x) < ε — all workers agree on severity (H⁰) |

A non-zero E(x) means some workers disagree and the sheaf has an H¹ obstruction.
Per `wr/pending/14-veins-grounding-gate.md`, a sheaf that always produces a global
section is a rubber stamp — obstructions must be named and either repaired (transition
patch applied) or escalated (`lifecycle:stuck + needs-human`). Agents must not start
work (imprint-at-spawn) while E(x) > ε.

Current state: E(x) = 0, all 4 workers healthy, no H¹ obstructions.

## Monitoring Script

```bash
# Human-readable summary (runs in CI after every test pass)
node scripts/veins-activity.js

# Machine-readable JSON
node scripts/veins-activity.js --json
```

Covers: proposal count + component targets, git frequency (cadence, dormancy),
BIOME sheaf health (E(x) + H¹ obstructions), and monitor wiring status.

## Related Files

- `.github/workflows/veins-monitor.yml` — internal stuck-issue watchdog (manual trigger only)
- `.github/workflows/veins-intake-dedup.yml` — dedup gate for `[VEINS]` issues at intake
- `scripts/veins-activity.js` — monitoring script (runs in CircleCI, exit 0 always)
- `scripts/bnatsheaf/cli.js` — sheaf consistency check + imprint-at-spawn
- `scripts/bnatsheaf/sheaf.js` — cellular sheaf math (CellularSheaf, Laplacian energy)
- `standards/BNAT_SHEAF_STANDARD.md` — sheaf invariant standard
- `wr/pending/14-veins-grounding-gate.md` — grounding gate WR (Ship Quality + sheaf fixes)
- `.github/workflows/stuck-wr-detector.yml` — companion detector (handles < 7d stuck WRs)
