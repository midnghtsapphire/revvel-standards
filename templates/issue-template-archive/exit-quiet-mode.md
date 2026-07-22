---
name: "🔓 Wake Automation (Exit Quiet Mode)"
about: "Permission gate: Open this to enable scheduled workflows"
title: "exit-quiet-mode"
labels:
  - operations
  - automation-control
assignees:
  - midnghtsapphire
---

## 🔓 This Issue Enables Scheduled Automation

**What happens when you open this issue:**
Scheduled workflows that check for this issue will run on their normal schedule.

**What happens when you close this issue:**
Those same workflows will skip execution and log "Quiet Mode active; skipping".

---

## Workflows That Will Activate

When this issue is **open**, these workflows run on schedule:

| Workflow | Schedule | Action |
|----------|----------|--------|
| **Migration Cron** | Daily 1 PM UTC | Migrates one repository by priority |
| **Triage Cron** | Daily 12 PM UTC | Proposes one decision to DECISIONS-TODAY.md |

**Note**: Compliance Watcher always runs (it pierces Quiet Mode).

---

## How The Gate Works

Each workflow checks for an open issue or pull request titled `exit-quiet-mode`:

```yaml
# Example from migration-cron.yml
- name: Quiet Mode gate
  uses: actions/github-script@v7
  with:
    script: |
      const { owner, repo } = context.repo;
      const { data: issues } = await github.rest.issues.listForRepo({ 
        owner, repo, state: 'open', per_page: 100 
      });
      const active = issues.some(i => 
        i.title.trim().toLowerCase() === 'exit-quiet-mode'
      );
      core.setOutput('active', active ? 'true' : 'false');
```

If `active` is `false`, the workflow exits early.

---

## To Return To Quiet Mode

**Simply close this issue.** Next time workflows run, they'll see no open gate signal and skip execution.

---

**Full specification**: `wr/specs/01-quiet-mode.md`
