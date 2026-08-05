# Labels as Parameters

**Version:** 1.0.0
**Date:** April 15, 2026
**Status:** Implemented
**Action:** [`matheusvellone/labels-as-parameters@1.0.0`](https://github.com/matheusvellone/labels-as-parameters)

---

## 1. What Is It

`labels-as-parameters` is a GitHub Action that reads the labels on a Pull Request and converts any label that follows a `key:value` naming convention into a named step output. Downstream workflow steps can then read those outputs as if they were regular workflow inputs — no manual `workflow_dispatch` form required.

This allows non-technical stakeholders (or developers who prefer clicking over typing) to control deployment targets, feature flags, or conditional logic simply by applying a label to a PR.

---

## 2. Why Use It

| Problem | Without labels-as-parameters | With labels-as-parameters |
|---|---|---|
| Targeting a specific environment | Edit the workflow file or trigger `workflow_dispatch` manually | Apply `environment:production` label to the PR |
| Deploying a subset of microservices | Hard-code the project name or maintain multiple workflow files | Apply `project:api` label to the PR |
| Emergency test bypass | Comment out test steps (risky) | Apply `skip-tests:true` label (audit trail in Git) |

---

## 3. How It Works

```text
PR has labels:
  environment:staging
  project:api

          ↓

labels-as-parameters action reads all labels,
splits each on the separator (default: ":"),
and sets step outputs:

  steps.parameters.outputs.environment  →  "staging"
  steps.parameters.outputs.project      →  "api"

          ↓

Downstream steps consume the outputs:

  if: needs.extract-parameters.outputs.environment == 'staging'
```

---

## 4. Revvel Label Conventions

Use these standard label names across all Revvel repos. Create them with the bootstrap commands in `docs/GITHUB_PROJECTS_SETUP.md` or run the snippets below.

### Deployment environment

| Label | Meaning |
|---|---|
| `environment:staging` | Deploy to the staging droplet |
| `environment:production` | Deploy to the production droplet |

### Project / microservice targeting

| Label | Meaning |
|---|---|
| `project:api` | Deploy the API service only |
| `project:web` | Deploy the web front-end only |
| `project:worker` | Deploy the background worker only |

### Control flags

| Label | Meaning |
|---|---|
| `skip-tests:true` | Skip test suite — requires a second approving reviewer |

### Bootstrap commands

```bash
# Run in your repo root (requires `gh` CLI authenticated)
APP_REPO="midnghtsapphire/YOUR_REPO"

gh label create "environment:staging"    --color "0075ca" --description "Deploy to staging"     --repo $APP_REPO
gh label create "environment:production" --color "cc0000" --description "Deploy to production"   --repo $APP_REPO
gh label create "project:api"            --color "a2eeef" --description "Target: API service"    --repo $APP_REPO
gh label create "project:web"            --color "a2eeef" --description "Target: Web frontend"   --repo $APP_REPO
gh label create "project:worker"         --color "a2eeef" --description "Target: Background worker" --repo $APP_REPO
gh label create "skip-tests:true"        --color "e4e669" --description "Skip test suite (emergency only)" --repo $APP_REPO
```

---

## 5. Implementation

### Step 1 — Copy the workflow template

```bash
cp templates/cicd/labels-as-parameters.yml .github/workflows/labels-as-parameters.yml
```

### Step 2 — Create the labels

Run the bootstrap commands from Section 4 above against your repository.

### Step 3 — Customise the deploy steps

Open `.github/workflows/labels-as-parameters.yml` and replace the placeholder `echo` commands in the `deploy` job with your actual deploy scripts. For DigitalOcean Droplet deploys, reference `templates/cicd/deploy.yml`.

### Step 4 — Add `requiredParameters` (optional)

If your workflow should fail fast when a required label is missing, uncomment and set the `requiredParameters` input:

```yaml
- name: Extract labels as parameters
  id: parameters
  uses: matheusvellone/labels-as-parameters@1.0.0
  with:
    separator: ":"
    requiredParameters: environment, project
```

---

## 6. Workflow Template Reference

Full template: [`templates/cicd/labels-as-parameters.yml`](../templates/cicd/labels-as-parameters.yml)

```yaml
name: Labels as Parameters

on:
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]

permissions:
  contents: read
  pull-requests: read

jobs:
  extract-parameters:
    name: Extract Label Parameters
    runs-on: ubuntu-latest
    outputs:
      environment: ${{ steps.parameters.outputs.environment }}
      project:     ${{ steps.parameters.outputs.project }}

    steps:
      - name: Extract labels as parameters
        id: parameters
        uses: matheusvellone/labels-as-parameters@1.0.0
        with:
          separator: ":"
          # requiredParameters: environment, project

      - name: Print resolved parameters
        run: |
          echo "environment : ${{ steps.parameters.outputs.environment }}"
          echo "project     : ${{ steps.parameters.outputs.project }}"

  deploy:
    name: Deploy (${{ needs.extract-parameters.outputs.environment || 'no-env' }})
    runs-on: ubuntu-latest
    needs: extract-parameters
    if: needs.extract-parameters.outputs.environment != ''

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Staging
        if: needs.extract-parameters.outputs.environment == 'staging'
        run: ./deploy.sh staging ${{ needs.extract-parameters.outputs.project }}

      - name: Deploy to Production
        if: needs.extract-parameters.outputs.environment == 'production'
        run: ./deploy.sh production ${{ needs.extract-parameters.outputs.project }}
```

---

## 7. Action Inputs

| Input | Description | Default |
|---|---|---|
| `separator` | Character that splits the label key from its value | `:` |
| `requiredParameters` | Comma-separated list of keys that must be present; action fails if any are missing | _(empty — none required)_ |

---

## 8. Known Limitations

| Limitation | Details |
|---|---|
| **`push` event after rebase** | The action cannot retrieve PR labels when the merge strategy is `rebase` and the commit message does not contain the PR number. Use merge or squash merge instead. |
| **Multi-value parameters** | If two labels share the same key (e.g. `project:api` and `project:web`), `contains()` must be used carefully — a prefix match (`project:api`) will also match `project:internal-api`. |
| **No typed outputs** | All outputs are strings. Cast to boolean/number in your workflow if needed. |

---

## 9. References

- Action source: <https://github.com/matheusvellone/labels-as-parameters>
- Template: [`templates/cicd/labels-as-parameters.yml`](../templates/cicd/labels-as-parameters.yml)
- Label setup: [`docs/GITHUB_PROJECTS_SETUP.md`](GITHUB_PROJECTS_SETUP.md)
- CI/CD templates README: [`templates/cicd/README.md`](../templates/cicd/README.md)
- Tools catalog: [`docs/Master Revvel-Standards Flow Charts/TOOLS_CATALOG.md`](Master%20Revvel-Standards%20Flow%20Charts/TOOLS_CATALOG.md)
