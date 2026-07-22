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

## Related Files

- `.github/workflows/veins-monitor.yml` — workflow implementation
- `.github/workflows/stuck-wr-detector.yml` — companion detector (handles < 7d stuck WRs)
- `docs/SELF_HEALING_SYSTEM.md` — full self-healing architecture overview
- `docs/WR_STUCK_STATES_FIX_SUMMARY.md` — history of stuck-state fixes
