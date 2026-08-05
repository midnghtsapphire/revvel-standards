# GitHub Projects Setup Guide

Complete guide to setting up GitHub Projects, Labels, and Milestones for the Revvel ecosystem.

**Note:** This document describes the setup steps — it does not create actual GitHub Projects or issues. Follow these steps manually or via the GitHub CLI (`gh`) when setting up a new repository.

**Scope:** This is the standard for **all Revvel repos**. Project setup is a mandatory gate before any issue intake (including in this repo).

**Enterprise-first prerequisite:** Migration to the enterprise org and global secrets/PATs are the largest prerequisite steps before project/issue intake.
- See [`REPOSITORY_PRIVACY_MIGRATION_STANDARD.md`](../docs/Master_Inventory/REPOSITORY_PRIVACY_MIGRATION_STANDARD.md)
- See [`SECRETS_MANAGEMENT.md`](../docs/SECRETS_MANAGEMENT.md)

**Project-first gate:** If `project_exists = 0`, create the project and set the default repo before continuing. Only proceed to issue creation when `project_exists = 1`.

---

## 1. Standard Label Set

The canonical label definitions live in `.github/labels.yml` in this repo. The `sync-labels.yml` workflow keeps them in sync automatically.

**Preferred setup (automated):**

```bash
# Copy both files to your app repo
cp .github/labels.yml          YOUR_REPO/.github/labels.yml
cp templates/cicd/sync-labels.yml  YOUR_REPO/.github/workflows/sync-labels.yml

# Commit and push — the workflow will create all labels on the first run
```

**Manual setup (one-time CLI):**

```bash
# Run in your repo root (requires `gh` CLI authenticated)
APP_REPO="midnghtsapphire/YOUR_REPO"  # Replace with your repo

gh label create "bug"             --color "d73a4a" --description "Something isn't working"              --repo $APP_REPO
gh label create "enhancement"     --color "a2eeef" --description "New feature or request"               --repo $APP_REPO
gh label create "security"        --color "cc0000" --description "Security vulnerability or concern"    --repo $APP_REPO
gh label create "bom-purchase"    --color "ffd700" --description "Requires a purchase (links to BOM.md)" --repo $APP_REPO
gh label create "design"          --color "7057ff" --description "Design/brand work needed"             --repo $APP_REPO
gh label create "blocked"         --color "e4e669" --description "Blocked by external dependency"       --repo $APP_REPO
gh label create "triage"          --color "e4e669" --description "Needs triage — newly opened issue awaiting classification" --repo $APP_REPO
gh label create "priority-p0"     --color "b60205" --description "Critical priority — drop everything" --repo $APP_REPO
gh label create "priority-p1"     --color "d93f0b" --description "High priority — next up"             --repo $APP_REPO
gh label create "priority-p2"     --color "fbca04" --description "Medium priority — normal queue"      --repo $APP_REPO
gh label create "priority-p3"     --color "0e8a16" --description "Low priority — backlog"              --repo $APP_REPO
gh label create "draft"           --color "cccccc" --description "Pull request is still a draft"        --repo $APP_REPO
gh label create "in-review"       --color "fbca04" --description "Linked PR is open and ready for review" --repo $APP_REPO
gh label create "auto-fix"        --color "0075ca" --description "Created by auto-fix / Ralph Loop workflow" --repo $APP_REPO
gh label create "copilot"         --color "7057ff" --description "Assigned to GitHub Copilot for fixing" --repo $APP_REPO
gh label create "documentation"   --color "0075ca" --description "Documentation only"                   --repo $APP_REPO
gh label create "good-first-issue" --color "7057ff" --description "Good for newcomers"                  --repo $APP_REPO
gh label create "wontfix"         --color "ffffff" --description "This will not be worked on"           --repo $APP_REPO
gh label create "docker"          --color "0db7ed" --description "Requires Docker-based CI checks"      --repo $APP_REPO
gh label create "merge-queue-pr"  --color "c5def5" --description "Created by Mergify merge queue"      --repo $APP_REPO
```

### Full Label Reference

