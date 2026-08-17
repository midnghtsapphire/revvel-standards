# Mabl CLI Skill

Activate when any task involves setting up Mabl, running AI-powered end-to-end tests, triggering test plans from CI/CD, or integrating Mabl into a Revvel project.

## What Mabl Does

Mabl is an AI-powered test automation platform. It records, maintains, and runs end-to-end, API, and performance tests across browsers and environments. The Mabl CLI (`@mablhq/mabl-cli`) is the command-line interface for:

1. **Triggering test runs** — kick off functional, regression, smoke, or API tests against any environment.
2. **Deployment events** — register a deployment so Mabl executes the targeted test plan automatically.
3. **Results & artifacts** — fetch results, screenshots, HAR files, and logs for failed steps.
4. **Application & environment management** — list apps, environments, and test plans from the terminal.
5. **CI/CD integration** — fail or pass a build based on Mabl test outcomes via exit code.

## Why Mabl in the Revvel Ecosystem

- Complements Vitest (unit) + Playwright (E2E scripted) with AI-maintained UI tests that **self-heal** when the UI changes.
- Integrates with GitHub Actions via `mablhq/setup-mabl-cli@v1.5` — zero custom installation scripts.
- Surfaces full test reports, screenshots, and video in the CI log without additional tooling.
- Supports parallel cross-browser execution (Chrome, Firefox, Safari) through the Mabl cloud runner.

## Integration Architecture

```text
Developer / Agent pushes code
        ↓
mabl.yml workflow triggers (on PR and push to main)
        ↓
mablhq/setup-mabl-cli@v1.5 installs the Mabl CLI
        ↓
mabl deployments create ... (registers deployment event)
        ↓
Mabl cloud executes the linked test plan
        ↓
CLI polls until tests complete — exits 0 (pass) or 1 (fail)
        ↓
Artifacts (screenshots, HAR) uploaded to GitHub Actions
        ↓
If fail → Ralph Loop triggers @copilot for fix + re-run
```

## Setup Checklist (New Project)

1. **Create a Mabl account:**
   Visit <https://app.mabl.com> and sign up (free trial available).

2. **Create an application in Mabl:**
   Mabl Dashboard → Applications → New Application → enter app URL.

3. **Create an environment in Mabl:**
   Mabl Dashboard → Environments → New Environment (e.g., `staging`, `production`).

4. **Create a test plan in Mabl:**
   Mabl Dashboard → Plans → New Plan → link tests to the plan.

5. **Retrieve credentials from Mabl:**
   - `MABL_API_KEY` — Mabl Dashboard → Settings → API Keys → Create Key
   - `MABL_WORKSPACE_ID` — visible in Mabl Dashboard URL: `app.mabl.com/workspaces/<WORKSPACE_ID>`

6. **Add secrets to your GitHub repository:**
   Repository → Settings → Secrets and variables → Actions → New repository secret:
   - `MABL_API_KEY`
   - `MABL_WORKSPACE_ID`

7. **Copy workflow template to target repo:**
   ```bash
   cp revvel-standards/templates/cicd/mabl.yml .github/workflows/mabl.yml
   ```

8. **Configure the workflow variables** (top of `mabl.yml`):
   - `MABL_APP_ID` — Mabl Dashboard → Applications → select app → copy the ID from the URL
   - `MABL_ENVIRONMENT_ID` — Mabl Dashboard → Environments → select environment → copy ID

9. **Verify workflow triggers on next PR or push to main.**

## Key CLI Commands

```bash
# Install (handled by setup-mabl-cli action in CI, or manually via npm)
npm install -g @mablhq/mabl-cli

# Authenticate
mabl auth activate --api-key $MABL_API_KEY --workspace-id $MABL_WORKSPACE_ID

# Register a deployment event (triggers linked test plans automatically)
mabl deployments create \
  --app-id <APP_ID> \
  --environment-id <ENVIRONMENT_ID> \
  --url https://yourapp.com

# Trigger a specific test plan
mabl tests run \
  --plan-id <PLAN_ID> \
  --environment-id <ENVIRONMENT_ID>

# List applications
mabl applications list

# List environments
mabl environments list

# Export test run artifacts (screenshots, HAR)
mabl test-runs export <TEST_RUN_ID> -f artifacts.zip

# Show help
mabl --help
```

## Workflow — Self-Healing Loop

When a Mabl test fails in CI:

1. **Inspect the failure** — screenshots and HAR files are uploaded as GitHub Actions artifacts.
2. **Read the Mabl test report** — the step summary includes a direct link to the Mabl dashboard run.
3. **Determine the cause** — UI change (Mabl may auto-heal on the next run), code regression (fix code), or environment issue (check env config).
4. **If code regression** — apply the fix, commit, push → CI re-runs Mabl automatically.
5. **If Mabl test needs updating** — open Mabl Dashboard → find the failing test → update the test steps.
6. **Do not merge** until Mabl shows a clean run.

## Mabl vs Playwright — When to Use Which

| Scenario | Tool |
|---|---|
| Scripted, code-owned E2E tests | Playwright |
| AI-maintained UI tests (self-healing) | Mabl |
| Cross-browser parallel cloud testing | Mabl |
| API contract testing | Mabl |
| Component-level browser testing | Playwright |
| Full Revvel S.H.I.F.T. behavioral tests | Both |

## Cost & Pricing

- **Free trial:** Available — check <https://www.mabl.com/pricing> for current offer.
- **Pro plan:** Paid — visit <https://www.mabl.com/pricing> for current rates.
- **ROI:** A single avoided production regression (broken checkout, failed auth) easily offsets the subscription cost.

## Session Checklist

- [ ] `MABL_API_KEY` and `MABL_WORKSPACE_ID` added to GitHub Secrets
- [ ] Application and environment created in Mabl Dashboard
- [ ] Test plan linked to application and environment
- [ ] `MABL_APP_ID` and `MABL_ENVIRONMENT_ID` configured in `mabl.yml`
- [ ] Workflow triggers successfully on PR
- [ ] Test run visible in Mabl Dashboard
- [ ] Artifacts (screenshots) uploaded to GitHub Actions on failure
