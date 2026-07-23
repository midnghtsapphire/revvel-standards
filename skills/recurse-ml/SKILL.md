# RecurseML Skill

Activate when any task involves code review automation, bug detection, enforcing code standards on PRs, or integrating RecurseML into a Revvel project.

## What RecurseML Does

RecurseML is an autonomous AI execution platform that integrates with GitHub to:

1. **Detect bugs** proactively in AI-generated and human-written code on every PR.
2. **Enforce custom code standards** via a `recurse-rules.md` file in the repo root.
3. **Post PR review comments** automatically — flagging violations with line-level feedback.
4. **Run continuously** on every push and PR without manual intervention.
5. **Support self-healing loops** — when a violation is detected, RecurseML explains the fix and an agent (Copilot, OpenClaw) can resolve it automatically.

## Why RecurseML in the Revvel Ecosystem

- Every Revvel project ships AI-generated code. AI agents make subtle bugs (swallowed errors, missing auth, `any` types, duplicated logic). RecurseML catches these automatically.
- The 14-day free trial evaluates it before the $250/year commitment.
- It replaces manual code review for routine quality gates, freeing agent capacity for feature work.
- It integrates directly into the existing `auto-fix.yml` self-healing loop.

## Integration Architecture

```text
Developer / Agent pushes code
        ↓
recurse-ml.yml workflow triggers (on PR open/update, push to main)
        ↓
RecurseML API receives the diff + recurse-rules.md
        ↓
RecurseML scans for bugs + rule violations
        ↓
PR gets inline review comments with findings
        ↓
If violations: agent reads comments → patches code → re-pushes
        ↓
If CI + RecurseML pass → merge
```

## Setup Checklist (New Project)

1. **Install RecurseML GitHub App:**
   Visit <https://app.recurse.ml/integrations/github> and install for the target repo.

2. **Add API key secret:**
   Repository → Settings → Secrets and variables → Actions → New secret:
   Name: `RECURSE_ML_API_KEY`, Value: (from RecurseML dashboard)

3. **Copy workflow:**
   ```bash
   cp revvel-standards/templates/cicd/recurse-ml.yml .github/workflows/recurse-ml.yml
   ```

4. **Copy and customize rules:**
   ```bash
   cp revvel-standards/recurse-rules.md recurse-rules.md
   # Edit recurse-rules.md to add project-specific rules
   ```

5. **Verify workflow triggers on next PR.**

## Recurse Rules — How to Write Them

`recurse-rules.md` lives in the repo root. RecurseML reads it on every scan.

### Rule Template

```markdown
## Rule Name

**Pattern:** what to detect (plain English, not regex — RecurseML uses its own ML engine)

**Why:** rationale for the rule

**Fix:** how to fix the violation
```

### Universal Revvel Rules (pre-written)

All Revvel projects inherit the rules from `revvel-standards/recurse-rules.md`:

| Rule | What It Catches |
|---|---|
| No Hardcoded Secrets | API keys, passwords, tokens in source |
| No `any` Types | TypeScript `any` bypassing type system |
| No Silent Error Swallowing | Empty catch blocks |
| No Direct `console.log` | Debug logs in production code |
| No TODO/FIXME in main | Incomplete work merged to main |
| DRY Violations | Duplicated logic blocks (≥ 10 lines, ≥ 90% similar) |
| No `.env` Committed | Secrets files in the repo |
| Accessible UI | Images without alt text |
| No Raw SQL Injection | Unparameterized user inputs to DB queries |
| Auth on All Routes | Unprotected API endpoints |
| Tests Required | New functions without test files |
| Revvel Stack Compliance | Unapproved libraries (jQuery, Moment.js, etc.) |

## Agent Workflow — Self-Healing Loop

When RecurseML posts a violation comment on a PR:

1. **Read the comment.** It will include the file, line number, rule violated, and suggested fix.
2. **Apply the fix** as the smallest possible change to resolve the violation.
3. **Commit and push.** RecurseML re-scans automatically on the new push.
4. **Repeat** until all violations are cleared.
5. **Do not merge** until RecurseML shows a clean scan.

## Integration with auto-fix.yml

RecurseML violations can trigger the auto-fix loop:

```yaml
# In auto-fix.yml, add RecurseML violation detection:
on:
  pull_request_review:
    types: [submitted]  # Fires when RecurseML posts review
```

When RecurseML's automated review is submitted, `auto-fix.yml` can pick it up, create a
GitHub Issue labeled `auto-fix` + `copilot`, and have Copilot resolve the violation automatically.

## Cost & Trial

- **Trial:** 14 days free — no cost during evaluation period.
- **Paid:** ~$250/year after trial expires.
- **ROI:** Each RecurseML catch that prevents a production bug saves significant debugging time.
  A single avoided incident (SQL injection, exposed key, unhandled error in payment flow) more
  than pays for the annual subscription.

## Decision Gate (14-Day Trial Checklist)

Track these during the trial to determine if renewal is worth it:

| Metric | Target |
|---|---|
| Bugs caught before merge | ≥ 5 genuine issues found |
| False positive rate | < 20% of comments are noise |
| PR review time reduction | Noticeable reduction in manual review time |
| Integration reliability | 0 workflow failures due to RecurseML |
| Rules quality | Custom rules catch real Revvel-specific patterns |

If ≥ 4/5 targets are met → renew at $250/year.

## Success Criteria

- RecurseML triggers on every PR with no manual intervention.
- Violations are commented inline on the correct file and line.
- The self-healing loop resolves violations within one agent iteration.
- No secrets, SQL injections, or missing auth reach `main`.
- Trial decision is documented in `docs/DARE_LOG.md` by day 14.
