# GitHub Projects Setup Guide

Complete guide to setting up GitHub Projects, Labels, and Milestones for the Revvel ecosystem.

**Note:** This document describes the setup steps — it does not create actual GitHub Projects or issues. Follow these steps manually or via the GitHub CLI (`gh`) when setting up a new repository.

---

## 1. Standard Label Set

Apply these labels to ALL Revvel repositories. Run the GitHub CLI commands below or create them manually in GitHub → Settings → Labels.

```bash
# Run in your repo root (requires `gh` CLI authenticated)
APP_REPO="midnghtsapphire/YOUR_REPO"  # Replace with your repo

gh label create "bug"             --color "d73a4a" --description "Something isn't working"              --repo $APP_REPO
gh label create "enhancement"     --color "a2eeef" --description "New feature or request"               --repo $APP_REPO
gh label create "security"        --color "cc0000" --description "Security vulnerability or concern"    --repo $APP_REPO
gh label create "bom-purchase"    --color "ffd700" --description "Requires a purchase (links to BOM.md)" --repo $APP_REPO
gh label create "design"          --color "7057ff" --description "Design/brand work needed"             --repo $APP_REPO
gh label create "blocked"         --color "e4e669" --description "Blocked by external dependency"       --repo $APP_REPO
gh label create "in-review"       --color "fbca04" --description "Linked PR is open and ready for review" --repo $APP_REPO
gh label create "auto-fix"        --color "0075ca" --description "Created by auto-fix workflow"         --repo $APP_REPO
gh label create "copilot"         --color "0075ca" --description "Assigned to Copilot for fixing"       --repo $APP_REPO
gh label create "documentation"   --color "0075ca" --description "Documentation only"                   --repo $APP_REPO
gh label create "good-first-issue" --color "7057ff" --description "Good for newcomers"                  --repo $APP_REPO
gh label create "wontfix"         --color "ffffff" --description "This will not be worked on"           --repo $APP_REPO
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
| `in-review` | `#fbca04` | Linked PR is open and ready for review (set automatically) |
| `auto-fix` | `#0075ca` | Created by auto-fix workflow |
| `copilot` | `#0075ca` | Assigned to Copilot for fixing |
| `documentation` | `#0075ca` | Documentation only |
| `good-first-issue` | `#7057ff` | Good for newcomers |
| `wontfix` | `#ffffff` | This will not be worked on |

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

```
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

```
Closes #42    Fixes #42    Resolves #42
Close #42     Fix #42      Resolve #42
Closed #42    Fixed #42    Resolved #42
```

GitHub itself closes the linked issues when the PR is merged. The workflow handles the labeling so the project board moves cards automatically.

### Issue Auto-Labeling & Templates Workflow

Use the Devlander Issue Labeler action to bootstrap and maintain professional issue templates and labels automatically.

**Setup:**

```bash
# Copy to your app repo
cp templates/cicd/auto-label-issues.yml .github/workflows/auto-label-issues.yml
```

It runs on `issues` (opened/edited) and `pull_request` (opened/edited/synchronize) to:

- Create and maintain issue templates
- Create and maintain standardized labels
- Auto-label issues and PRs based on content/changed files

### Link Issues to a Project

When creating issues in your app repo, assign them to the project using:
```bash
# Via GitHub CLI
gh issue create --title "..." --body "..." --project "GrowlingEyes — Active Development"
```

Or link manually from the issue sidebar → **Projects** → select project.

---

## 4. Per-App Error Label

Each app repo must have a project-specific error label for the `monitored()` system:

```bash
APP_REPO="midnghtsapphire/YOUR_REPO"
APP_NAME="your-app-name"  # e.g., growlingeyes

gh label create "${APP_NAME}/error" --color "cc0000" --description "Auto-created error report from monitored() system" --repo $APP_REPO
```

See `standards/ERROR_REPORTING_STANDARD.md` — Section 6 for full details on the GitHub label convention.

---

## 5. Complete New Repo Setup Checklist

When creating a new Revvel application repository:

```bash
#!/bin/bash
APP_REPO="midnghtsapphire/NEW_REPO"
APP_NAME="new-app-name"

# 1. Create standard labels
# (run all gh label create commands from Section 1)

# 2. Create error reporting label
gh label create "${APP_NAME}/error" --color "cc0000" --description "Auto error report" --repo $APP_REPO

# 3. Create EXRUP milestones
# (run all gh api commands from Section 2)

# 4. Create GitHub Project board
# (manual step — do in GitHub UI)

# 5. Run bootstrap script
bash scripts/bootstrap-new-project.sh $APP_NAME 164.90.148.7 https://[PRODUCTION_URL]
```

---

## 6. Issue Templates

Create these issue templates in `.github/ISSUE_TEMPLATE/` of each app repo:

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
