# GitHub Project v2 Workflow Setup

This bundle contains GitHub Actions workflows for automatically setting default single-select field values on new issues added to a GitHub Project v2.

---

## Live deployment for `revvel-standards`

**Project board:** [https://github.com/users/midnghtsapphire/projects/5](https://github.com/users/midnghtsapphire/projects/5) — `Revvel-Standards`

**Auth path in use:** classic PAT (`PROJECTS_PAT` repo secret on `midnghtsapphire/revvel-standards`). The GitHub App path stays defined in the workflow files but is intentionally unconfigured; its preflight job emits a `::notice::` and the main job is `skipped` per [PR #13333](https://github.com/midnghtsapphire/revvel-standards/pull/13333).

**ID storage:** repo variables on `midnghtsapphire/revvel-standards` (not org-level). All seven workflow inputs are populated; see the [Live values](#live-values) section below.

**Default fields written by the workflow on every new issue:**

| Repo variable name | Project field | Default option |
| ------------------ | ------------- | -------------- |
| `PRIORITY_FIELD_ID` | `Priority` | `medium` |
| `EFFORT_FIELD_ID` *(legacy name)* | `Status` | `Inbox` |
| `CUSTOM_SELECT_FIELD_ID` *(legacy name)* | `Research Mode` | `standard` |

The legacy variable names (`EFFORT_FIELD_ID`, `CUSTOM_SELECT_FIELD_ID`, `PRIORITY_HIGH_OPTION_ID`, `EFFORT_MEDIUM_OPTION_ID`) are retained from the original workflow template to keep the existing workflow YAML untouched. The field-ID variables point at fields whose actual names are `Status` and `Research Mode`. `PRIORITY_HIGH_OPTION_ID` stores the option ID for `Priority: medium` (`be3c0726`) and `EFFORT_MEDIUM_OPTION_ID` stores the option ID for `Status: Inbox` (`0aff196f`) — the variable names are misleading but the values are correct per the default-fields mapping table above. The variable name is opaque to the workflow — only the value (the field/option node ID) matters at runtime.

### Live values

```text
PROJECT_ID                = PVT_kwHOAEa8uc4BU_1U
PRIORITY_FIELD_ID         = PVTSSF_lAHOAEa8uc4BU_1UzhSD5Fo   (Priority field)
EFFORT_FIELD_ID           = PVTSSF_lAHOAEa8uc4BU_1UzhQer44   (Status field)
CUSTOM_SELECT_FIELD_ID    = PVTSSF_lAHOAEa8uc4BU_1UzhSD5EM   (Research Mode field)
PRIORITY_HIGH_OPTION_ID   = be3c0726                          (Priority: medium)
EFFORT_MEDIUM_OPTION_ID   = 0aff196f                          (Status: Inbox)
CUSTOM_DEFAULT_OPTION_ID  = e971d6c3                          (Research Mode: standard)
```

### Validation evidence (bootstrap WR)

- Test WR: [#13334](https://github.com/midnghtsapphire/revvel-standards/issues/13334)
- PAT workflow run: [run #3, success](https://github.com/midnghtsapphire/revvel-standards/actions/runs/25389488732) — issue added to project, three default fields written
- App workflow run: [run #1, gating skipped](https://github.com/midnghtsapphire/revvel-standards/actions/runs/25389488631) — preflight emitted `::notice::PROJECTS_APP_ID and PROJECTS_APP_PRIVATE_KEY not configured`, main job `skipped` (gray, no errors)

### Re-running the ID discovery workflow

If you add new fields, change option IDs, or move the project, re-run the helper workflow to refresh the IDs:

1. Go to **Actions** → **Print Project v2 IDs (PAT)** → **Run workflow**
2. Inputs: `owner_type=user`, `owner=midnghtsapphire`, `project_number=5`
3. Copy the printed values back into the seven repo variables on `midnghtsapphire/revvel-standards/settings/variables/actions`

---

## Files included

- `set-default-project-v2-fields.yml`: Main workflow using a GitHub App token.
- `default-project-v2-fields-pat.yml`: Main workflow using a classic personal access token.
- `print-project-v2-ids.yml`: Helper workflow using a GitHub App token to print Project v2 field and option IDs.
- `print-project-v2-ids-pat.yml`: Helper workflow using a classic personal access token to print Project v2 field and option IDs.

## Recommended setup order

1. Copy one helper workflow into `.github/workflows/`.
   - Use `print-project-v2-ids.yml` if you want GitHub App authentication.
   - Use `print-project-v2-ids-pat.yml` if you want classic PAT authentication.
2. Run the helper workflow manually from the GitHub Actions tab.
3. Copy the printed Project, field, and option IDs into repository or organization variables.
4. Copy one main workflow into `.github/workflows/`.
   - Use `set-default-project-v2-fields.yml` for GitHub App authentication.
   - Use `default-project-v2-fields-pat.yml` for classic PAT authentication.
5. Open a test issue and confirm the Project v2 fields are set automatically.

## Required variables for the main workflow

Create these as repository, organization, or environment variables:

```text
PROJECT_ID
PRIORITY_FIELD_ID
STATUS_FIELD_ID
RESEARCH_MODE_FIELD_ID
PRIORITY_MEDIUM_OPTION_ID
STATUS_INBOX_OPTION_ID
RESEARCH_MODE_STANDARD_OPTION_ID
```

The values come from the helper workflow output. For the live values currently set on this repo, see the [Live deployment](#live-deployment-for-revvel-standards) section above.

## GitHub App authentication

Use this option for organization-owned Project v2 boards when possible.

Create a GitHub App with:

- Organization permissions: Projects = Read and write
- Repository permissions: Issues = Read-only

Then create:

```text
Variable: PROJECTS_APP_ID
Secret: PROJECTS_APP_PRIVATE_KEY
```

Use these workflows:

```text
print-project-v2-ids.yml
set-default-project-v2-fields.yml
```

## Classic PAT authentication

Create a classic personal access token with:

```text
project
repo
```

For public repositories only, `public_repo` may be enough instead of `repo`.

Then create:

```text
Secret: PROJECTS_PAT
```

Use these workflows:

```text
print-project-v2-ids-pat.yml
default-project-v2-fields-pat.yml
```

## Manual backfill

Both main workflows support manual runs with `workflow_dispatch`.

Enter an `issue_number` to add or update defaults for an existing issue.

## Auto-classifier — extending the floor with LLM-picked routing fields

The default-field workflows above set a 3-field **floor** on every new issue
(`Status=Inbox`, `Priority=medium`, `Research Mode=standard`). They run
unconditionally and are the safety net.

`.github/workflows/wr-auto-classify.yml` extends this floor by classifying the
**other** routing dropdowns from the issue body using OpenRouter
(`anthropic/claude-sonnet-4`):

- `Output Type`, `Delivery Mode`, `Iteration Mode`, `Lifecycle Mode`,
  `Commercial Mode`, `Deployment Target`, `Priority` (overrides the floor's
  `medium` if the body suggests otherwise), `Research Mode` (overrides
  `standard` if the body says `deepresearch`).

Behavior:

1. **Respects explicit picks.** If the WR form has an explicit non-`auto-classify`
   value for a field, that value wins; the classifier leaves it alone.
2. **Calls OpenRouter for blanks/`auto-classify`.** Fills only the fields the
   user left as `auto-classify` or empty.
3. **Falls back to opinionated defaults** if OpenRouter is unavailable or
   replies with malformed output: `internal-script-automation` / `standard`
   / `build-direct` / `single-pass` / `new-build` / `internal-only` /
   `none` / `medium`. When any fallback is used the issue is labeled
   `auto:default-fallback` so a human can spot-check.
4. **Posts a comment** on the issue summarizing each field's value AND its
   source (`explicit` / `classifier` / `fallback`).
5. **Applies an `output-type:<type>` label** to the issue so downstream
   automation can easily read the routing decision (e.g. `wr-pr-creation.yml`
   skipping app scaffolding for PDF/docs).

Required credentials (both already configured for `revvel-standards`):

- `secrets.PROJECTS_PAT` (classic PAT, `project` + `repo` scopes) — write to Project v2.
- `secrets.OPENROUTER_API_KEY` — call the LLM. Optional; classifier degrades to
  fallback defaults if missing.

Both are checked by a preflight job (same pattern as #13333). The skip
behavior differs by which credential is missing:

- `PROJECTS_PAT` missing → main `classify` job is **skipped** (cannot
  write to Project v2 without it). The preflight emits a `::notice::`
  explaining why; nothing fails.
- `OPENROUTER_API_KEY` missing → main `classify` job **still runs** and
  applies opinionated fallback defaults instead of LLM-inferred values.
  This is intentional so missing LLM access never blocks WR routing.

## Issue template structure

The `New Issue` chooser shows two cards, both of which apply the
`work-request` and `weekly-research` labels so the auto-classifier and
downstream automation (`wr-pr-creation.yml`, `jules-invoke.yml`, the Project
v2 board sync) treat them identically. WR workflows also accept the BASIC WR
issue type and normalize missing labels. Numeric prefixes force the sort order per
[GitHub's documented ordering rules][gh-template-order].

- `.github/ISSUE_TEMPLATE/00-work-request.yml` — primary, anti-under-scoping
  human form. The `00-` prefix sorts it first. Output Type is the only
  required field; routing/scope fields are optional so intake can stay fast and
  research automation can backfill context. The anti-under-scoping fields still
  exist (Summary, Objective, Required Bundle, Definition of Done, Do Not
  Under-Scope, Delivery Shape, Blocker Rule) for explicit bundle contracts.
- `.github/ISSUE_TEMPLATE/10-OpenHands-system-wr.yml` — lightweight system form.
  The `10-` prefix sorts it after the heavy form. Output Type is the only
  required routing decision; every other routing dropdown defaults to
  `auto-classify` and is filled from prose by [`wr-auto-classify.yml`](
  ../.github/workflows/wr-auto-classify.yml). Carries the extra `quick` and
  `OpenHands` labels so workflows can distinguish lightweight WRs from primary
  ones if needed. Use this for low-risk, internal, or agent-driven work.
- `.github/ISSUE_TEMPLATE/config.yml` — `blank_issues_enabled: false` plus a
  single `contact_link` to the operating docs.

Older templates (`daily-decision.md`, `exit-quiet-mode.md`, `issue.yml`,
`urgent-compliance.md`, `work-request.yml`) live in
`templates/issue-template-archive/` for reference but are NOT in the chooser.
See `templates/issue-template-archive/README.md` for why each was retired.

[gh-template-order]: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository

## Chronic CI failures fixed alongside this work

Three CI checks were red on every recent PR (#13329 through #13336). The two
that originated inside this repo were fixed in this PR; the third is external.

| Check | Status | Resolution |
| ----- | ------ | ---------- |
| `log-agent-action` (Agent Audit Logger) | **fixed** | The `pull_request` trigger was removed from `.github/workflows/agent-audit-logger.yml`. The job tried to push the audit log to `main` from a PR-branch checkout, which the `Protect main` ruleset blocks → 100% failure rate. Issue/comment/review/cron triggers stay because they CAN push. |
| `ci/circleci: pr-review` | **fixed** | The `pr-review` job was removed from `.circleci/config.yml`'s `pr-workflow`. It required `OPENROUTER_API_KEY` to be set in **CircleCI's** project env (it wasn't), and it duplicated work already done by OpenHands Review + Jules + BITO AI on every PR. |
| `recurseml/analysis` | **external** | Posted by the RecurseML GitHub App, not by a workflow in this repo. The in-repo workflow `.github/workflows/recurse-ml.yml` already disables its `pull_request` trigger. To make this status check stop appearing on PRs, uninstall the RecurseML app at <https://github.com/settings/installations> or set its `RECURSE_ML_API_KEY` so it succeeds. Branch protection on `main` does not require this check, so it's visual noise rather than a merge blocker. |
| `Analyze (ruby)` (CodeQL Advanced) | **fixed** | Fixed in the Project v2 workflow bundle's target repos (not in `revvel-standards`, where `.github/workflows/codeql.yml` remains active and has since been enhanced). In those target repos, CodeQL was replaced with [Semgrep](https://semgrep.dev/) + [Trivy](https://trivy.dev/) in a follow-up PR after #13338 because the per-language matrix included Ruby while those repos had zero `.rb` files, causing analyzer exit 32 (`CodeQL could not process any code written in Ruby`) on every PR. |

## Security scanning stack

The PR-time security scanning has been consolidated to four tools that are
fast, multi-language by default, and don't fail on missing source files:

| Tool | Layer | Trigger | Why |
| ---- | ----- | ------- | --- |
| [Semgrep](https://semgrep.dev/) | SAST (code patterns) | every PR + weekly | Replaces CodeQL. ~30s, OSS rules cover OWASP Top 10, CWE Top 25, GitHub Actions hardening, secrets, Dockerfiles. No per-language matrix (auto-detect). |
| [Trivy](https://trivy.dev/) | SCA + IaC + secrets | every PR + weekly | Single-tool dependency vulnerabilities + Infrastructure-as-Code misconfigs + supplementary secret scanning. Auto-detects everything in the filesystem. |
| [GitGuardian](https://www.gitguardian.com/) | git-leak / runtime secrets | every PR | Already configured at the org level. Catches committed secrets in any file. |
| [Mabl](https://www.mabl.com/) | behavioral E2E tests | every PR | Already configured. Tests deployed Vercel preview, complements static scanners. |

CodeQL was removed **from this Project v2 workflow bundle's target repos**
(not from `revvel-standards` itself, where `.github/workflows/codeql.yml`
still runs on every push/PR plus a weekly schedule) because:

1. Its per-language matrix included `ruby` even though the repo has no Ruby
   code, causing a configuration-error failure on every PR.
2. Even working, it's the slowest option (5+ min vs ~30s for Semgrep).
3. Coverage overlap: Semgrep + Trivy cover everything CodeQL would have
   caught for the languages this repo actually uses (JS/TS, Python, GitHub
   Actions, YAML, Dockerfiles).

Findings from Semgrep and Trivy are uploaded as SARIF and surface under
**Security → Code scanning** alongside any other tools.

## Notes

- The main workflow triggers on `issues.opened`.
- If the issue is already in the project, the workflow attempts to find the existing Project v2 item and update it.
- The default-field workflow assumes Priority, Status, and Research Mode are all single-select fields.
- If your field names or option names differ, only the variable names need to map to the correct field and option IDs.
- Each workflow has a preflight job that probes its credentials in step-level `env:` (where the `secrets` context is allowed) and exposes a boolean output. The main job gates on `needs.preflight.outputs.has_creds == 'true'`. This pattern was added in [PR #13333](https://github.com/midnghtsapphire/revvel-standards/pull/13333) because the GitHub Actions parser rejects `secrets.X` references in job-level `if:` conditions.
