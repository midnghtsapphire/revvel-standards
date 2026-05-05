# GitHub Project v2 Workflow Setup

This bundle contains GitHub Actions workflows for automatically setting default single-select field values on new issues added to a GitHub Project v2.

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
EFFORT_FIELD_ID
CUSTOM_SELECT_FIELD_ID
PRIORITY_HIGH_OPTION_ID
EFFORT_MEDIUM_OPTION_ID
CUSTOM_DEFAULT_OPTION_ID
```

The values come from the helper workflow output.

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
- The default-field workflow assumes Priority, Effort, and the custom field are all single-select fields.
- If your field names or option names differ, only the variable names need to map to the correct field and option IDs.
