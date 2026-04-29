---
name: Exit Quiet Mode
about: Open this issue to wake Quiet-Mode-gated workflows
title: "exit-quiet-mode"
labels:
  - operations
assignees:
  - midnghtsapphire
---

## What This Issue Does

Opening this issue **enables** scheduled workflows/cron jobs to run. This is a **gate signal**, not a request to create or schedule new jobs.

### How It Works

1. **Default State**: Quiet Mode is ON by default—all scheduled workflows are dormant
2. **Opening this issue**: Acts as a permission flag that tells existing cron jobs they can run
3. **Workflow Behavior**: Each scheduled workflow checks for an open issue titled "exit-quiet-mode" before executing
4. **Result**: If this issue is open, workflows proceed; if closed, they exit silently with "Quiet Mode active; skipping"

### What Gets Activated

When this issue is open, the following scheduled workflows become active:

- **Migration Cron** (daily at 1 PM UTC) - Migrates one repository per day by priority
- **Triage Cron** (daily at 12 PM UTC) - Proposes one decision per day to DECISIONS-TODAY.md

**Exception**: Compliance Watcher always runs, even in Quiet Mode (it pierces the gate).

### To Re-Enter Quiet Mode

Open an issue titled `enter-quiet-mode`—this will automatically close this issue and return the system to dormant state.

---

**Reference**: See `wr/specs/01-quiet-mode.md` for complete specification.