| Label | Color | Purpose |
|---|---|---|
| `bug` | `#d73a4a` | Something isn't working |
| `enhancement` | `#a2eeef` | New feature or request |
| `security` | `#cc0000` | Security vulnerability or concern |
| `bom-purchase` | `#ffd700` | Requires a purchase (links to BOM.md) |
| `design` | `#7057ff` | Design/brand work needed (Revvel Emblem, icons) |
| `blocked` | `#e4e669` | Blocked by external dependency |
| `triage` | `#e4e669` | Needs triage — newly opened issue awaiting classification |
| `priority-p0` | `#b60205` | Critical priority — drop everything |
| `priority-p1` | `#d93f0b` | High priority — next up |
| `priority-p2` | `#fbca04` | Medium priority — normal queue |
| `priority-p3` | `#0e8a16` | Low priority — backlog |
| `in-review` | `#fbca04` | Linked PR is open and ready for review (set automatically) |
| `auto-fix` | `#0075ca` | Created by auto-fix workflow |
| `copilot` | `#0075ca` | Assigned to Copilot for fixing |
| `documentation` | `#0075ca` | Documentation only |
| `good-first-issue` | `#7057ff` | Good for newcomers |
| `wontfix` | `#ffffff` | This will not be worked on |
| `docker` | `#0db7ed` | Requires Docker-based CI checks |
| `merge-queue-pr` | `#c5def5` | Created by Mergify merge queue (set automatically) |

---

## 2. Standard Milestones

Create these milestones in every new Revvel repository. They map to the 8 EXRUP phases.

```bash
APP_REPO="midnghtsapphire/YOUR_REPO"  # Replace

gh api repos/$APP_REPO/milestones -f title="Phase 0: Inception"    -f description="Idea validation, legal setup, entity formation"
gh api repos/$APP_REPO/milestones -f title="Phase 1: Planning"     -f description="Blueprints, architecture decisions, BOM"
gh api repos/$APP_REPO/milestones -f title="Phase 2: Design"       -f description="Revvel Emblem, wireframes, brand identity"
gh api repos/$APP_REPO/milestones -f title="Phase 3: Development"  -f description="MVP coding sprints — MVI by MVI"
gh api repos/$APP_REPO/milestones -f title="Phase 4: Testing"      -f description="QA, security scanning, field validation"
gh api repos/$APP_REPO/milestones -f title="Phase 5: Deployment"   -f description="Production launch, store submission"
gh api repos/$APP_REPO/milestones -f title="Phase 6: Compliance"   -f description="Privacy policy, SOC2, legal requirements"
gh api repos/$APP_REPO/milestones -f title="Phase 7: Maintenance"  -f description="Monitoring, patches, updates"
```

### Milestone Reference (EXRUP Phases)

| Milestone | Phase | Description |
|---|---|---|
| `Phase 0: Inception` | EXRUP Phase 0 | Idea validation, legal, entity |
| `Phase 1: Planning` | EXRUP Phase 1 | Blueprints, architecture, BOM |
| `Phase 2: Design` | EXRUP Phase 2 | Revvel Emblem, wireframes, brand identity |
| `Phase 3: Development` | EXRUP Phase 3 | MVP coding sprints — MVI by MVI |
| `Phase 4: Testing` | EXRUP Phase 4 | QA, security, field validation |
| `Phase 5: Deployment` | EXRUP Phase 5 | Production launch, store submission |
| `Phase 6: Compliance` | EXRUP Phase 6 | Privacy policy, SOC2, legal |
| `Phase 7: Maintenance` | EXRUP Phase 7 | Monitoring, patches, updates |

---

## 3. GitHub Projects (v2) Board Setup

### Board Name Convention

```text
{PRODUCT_NAME} — Active Development
```

**Examples:**
- `GrowlingEyes — Active Development`
- `Neurooz — Active Development`
- `Revvel Music Studio — Active Development`

### Create a New Board

1. Go to `github.com/{owner}` (org or user profile)
2. Click **Projects** → **New project**
3. Choose **Board** template
4. Name it: `{PRODUCT_NAME} — Active Development`
5. Add the repository to the project
6. **Set the repository as the default repo** (GitHub Projects v2 → Project settings → Repositories → “Set as default”)

### Standard Column Structure

| Column | Purpose |
|---|---|
| **Backlog** | Issues not yet started — exists, prioritized, not active |
| **In Progress** | Actively being worked on in the current sprint |
| **In Review** | PR is open, awaiting review and merge |
| **Blocked** | Needs external action before work can continue |
| **Done** | PR merged and deployed to production |

### Column Automation Rules

Set up these automation rules in GitHub Projects → Workflows:

| Event | Action |
|---|---|
| PR opened → linked issue | Move linked issue to **In Review** |
| PR merged → linked issue | Move linked issue to **Done** |
| Issue labeled `blocked` | Move to **Blocked** |
| Issue assigned | Move to **In Progress** (if in Backlog) |
| Issue labeled `in-review` | Move to **In Review** |

