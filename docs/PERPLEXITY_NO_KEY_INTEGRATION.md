# Perplexity No-Key Integration

**Status:** implemented for `perplexity-research-agent.yml`  
**Upstream:** <https://github.com/helallao/perplexity-ai>  
**Purpose:** run issue research without requiring `PERPLEXITY_API_KEY`.

## Due Diligence Summary

The referenced upstream repository is an MIT-licensed Python project with an
unofficial Perplexity web wrapper, a Labs/WebSocket client, and an MCP server.
It is popular enough to be worth evaluating (1k+ GitHub stars), but it is not an
official Perplexity API and has no GitHub security policy published.

Important findings:

- The package supports anonymous queries through Perplexity web/Labs endpoints,
  so the Revvel workflow can run without an official `PERPLEXITY_API_KEY`.
- The repository also includes Emailnator account generation and "unlimited pro
  queries" language. Revvel automation does **not** use those paths.
- Open upstream issue #70 reports that the anonymous `Client.search()` path may
  return empty responses after Perplexity server-side changes. The Revvel script
  therefore tries `LabsClient` first and falls back to `Client.search()`.
- The fork's MCP server exposes anonymous `perplexity_ask` by default and only
  enables pro/reason/deep-research tools when cookies are supplied. Revvel keeps
  the MCP entry disabled by default and does not require cookies.

## Runtime Behavior

The workflow `.github/workflows/perplexity-research-agent.yml` now:

1. Checks out the repo.
2. Installs Python 3.12.
3. Installs the fork directly:

   ```bash
   python -m pip install "perplexity-api @ git+https://github.com/helallao/perplexity-ai.git@main"
   ```

4. Runs `node scripts/perplexity-research-issue.js`.

The Node script builds the WR research prompt, calls a short Python bridge, and
uses these providers in order:

1. `perplexity.labs.LabsClient().ask(..., model="sonar")`
2. `perplexity.Client().search(..., mode="auto")`

The output comment includes a provider footer so reviewers can see that no
official Perplexity API key was used.

## MCP Configuration

`.mcp.json` includes a disabled `perplexity-no-key` server:

```json
{
  "command": "perplexity-mcp",
  "env": {
    "MCP_TRANSPORT": "stdio"
  },
  "disabled": true
}
```

Enable it only after installing:

```bash
python -m pip install "perplexity-api[mcp] @ git+https://github.com/helallao/perplexity-ai.git@main"
```

No `PERPLEXITY_API_KEY` is required. If first-party Perplexity account cookies
are ever used for local-only MCP testing, store them in a vault and inject them
as `PERPLEXITY_COOKIES`; do not commit cookies or use generated accounts.

## Credential Gatekeeper

Perplexity terms such as "market research", "sonar", and "deep research" no
longer create a `PERPLEXITY_API_KEY` bill-of-materials blocker. The
Credential Gatekeeper intentionally omits Perplexity from its required-secret
patterns because this integration is no-key.

## Validation

Run:

```bash
node tests/perplexity-research-issue.test.js
npm run workflows:validate
npm test
```

The unit test mocks the provider call; CI does not need live Perplexity access
to verify the integration contract.
