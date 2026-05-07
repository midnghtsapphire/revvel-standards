# GitHub Project Schema

> 📖 **Read first — before provisioning the board:** [`docs/reference/github-projects-automation-guide.pdf`](./reference/github-projects-automation-guide.pdf) (8 pages, ~15 min). Documents the GraphQL API, auth-scope rules (`GITHUB_TOKEN` cannot reach Projects), the two-step `addProjectV2ItemById` → `updateProjectV2ItemFieldValue` pattern, and the platform limits (50 fields per Project, 50 options per single-select, 25 issue fields per org, 10 pinned per issue type) that constrain every decision below. Without these constraints in mind, the schema below is just a wishlist.

> 🛠 **Then read:** [`docs/github-project-v2-workflows.md`](./github-project-v2-workflows.md) for the operator setup walkthrough that wires the default-field-setter workflows to the schema below.

The Revvel operating model uses a single GitHub Project to track every work request from intake through launch and measurement. The project enforces routing decisions made in the [Devin Work Request](../.github/ISSUE_TEMPLATE/devin-work-request.yml) form and the [Viability Gate](../templates/viability-gate-template.md).

## Field Schema

| Field name         | Type          | Options / use                                                                                                   |
| ------------------ | ------------- | --------------------------------------------------------------------------------------------------------------- |
| Status             | Single select | Inbox, Researching, Scored, Hold, Archived, Approved, In Build, In Review, Ready to Launch, Launched, Measuring |
| Output Type        | Single select | Match issue form options                                                                                        |
| Research Mode      | Single select | standard, deepresearch                                                                                          |
| Delivery Mode      | Single select | build-direct, build-with-brief-options, proposal-first                                                          |
| Iteration Mode     | Single select | single-pass, multi-iteration                                                                                    |
| Lifecycle Mode    | Single select | new-build, refresh-existing, audit-only                                                                         |
| Commercial Mode    | Single select | digital-product, saas-app, api-usage, license, client-billable, internal-only                                   |
| Deployment Target  | Single select | none, vercel, desktop-env, client-env, docs-only, package-manager, api-host                                     |
| Decision           | Single select | BUILD, HOLD, ARCHIVE                                                                                            |
| Viability Score    | Number        | Total score from rubric                                                                                         |
| Problem Pain       | Number        | 1–5                                                                                                             |
| Market Value       | Number        | 1–5                                                                                                             |
| Differentiation    | Number        | 1–5                                                                                                             |
| Build Leverage     | Number        | 1–5                                                                                                             |
| Monetization Fit   | Number        | 1–5                                                                                                             |
| Strategic Fit      | Number        | 1–5                                                                                                             |
| Marketing Ready    | Single select | No, Needs Review, Yes                                                                                           |
| Launch Channel     | Single select | None, Organic Social, Email, SEO, Marketplace, Direct Outreach, Client Delivery                                 |
| Priority           | Single select | low, medium, high, urgent                                                                                       |
| Owner Notes        | Text          | Reviewer/operator notes                                                                                         |
| Target Launch Date | Date          | Planned launch date                                                                                             |
| Review Date        | Date          | Next review or revisit date                                                                                     |

## Status Lifecycle

```
Inbox → Researching → Scored
                      ├── Hold       (Decision = HOLD)
                      ├── Archived   (Decision = ARCHIVE)
                      └── Approved   (Decision = BUILD)
                                     └── In Build → In Review → Ready to Launch → Launched → Measuring
```

Rules:

- New issues opened in this repo enter `Inbox` automatically. The default-field workflow does not filter by template, so issues from `devin-work-request.yml`, the legacy `issue.yml`, and bot-created issues all land on the board. To restrict the board to operating-model work requests only, add a job-level `if: contains(github.event.issue.labels.*.name, 'work-request')` guard to `.github/workflows/set-default-project-v2-fields.yml` (or its PAT variant).
- After deep research is performed, the item moves to `Researching`.
- After the viability rubric is filled in, the item moves to `Scored`.
- The `Decision` field is the gate between `Scored` and the build / hold / archive lanes.
- Build work then progresses through `In Build → In Review → Ready to Launch → Launched → Measuring`.

## Field Mapping from the Work Request Form

| Issue form field         | Project field          |
| ------------------------ | ---------------------- |
| Output Type              | Output Type            |
| Research Mode            | Research Mode          |
| Delivery Mode            | Delivery Mode          |
| Iteration Mode           | Iteration Mode         |
| Lifecycle Mode           | Lifecycle Mode         |
| Commercial Mode          | Commercial Mode        |
| Deployment Target        | Deployment Target      |
| Launch Priority          | Priority               |

The remaining project fields are populated by reviewers during the research, scoring, and launch phases.

## Default-Field Automation

New issues are automatically added to the project board by [`.github/workflows/set-default-project-v2-fields.yml`](../.github/workflows/set-default-project-v2-fields.yml) (or its PAT variant). The workflow runs on every issue open and can also be re-run manually for backfill.

The workflow applies the following "Revvel-standard" default values to new work items:

- **Status**: `Inbox`
- **Priority**: `medium`
- **Research Mode**: `standard`
- **Delivery Mode**: `build-direct`
- **Iteration Mode**: `single-pass`
- **Lifecycle Mode**: `new-build`
- **Commercial Mode**: `digital-product`
- **Marketing Ready**: `No`

**Explicit choice preservation**: The automation parses the Work Request issue body. If you explicitly select a non-default value in the WR form (e.g., `Lifecycle Mode=refresh-existing`), the automation will respect your choice and will not overwrite it.

It expects these to be configured at the org or repo level before it will succeed:

**Repository / organization variables** (Settings → Variables → Actions):

| Variable          | What it is                        | Example format |
| ----------------- | --------------------------------- | -------------- |
| `PROJECT_ID`      | Project v2 node ID                | `PVT_kwHOA...` |
| `PROJECTS_APP_ID` | GitHub App ID (App workflow only) | `123456`       |

**Repository / organization secret**:

- `PROJECTS_APP_PRIVATE_KEY` — private key for the GitHub App referenced by `PROJECTS_APP_ID` (App workflow only).
- `PROJECTS_PAT` — classic PAT secret used by `default-project-v2-fields-pat.yml` (PAT workflow only).

**GitHub App permissions**:

- Organization: Projects = Read & write
- Repository: Issues = Read

Use exactly one auth path:

- **GitHub App path:** `PROJECTS_APP_ID` + `PROJECTS_APP_PRIVATE_KEY`
- **Classic PAT path:** `PROJECTS_PAT`

Until `PROJECT_ID` and one auth path are populated, the default-field workflow cannot write project values.

---

## Marketing Activation Gate

`Marketing Ready` and `Launch Channel` exist so that automated launch / marketing workflows have a deterministic gate. Marketing automation should only fire when:

- `Decision` = `BUILD`
- `Status` ∈ { `Ready to Launch`, `Launched` }
- `Marketing Ready` = `Yes`
- `Launch Channel` ≠ `None`

This prevents shipped-but-not-yet-positioned work from being auto-promoted.