### ARSC Labels Automation Workflow

The `arsc-labels.yml` workflow (copy from `templates/cicd/arsc-labels.yml`) manages labels on issues and pull requests with inline `actions/github-script` calls. It supports **Add**, **Remove**, **Set**, and **Clear** operations without relying on a stale third-party label action.

| Trigger | Automation |
|---|---|
| Issue opened (no labels) | Adds `triage` label so the issue appears in the Backlog |
| Draft PR opened | Adds `draft` label so the project board can filter draft work |
| PR marked Ready for Review | Removes `draft` label automatically |
| Manual `workflow_dispatch` | Operator can run any ARSC operation on any issue or PR number |

**Setup:**

```bash
# Copy to your app repo
cp templates/cicd/arsc-labels.yml .github/workflows/arsc-labels.yml
```

No secrets or configuration changes are required — the workflow uses `GITHUB_TOKEN` throughout.

**Manual usage (via GitHub Actions UI):**

1. Go to **Actions** → **ARSC Labels** → **Run workflow**
2. Enter the issue or PR number in **object-id**
3. Choose an operation: `add`, `remove`, `set`, or `clear`
4. Enter a comma-separated list of labels (not required for `clear`)
5. Click **Run workflow**

**Supported operations:**

| Operation | Description |
|---|---|
| `add` | Adds the specified labels without removing existing ones |
| `remove` | Removes the specified label(s) |
| `set` | Replaces all existing labels with the specified set |
| `clear` | Removes all labels |

---

### Priority Router Automation Workflow

The `priority-router.yml` workflow (copy from `templates/cicd/priority-router.yml`) assigns priority labels (`priority-p0` → `priority-p3`) and re-evaluates the open backlog whenever work is opened or completed.

| Trigger | Automation |
|---|---|
| Issue/PR opened or closed | Sweeps the full open backlog and recalculates priority labels |
| Issue/PR edited, labeled, or unlabeled | Re-runs priority only for the touched item |
| 6-hour cron sweep | Re-evaluates the open backlog at 00:00/06:00/12:00/18:00 UTC |

**Setup:**

```bash
# Copy to your app repo
cp templates/cicd/priority-router.yml .github/workflows/priority-router.yml
```

**Configuration notes:**
- Uses `OPENROUTER_API_KEY` when available; falls back to a rule-based classifier if missing.
- Skips items labeled `needs-human` or `blocked`.
- Tune the cron cadence by editing the `schedule:` block in the workflow (default runs at fixed UTC times).

---

### Ready for Review Automation Workflow

The `ready-for-review.yml` workflow (copy from `templates/cicd/ready-for-review.yml`) automates the full lifecycle between an issue and a PR:

| Trigger | Automation |
|---|---|
| PR opened (non-draft) | Adds `in-review` label to linked issues; posts review checklist comment |
| Draft PR — all CI checks pass | Automatically promotes draft PR to **Ready for Review** |
| PR marked Ready for Review | Adds `in-review` label to linked issues; posts review checklist comment |
| PR closed / merged | Removes `in-review` label from linked issues |

**Setup:**

```bash
# Copy to your app repo
cp templates/cicd/ready-for-review.yml .github/workflows/ready-for-review.yml
```

No secrets or configuration changes are required — the workflow uses `GITHUB_TOKEN` throughout.

**How linked issues are detected:** The workflow parses the PR title and body for any of these patterns (case-insensitive):

```text
Closes #42    Fixes #42    Resolves #42
Close #42     Fix #42      Resolve #42
Closed #42    Fixed #42    Resolved #42
```

GitHub itself closes the linked issues when the PR is merged. The workflow handles the labeling so the project board moves cards automatically.

### PR Labels Automation Workflow

