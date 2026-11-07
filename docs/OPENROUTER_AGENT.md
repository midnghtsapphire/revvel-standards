# OpenRouter Coding Agent

This repository includes an OpenRouter-powered coding workflow for automated implementation work.

## Trigger the agent

1. Open an issue with the **OpenRouter coding task** template (or any issue).
2. Add label `wr:code` to the issue.
3. The workflow `.github/workflows/openrouter-coder.yml` reads the issue, asks OpenRouter for file changes, writes them to a branch, and opens a PR.

You can also run the workflow manually from **Actions → OpenRouter Coder → Run workflow** and pass an issue number.

## Change the model

Set repository variable `WR_MODEL` (Settings → Secrets and variables → Actions → Variables).

- Default when unset: `anthropic/claude-opus-4.7`

The workflow (`.github/workflows/openrouter-coder.yml`) reads `vars.WR_MODEL` and
passes it straight through to the OpenRouter Chat Completions endpoint
(`https://openrouter.ai/api/v1/chat/completions`) via
`.github/scripts/openrouter_coder.py`. If OpenRouter rejects the slug (e.g. the
model name is invalid or no longer supported), the workflow fails and posts an
error comment on the triggering issue — at which point, look up the current
slug at <https://openrouter.ai/models> and update the `WR_MODEL` variable.

### Verify routing

1. Confirm the variable exists: **Settings → Secrets and variables → Actions → Variables → `WR_MODEL`**.
2. Trigger the workflow (add the `wr:code` label to an issue, or run it manually).
3. Open the run logs for the **Generate code changes with OpenRouter** step — the
   request is sent to `openrouter.ai` with the configured model slug (e.g.
   `anthropic/claude-opus-4.7`). A successful HTTP 200 from OpenRouter confirms
   the route.

## Copy to another repository

Copy these files:

- `.github/workflows/openrouter-coder.yml`
- `.github/scripts/openrouter_coder.py`
- Apply the `wr:code` label to any issue (e.g. one filed via the
  Deep-Research template) to route it to OpenRouter. The stand-alone
  `wr-code.md` issue template was retired in favour of a single
  Deep-Research entry point (see `.github/ISSUE_TEMPLATE/config.yml`).

Then add repository secret:

- `OPENROUTER_API_KEY`

## Kill switch

Disable the workflow in **Actions** settings, or delete the `wr:code` label to prevent normal triggering.
