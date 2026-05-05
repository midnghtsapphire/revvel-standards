# GitHub Project v2 Workflow Setup

This bundle contains GitHub Actions workflows for automatically setting default single-select field values on new issues added to a GitHub Project v2.

---

## Live deployment for `revvel-standards`

**Project board:** [https://github.com/users/midnghtsapphire/projects/5](https://github.com/users/midnghtsapphire/projects/5) — `Revvel-Standards`

**Auth path in use:** classic PAT (`PROJECTS_PAT` repo secret on `midnghtsapphire/revvel-standards`). The GitHub App path stays defined in the workflow files but is intentionally unconfigured; its preflight job emits a `::notice::` and the main job is `skipped` per [PR #13333](https://github.com/midnghtsapphire/revvel-standards/pull/13333).

**ID storage:** repo variables on `midnghtsapphire/revvel-standards` (not org-level). Only `PROJECT_ID` is strictly required for the automation to run, as the node.js script dynamically fetches the field nodes based on the schema.

**Default fields written by the workflow on every new issue:**

The workflow runs a node script (`.github/scripts/set-project-fields.js`) that dynamically queries the project schema to map the following 8 fields:

- **Status**: `Inbox`
- **Priority**: `medium`
- **Research Mode**: `standard`
- **Delivery Mode**: `build-direct`
- **Iteration Mode**: `single-pass`
- **Lifecycle Mode**: `new-build`
- **Commercial Mode**: `digital-product`
- **Marketing Ready**: `No`

**Explicit choice preservation**: The node script parses the Work Request issue body. If it finds a deliberate user choice in the markdown for any of the fields (e.g., `Lifecycle Mode=refresh-existing`), it will prioritize the user's choice over the hardcoded default listed above.

### Live values

```text
PROJECT_ID = PVT_kwHOAEa8uc4BU_1U
```

*(Note: Legacy individual ID variables like `PRIORITY_FIELD_ID` were removed in favor of dynamic GraphQL schema lookup via the Node script)*

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

Create this as a repository, organization, or environment variable:

```text
PROJECT_ID
```

*(The workflow parses the issue body and queries the GraphQL schema dynamically, eliminating the need to store a dozen separate option/field IDs in repository variables.)*

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

## Notes

- The main workflow triggers on `issues.opened`.
- If the issue is already in the project, the workflow attempts to find the existing Project v2 item and update it.
- The default-field workflow parses the issue body and queries the API dynamically. If you change a Project v2 field name or option in the future, you must update the fallback mappings in `.github/scripts/set-project-fields.js`.
- Each workflow has a preflight job that probes its credentials in step-level `env:` (where the `secrets` context is allowed) and exposes a boolean output. The main job gates on `needs.preflight.outputs.has_creds == 'true'`. This pattern was added in [PR #13333](https://github.com/midnghtsapphire/revvel-standards/pull/13333) because the GitHub Actions parser rejects `secrets.X` references in job-level `if:` conditions.
