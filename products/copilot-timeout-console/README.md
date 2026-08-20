# Copilot Timeout Console

Shippable status UI + policy bundle for the **60-minute visiting LLM / OpenRouter / Copilot job floor** (WR #17775).

Stops coding-agent jobs from dying with:

```text
The job has exceeded the maximum execution time of 10m0s
```

## Live Deployment

▶️ After merge + Vercel deploy of `products/copilot-timeout-console`, open the product
preview from the monorepo Vercel project. Local default: <http://localhost:3012>

Static docs twin (always browsable from the monorepo site):

- <https://revvel-standards.vercel.app/docs/copilot-timeout-console/>

Root automation (no UI required):

```bash
node scripts/copilot-timeout-audit.js --markdown
node --test tests/copilot-timeout-audit.test.js
```

## Mission Alignment

Part of the $10k/month → $10M/3yr pipeline. Protects the automated product pipeline
so OpenRouter / visiting agents finish long builds instead of burning a failed run
and a re-dispatch. Internal reliability now; the auditor is reusable as a paid
“agent timeout policy pack” for multi-repo clients later.

## What Problem It Solves

GitHub Actions kills a job when `timeout-minutes` is hit. Several visiting-LLM
execution jobs (agent-fallback, OpenHands, SWE-agent, free-LLM router, …) sat at
10–30 minutes while complex OpenRouter turns need a full hour. This product is
the human console for the SSOT policy:

| Piece | Path |
| --- | --- |
| Policy SSOT | `config/copilot-timeouts.yml` |
| Auditor (CI gate) | `scripts/copilot-timeout-audit.js` |
| Root regression | `tests/copilot-timeout-audit.test.js` |
| Standard | `standards/COPILOT_TIMEOUT_STANDARD.md` |
| Host / device-tree defaults | `config/device-tree.yml`, `scripts/host.js`, `schemas/agent-contract.schema.json` |

## Features

- Answer line: is the 60m floor held?
- Catalog of targeted execution jobs
- Click-by-click recovery when a run still dies at 10m
- Copy-paste verify commands
- Keyless — no API keys

## Local Development

```bash
cd products/copilot-timeout-console
npm install
npm run dev -- -p 3012
```

## Validation

```bash
npm test
npm run lint
npm run build
```

Root regression:

```bash
node --test tests/copilot-timeout-audit.test.js tests/openrouter-coder-workflow.test.js tests/host.test.js
node scripts/copilot-timeout-audit.js
```

## Deploy path

1. Vercel project root can stay monorepo root; set **Root Directory** to
   `products/copilot-timeout-console` for a dedicated deploy, **or** link from the
   static monorepo site (`docs/copilot-timeout-console/`).
2. Framework preset: Next.js
3. Install: `npm install`
4. Build: `npm run build`
5. Output: Next default
6. No secrets required

## Port

**3012** (see root `AGENTS.md` port table).
