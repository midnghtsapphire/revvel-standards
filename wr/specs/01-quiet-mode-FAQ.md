# Quiet Mode FAQ

## What does the "exit-quiet-mode" issue do?

The `exit-quiet-mode` issue is a **gate signal** that enables scheduled workflows to run. It does NOT:
- ❌ Request new cron jobs or workflows to be created
- ❌ Schedule new automation tasks
- ❌ Start processes directly

Instead, it:
- ✅ Acts as a permission flag for existing scheduled workflows
- ✅ Tells dormant cron jobs they are allowed to execute
- ✅ Enables pre-configured automation that's waiting for permission

## How does it work technically?

Every Quiet-Mode-gated workflow includes a gate step that:

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
      const active = issues.some(i => i.title.trim().toLowerCase() === 'exit-quiet-mode');
      core.setOutput('active', active ? 'true' : 'false');
```

If no open issue titled "exit-quiet-mode" exists, the workflow exits with: `echo "Quiet Mode active; skipping"`

## What automation exists today?

Currently scheduled workflows that respect Quiet Mode:

| Workflow | Schedule | What It Does | File |
|----------|----------|--------------|------|
| **migration-cron** | Daily 1 PM UTC | Migrates one repo per day by priority tier | `.github/workflows/migration-cron.yml` |
| **triage-cron** | Daily 12 PM UTC | Proposes one decision to DECISIONS-TODAY.md | `.github/workflows/triage-cron.yml` |

**Exception**: Compliance Watcher pierces Quiet Mode and always runs (see `wr/specs/09-compliance-watcher.md`).

## Why does Quiet Mode exist?

Quiet Mode is the system's safety mechanism:

1. **Prevents unwanted automation** - Nothing runs until explicitly enabled
2. **Respects user agency** - Audrey controls when automation wakes
3. **Safe by default** - System ships dormant, not active
4. **Reversible** - Can return to quiet state anytime

## How do I exit Quiet Mode?

Open an issue with the exact title `exit-quiet-mode` using the issue template at:
`.github/ISSUE_TEMPLATE/exit-quiet-mode.md`

## How do I re-enter Quiet Mode?

Open an issue titled `enter-quiet-mode`. The system will automatically:
1. Close any open `exit-quiet-mode` issue
2. Return all gated workflows to dormant state

## What if I want to run a workflow manually?

Use the `workflow_dispatch` trigger in GitHub Actions UI:
1. Go to Actions tab
2. Select the workflow
3. Click "Run workflow"
4. The workflow will check Quiet Mode status and either run or skip

## Does this create new workflows?

**No.** All workflows already exist in `.github/workflows/`. The `exit-quiet-mode` issue only enables them to execute when their schedule triggers.

Think of it like:
- **Workflows**: Pre-installed alarm clocks
- **Quiet Mode**: All alarms are muted by default
- **exit-quiet-mode**: Unmute button that lets alarms ring

## Reference

- Full specification: `wr/specs/01-quiet-mode.md`
- North Star principle: `wr/NORTH_STAR.md` § The Quiet Mode Default
- Workflow implementations: `.github/workflows/migration-cron.yml`, `.github/workflows/triage-cron.yml`
