# Upgrade Log — every tool-tier change, dated

Append-only audit trail of every paid-tier change the pipeline makes (or
recommends). Governed by `docs/API_LIMIT_AUTO_UPGRADE.md`. **Don't garbage-
collect this file** — it's the evidence trail for the enterprise spend-control
pitch.

| Date | Tool | Trigger | Tier from → to | Monthly cost | Decision band | WR/PR | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-05-27 | Mabl | Owner request | Active → **Paused** | $X → $0 | Pause (no upgrade) | #13967 | Replaced by Keploy; eval kept in workflow header per standards. |
| 2026-05-28 | Keploy | Initial install | none → **Free** | $0 | Tier 0 (free-tier-first rule) | (install only) | App + Chrome Recorder onboarded; see `docs/TESTING_STACK.md`. |
| 2026-07-07 | CircleCI | ORBIT persona wire-in (#15406) | none → **Free** | $0 | Tier 0 (free-tier-first rule) | #15406 | Existing `.circleci/config.yml` gate formalized under ORBIT 🪐 ownership; added `validate-registries` job. Governance: `standards/CIRCLECI_INTEGRATION_STANDARD.md`. No paid tier; row added to `docs/TOOL_COST_INDEX.md`. |
| 2026-07-07 | Octopus Review | Monthly AI-usage-limit banner on PRs; OCTO persona wire-in | Hosted Free (limit hit) → **Hosted Free (unchanged)** | $0 | Tier 0 (no upgrade; lanes documented) | (this PR) | Decision deferred to owner: BYOK Anthropic/OpenAI keys in Settings (limit gone, pay provider usage), self-host (MIT; OpenRouter via gateway slots), or OSI-public (free unlimited). See `skills/octopus-expert/SKILL.md`. |
| 2026-07-07 | Mabl | MENDER persona wire-in | **Paused → Paused (unchanged)** | $0 | Pause upheld (reactivation gate documented) | (this PR) | Persona added; pause stands. New facts on record: local/CI `mabl tests run` is credit-free; mabl cloud MCP (2026-05) enables agent-driven eval at $0. Gate: E2E need Keploy+Playwright can't cover + Doppler-managed key + labeled plans. See `skills/mabl-expert/SKILL.md`. |
