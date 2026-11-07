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

The workflow (`.github/workflows/openrouter-coder.yml`) reads `vars.WR_MODEL`
and passes it to `.github/scripts/openrouter_coder.py`, which routes the call
through the shared cascade in `scripts/local_llm.py`: LM Studio, then Ollama,
then OpenRouter. `WR_MODEL` names a cloud model slug, so it applies to the
OpenRouter lane only — it is exported as `OPENROUTER_MODEL` and is deliberately
*not* forwarded to the local lanes, which would otherwise be asked for a model
they do not have and fail into the paid lane every time. The local lanes pick
their own model from `LMSTUDIO_MODEL` / `OLLAMA_MODEL`, or whatever is loaded.

If OpenRouter rejects the slug (e.g. the model name is invalid or no longer
supported), that lane fails and the script posts an error comment on the
triggering issue — at which point, look up the current slug at
<https://openrouter.ai/models> and update the `WR_MODEL` variable.

The result payload records which lane served the request (`lane`, `model`,
`paid`), so a free Layer 0 run and a billed run can be told apart afterwards.

> **Spend gate.** `REVVEL_LLM_ALLOW_CLOUD` must be exactly `"1"` for the
> OpenRouter lane to run at all, and the gate is checked only when that lane is
> reached. With the gate shut, a reachable LM Studio still serves the work
> request for free; it is only when every local lane is unreachable *and* the
> gate is shut that the script fails and names the variable. See
> `docs/LOCAL_LLM_SETUP.md`.

### Verify routing

1. Confirm the variable exists: **Settings → Secrets and variables → Actions → Variables → `WR_MODEL`**.
2. Trigger the workflow (add the `wr:code` label to an issue, or run it manually).
3. Open the run logs for the **Run OpenRouter coder** step and read the `lane`
   field of the printed result payload. `lane-1-openrouter` with
   `"paid": true` confirms the OpenRouter route and the configured slug;
   `lane-0-lmstudio` or `lane-0b-ollama` means a local lane served it and
   `WR_MODEL` was not consulted at all, which is the intended outcome whenever
   Layer 0 is reachable.

Locally, `python scripts/local_llm.py doctor` reports which lanes are up before
you spend anything.

## Copy to another repository

Copy these files:

- `.github/workflows/openrouter-coder.yml`
- `.github/scripts/openrouter_coder.py`
- `scripts/local_llm.py` — required, not optional: the coder imports it for the
  lane cascade and the spend gate, and fails on import without it.
- Apply the `wr:code` label to any issue (e.g. one filed via the
  Deep-Research template) to route it to OpenRouter. The stand-alone
  `wr-code.md` issue template was retired in favour of a single
  Deep-Research entry point (see `.github/ISSUE_TEMPLATE/config.yml`).

Then add repository secret:

- `OPENROUTER_API_KEY`

## Kill switch

Disable the workflow in **Actions** settings, or delete the `wr:code` label to prevent normal triggering.
