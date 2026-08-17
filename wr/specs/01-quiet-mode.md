# Spec 01 — Quiet Mode

**Version:** 1.0
**Status:** Core Operational Control

Quiet Mode is the default operating state for all scheduled automation.

---

## Purpose

Quiet Mode ensures automation runs only when explicitly enabled. This prevents:
- Unwanted automation firing in new repositories
- Accidental workflow execution during development
- Loss of user control over when automation activates

---

## How It Works

### The Gate Signal

Scheduled workflows check for an open issue or pull request titled `exit-quiet-mode` before executing.

**Implementation example:**

```yaml
- name: Quiet Mode gate
  id: quiet
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

- name: Skip if Quiet Mode active
  if: steps.quiet.outputs.active != 'true'
  run: echo "Quiet Mode active; skipping"

- name: Execute workflow
  if: steps.quiet.outputs.active == 'true'
  run: |
    # Actual workflow logic here
```

**Technical note:** `github.rest.issues.listForRepo` returns both issues and pull requests. An open PR titled `exit-quiet-mode` will also satisfy the gate.

---

## Workflow Inventory

Current workflows that respect Quiet Mode:

| Workflow | Schedule | Purpose | File |
|----------|----------|---------|------|
| **migration-cron** | Daily 1 PM UTC | ⏳ Placeholder — will migrate one repository per day by priority tier | `.github/workflows/migration-cron.yml` |
| **triage-cron** | Daily 12 PM UTC | ⏳ Placeholder — will propose one decision to DECISIONS-TODAY.md | `.github/workflows/triage-cron.yml` |

### Exception

**Compliance Watcher** always runs regardless of Quiet Mode status. See `wr/specs/09-compliance-watcher.md`.

---

## Operational Controls

### To Enable Automation (Exit Quiet Mode)

Open an issue titled `exit-quiet-mode` using the template:
`.github/ISSUE_TEMPLATE/exit-quiet-mode.md`

Workflows will activate on their next scheduled run.

### To Disable Automation (Enter Quiet Mode)

**Close any open issue or pull request titled `exit-quiet-mode`.**

Workflows will check for the gate on their next run, find it closed, and skip execution.

### To Run A Workflow Manually

Use GitHub Actions UI:
1. Navigate to Actions tab
2. Select the workflow
3. Click "Run workflow" button
4. The workflow executes immediately (still checks Quiet Mode status)

---

## Hibernation Rules

Agent-driven proposal workflows have additional throttling:

- **Trigger:** Three consecutive 👎 reactions on agent proposals
- **Duration:** 7-day hibernation
- **Behavior:** During hibernation, proposal agents skip execution even if Quiet Mode is exited
- **Recovery:** Hibernation lifts automatically after 7 days

---

## Integration Requirements

### For New Workflows

Every scheduled workflow that should respect Quiet Mode must:

1. **Add the gate check** as shown in the implementation example above
2. **Conditionally skip** when `active != 'true'`
3. **Log the skip** with: `echo "Quiet Mode active; skipping"`
4. **Document itself** in the Workflow Inventory table in this spec

### For Compliance-Critical Workflows

Workflows that must run regardless of Quiet Mode (like Compliance Watcher):
1. **Skip the gate check** entirely
2. **Document the exception** in this spec
3. **Get explicit approval** from repository owner before implementation

---

## Reference Implementation

See working examples in:
- `.github/workflows/migration-cron.yml`
- `.github/workflows/triage-cron.yml`

---

## Related Documentation

- North Star principle: `wr/NORTH_STAR.md` § The Quiet Mode Default
- Compliance exception: `wr/specs/09-compliance-watcher.md`
- Migration workflow: `wr/specs/08-migration-cron.md`
