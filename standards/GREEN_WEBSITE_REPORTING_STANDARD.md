# Green Website Reporting Standard

## Purpose

Every public Revvel web application should publish lightweight website carbon
reporting through the `green-website` workflow. This gives each app a visible
sustainability signal in its README, produces a downloadable `carbon` artifact
for audits, and keeps the measurement refreshed without adding paid services or
app runtime dependencies.

## Required Workflow

Use the portable template:

```text
templates/cicd/green-website.yml
```

Install it in each public web app as:

```text
.github/workflows/green-website.yml
```

The workflow must:

1. Run on `main` pushes affecting the app or README.
2. Run weekly on a schedule.
3. Support `workflow_dispatch` with a one-off `url` input.
4. Fetch Website Carbon data with the inline `actions/github-script@v9.0.0`
   step in the standard workflow.
5. Commit only the generated `README.md` card update and `carbon` data file.
6. Skip its own generated `docs: update green website report` commit to avoid
   commit loops.
7. Set `timeout-minutes` on the job.
8. Upload the generated `carbon` file as a workflow artifact named `carbon`.

## README Contract

Each app README must include the marker where the card should appear:

```markdown
<!-- CARBON-STATS -->
```

After the first workflow run, the workflow replaces that marker with:

```markdown
![carbon consumption of this project](https://green-action.vercel.app/api/card?p=<score>&type=percent)
```

Future runs update the existing card URL. Do not delete the generated card
unless you are moving it to a new README section and restoring the marker.

## URL Selection

The measured URL is resolved in this order:

1. Manual `workflow_dispatch` input `url`.
2. Repository variable `GREEN_WEBSITE_URL`.
3. The repository's GitHub Pages URL:
   `https://<owner>.github.io/<repo>/`.

Set `GREEN_WEBSITE_URL` when the production app is not hosted on GitHub Pages
or when the app uses a custom domain.

## Data Produced

The workflow writes:

- a README card showing the current cleaner-than score;
- a `carbon` JSON file committed to the repo;
- a workflow artifact named `carbon` via `actions/upload-artifact`.

Keep the committed `carbon` file so every repo has a historical audit trail in
Git and a machine-readable data point for dashboards.

## Revvel-Standards Installation

This repository installs the active workflow at:

```text
.github/workflows/green-website.yml
```

It measures:

```text
https://midnghtsapphire.github.io/revvel-standards/
```

Override that with `GREEN_WEBSITE_URL` after the primary oAudrey deployment is
live and DNS is no longer pending human action.

## Verification

Before merging changes to the green reporting standard, run:

```bash
node tests/green-website-standard.test.js
node tests/workflow-yaml-validation.test.js
npm run workflows:validate -- --no-report
npm test
```
