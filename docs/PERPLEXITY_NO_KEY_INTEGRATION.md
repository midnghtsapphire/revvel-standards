# Perplexity No-Key Integration

This repository uses the
[`helallao/perplexity-ai`](https://github.com/helallao/perplexity-ai) fork for
**no-key** issue research. The GitHub workflow installs the fork directly from
GitHub and calls it through a small Python bridge from
[`scripts/perplexity-research-issue.js`](../scripts/perplexity-research-issue.js).

## Why this path exists

- **No required `PERPLEXITY_API_KEY`** for the Revvel research lane
- **Anonymous Labs/Web access only** — no generated-account or Emailnator flows
- **Deterministic fallback** — try `LabsClient(..., model="sonar")` first, then
  fall back to `Client.search(..., mode="auto")`

## Workflow contract

The canonical workflow is
[`/.github/workflows/perplexity-research-agent.yml`](../.github/workflows/perplexity-research-agent.yml).

It must:

1. install `perplexity-api @ git+https://github.com/helallao/perplexity-ai.git@main`
2. run `node scripts/perplexity-research-issue.js`
3. avoid creating a `PERPLEXITY_API_KEY` credential blocker

## oAudrey / Rex lane

For oAudrey Agent Factory work, the named **Rex** assignee lane represents the
research-first route that should stay on this no-key Perplexity path. Use the
`Rex` assignee option in [`docs/PROOF_OF_LIFE_PROCESS.md`](./PROOF_OF_LIFE_PROCESS.md)
when the run should stay label-only and inside the oAudrey / Agent Factory lane.