The `pr-labels.yml` workflow (copy from `templates/cicd/pr-labels.yml`) uses [`joerick/pr-labels-action@v1.0.9`](https://github.com/joerick/pr-labels-action) to read the labels applied to a PR and drive label-aware automation.

**How it works:** The action reads all labels on the current PR and exposes them in two ways:

| Output | Format | Example |
|---|---|---|
| Env var `GITHUB_PR_LABEL_<NAME>` | Set to `true` when the label is present | `GITHUB_PR_LABEL_SECURITY=true` |
| Step output `steps.pr-labels.outputs.labels` | Space-padded string of all label names | `" bug security "` |

**Label-driven automations included in the template:**

| Label | Automation triggered |
|---|---|
| `skip-tests` | Posts a `::notice` annotation — lets CI jobs gate on this output and skip test steps |
| `security` | Posts a security review checklist comment on the PR |
| `design` | Posts a design asset checklist comment (screenshots, Figma link, a11y check) |
| `bom-purchase` | Posts a BOM.md update reminder comment |

**Setup:**

```bash
# Copy to your app repo
cp templates/cicd/pr-labels.yml .github/workflows/pr-labels.yml
```

No secrets or configuration changes are required — the workflow uses `GITHUB_TOKEN` throughout.

**Using label outputs in other workflows (e.g. `ci.yml`):**

```yaml
jobs:
  read-labels:
    runs-on: ubuntu-latest
    outputs:
      labels: ${{ steps.pr-labels.outputs.labels }}
    steps:
      - id: pr-labels
        uses: joerick/pr-labels-action@v1.0.9

  test:
    needs: read-labels
    # Skip tests when the `skip-tests` label is applied
    if: "!contains(needs.read-labels.outputs.labels, ' skip-tests ')"
    runs-on: ubuntu-latest
    steps:
      - run: pnpm test
```

**How labels become env vars:** Label names are uppercased and hyphens become underscores.

```text
label: "skip-tests"   →  GITHUB_PR_LABEL_SKIP_TESTS=true
label: "security"     →  GITHUB_PR_LABEL_SECURITY=true
label: "bom-purchase" →  GITHUB_PR_LABEL_BOM_PURCHASE=true
```

---

## 4. PR Review Status Automation Workflow

The `pr-review-status.yml` workflow (copy from `templates/cicd/pr-review-status.yml`) automatically manages PR review status labels and displays visual status badges.

**What it does:**

| Trigger | Automation |
|---|---|
| PR opened (non-draft) | Adds `awaiting-approval` label and posts status badge comment |
| Review submitted | Updates label based on review state (`approved`, `changes-requested`, `review-started`) |
| Review dismissed | Recalculates status and updates label accordingly |
| Multiple reviewers | Aggregates all reviews to determine overall status |

**Review Status Labels:**

| Label | Meaning | Color |
|---|---|---|
| `awaiting-approval` | PR needs review | Yellow (`#fbca04`) |
| `review-started` | Review in progress | Blue (`#0075ca`) |
| `changes-requested` | Reviewer requested changes | Red (`#d93f0b`) |
| `approved` | PR has been approved | Green (`#0e8a16`) |

**Label Priority:** If multiple states exist, `changes-requested` > `approved` > `review-started` > `awaiting-approval`

**Setup:**

```bash
# Copy to your app repo
cp templates/cicd/pr-review-status.yml .github/workflows/pr-review-status.yml
```

No secrets or configuration changes are required — the workflow uses `GITHUB_TOKEN` throughout.

**Status Badge:** The workflow posts/updates a comment on each PR showing:

```markdown
## 📊 PR Review Status

![Status](https://img.shields.io/badge/status-approved-green?style=for-the-badge)

**Current State:** PR has been approved ✅

**Reviewers:**
✅ **@reviewer1** — Approved
🔴 **@reviewer2** — Changes Requested
```

**Complete Documentation:** See [`PR_REVIEW_STATUS_AUTOMATION.md`](PR_REVIEW_STATUS_AUTOMATION.md) for full setup guide, customization options, and troubleshooting.

---

## 5. Project-First Intake (Required)

**Do not create issues directly in the repo.** Issues must be created from the **Project board** so the Project, Status, Milestone, and Labels are attached at creation time.

### Required fields for control & reporting

| Field | Required | Purpose |
|---|---|---|
| Project | Yes | Source of truth for intake and reporting |
| Status | Yes | Backlog → In Progress → In Review → Blocked → Done |
| Milestone | Yes | EXRUP phase tracking |
| Labels | Yes | Type + routing (e.g., `triage`, `bug`, `enhancement`, `blocked`) |
| Assignee | Optional | Ownership (human or orchestrator) |

| Linked PR | Required before closing | Enables automation and lifecycle transitions |

### Create from Project (preferred)
1. Open the Project board
2. **Add item** → **Create new issue**
3. Fill in **Milestone** + **Labels** immediately
4. Confirm **Status = Backlog**

### CLI (allowed, but still project-first)
```bash
gh issue create \
  --title "..." \
  --body "..." \
  --project "{PRODUCT_NAME} — Active Development" \
  --milestone "Phase 3: Development" \
  --label "triage,enhancement"
```

### Project gate checklist (no CLI helper for now)
- Project exists and is named `{PRODUCT_NAME} — Active Development`
- Repo is added **and set as default**
- Standard columns present (Backlog/In Progress/In Review/Blocked/Done)
- EXRUP milestones created
- Standard labels synced

### Guardrail workflow proposal (optional)
Create a lightweight workflow that:
- Triggers on **issue opened** and a **daily schedule**
- Detects issues missing a Project
- **Auto-adds** them to the default Project Backlog **or** applies a `needs-project`/`triage` label + comment
- Optionally flags missing Milestone with `needs-milestone`

Suggested building blocks:
- `actions/add-to-project` for auto-adding issues to a Project
- `actions/github-script` for label + comment enforcement

---

## 6. End-to-End Flow (Project → Issue → Milestone → PR → Automation)

1. **Project created** and default repo set
2. **Issue created from Project** with Milestone + Labels
3. **PR opened** and linked via `Closes #123`
4. **Automation fires**:
   - `in-review` label when PR opens
   - Project Status moves to **In Review**
   - PR merge moves Issue to **Done**

---

## 7. Per-App Error Label

Each app repo must have a project-specific error label for the `monitored()` system:

```bash
APP_REPO="midnghtsapphire/YOUR_REPO"
APP_NAME="your-app-name"  # e.g., growlingeyes

gh label create "${APP_NAME}/error" --color "cc0000" --description "Auto-created error report from monitored() system" --repo $APP_REPO
```

See `standards/ERROR_REPORTING_STANDARD.md` — Section 6 for full details on the GitHub label convention.

---

## 8. Complete New Repo Setup Checklist

When creating a new Revvel application repository:

```bash
#!/bin/bash
APP_REPO="midnghtsapphire/NEW_REPO"
APP_NAME="new-app-name"

# 0. Migrate repo to enterprise org + configure global secrets/PATs
# (see REPOSITORY_PRIVACY_MIGRATION_STANDARD.md + SECRETS_MANAGEMENT.md)

# 1. Create GitHub Project board + set default repo
# (manual step — do in GitHub UI)

# 2. Sync standard labels (automated — recommended)
cp .github/labels.yml             $APP_NAME/.github/labels.yml
cp templates/cicd/sync-labels.yml $APP_NAME/.github/workflows/sync-labels.yml
# OR run manually:
# (run all gh label create commands from Section 1)

# 3. Create EXRUP milestones
# (run all gh api commands from Section 2)

# 4. Create error reporting label
gh label create "${APP_NAME}/error" --color "cc0000" --description "Auto error report" --repo $APP_REPO

# 5. Copy CI/CD workflow templates
cp templates/cicd/ready-for-review.yml .github/workflows/ready-for-review.yml
cp templates/cicd/pr-labels.yml        .github/workflows/pr-labels.yml

# 6. Run bootstrap script
bash scripts/bootstrap-new-project.sh $APP_NAME 164.90.148.7 https://[PRODUCTION_URL]
```

---

## 9. Issue Templates

Create these issue templates in `.github/ISSUE_TEMPLATE/` of each app repo:

### Deep Research (Universal)

Use the universal deep-research issue form as the default entry point.

```bash
mkdir -p .github/ISSUE_TEMPLATE
cp templates/github/ISSUE_TEMPLATE/deep-research.yml .github/ISSUE_TEMPLATE/deep-research.yml
```

### Bug Report (`bug-report.yml`)

```yaml
name: Bug Report
description: Something isn't working
labels: ["bug"]
body:
  - type: input
    id: description
    attributes:
      label: What happened?
      placeholder: Describe the bug
    validations:
      required: true
  - type: input
    id: reproduction
    attributes:
      label: Steps to reproduce
      placeholder: "1. Go to... 2. Click... 3. See error..."
    validations:
      required: true
  - type: dropdown
    id: severity
    attributes:
      label: Severity
      options: [low, medium, high, critical]
    validations:
      required: true
```

### MVI Request (`mvi-request.yml`)

```yaml
name: MVI Feature Request
description: Request a new Minimum Viable Increment
labels: ["enhancement"]
body:
  - type: input
    id: feature
    attributes:
      label: Feature (one sentence)
      placeholder: "As a [role], I can [action], so that [outcome]"
    validations:
      required: true
  - type: dropdown
    id: milestone
    attributes:
      label: EXRUP Phase
      options:
        - "Phase 3: Development"
        - "Phase 4: Testing"
        - "Phase 5: Deployment"
    validations:
      required: true
```
