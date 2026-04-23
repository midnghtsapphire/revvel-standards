# OpenRouter Coding Agent

This repository includes an OpenRouter-powered coding workflow for automated implementation work.

## Trigger the agent

1. Open an issue with the **OpenRouter coding task** template (or any issue).
2. Add label `wr:code` to the issue.
3. The workflow `.github/workflows/openrouter-coder.yml` reads the issue, asks OpenRouter for file changes, writes them to a branch, and opens a PR.

You can also run the workflow manually from **Actions → OpenRouter Coder → Run workflow** and pass an issue number.

## Change the model

Set repository variable `WR_MODEL` (Settings → Secrets and variables → Actions → Variables).

- Default when unset: `anthropic/claude-opus-4`

## Copy to another repository

Copy these files:

- `.github/workflows/openrouter-coder.yml`
- `.github/scripts/openrouter_coder.py`
- `.github/ISSUE_TEMPLATE/wr-code.md`

Then add repository secret:

- `OPENROUTER_API_KEY`

## Kill switch

Disable the workflow in **Actions** settings, or delete the `wr:code` label to prevent normal triggering.
