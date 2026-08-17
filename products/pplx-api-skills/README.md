# pplx-api Skills Console

## Live Deployment

▶️ **[Open the live app & test it](https://revvel-standards.vercel.app/docs/pplx-api-skills/)**

> Until the monorepo Vercel project picks up this path, run locally on port **3012** (see Quick Start). Deploy steps: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

## What it is

Production Next.js app that integrates the **Perplexity API (pplx-api)** with the **skills/tools** model you see in Perplexity’s chat thought process:

| Chat UI “skill” | API reality | Where it runs |
| --- | --- | --- |
| web_search, fetch_url, finance_search, people_search, sandbox | Built-in Agent tools | Perplexity server |
| MCP / connected servers | `mcp` tool type | Remote MCP + model |
| Custom project skills | JSON-schema `function` tools | **Your** code (this app) |
| BOM / classify / repo helpers | Revvel local skills | This app |

**Issue:** [#16930](https://github.com/midnghtsapphire/revvel-standards/issues/16930)  
**Research:** [RESEARCH.md](./RESEARCH.md) · [`wr/pplx-api-research.md`](../../wr/pplx-api-research.md)

---

## Features

- **Perplexity client** — OpenAI-compatible `/chat/completions` with mock + live modes
- **Auth middleware** — optional app token (`PPLX_APP_TOKEN`); API key never sent to the browser
- **Rate limiting** — fixed-window per IP/token with `Retry-After` headers
- **Skills framework** — registry, classifier, local executors, tool schema export
- **Response parser** — chat completions + Agent `function_call` output + citation + skill narration
- **BOM lookup** — Universal API BOM slice mapped to skills (cost / free tier / fit)
- **Monitoring** — in-process request counters, latency, skill hit map, recent structured logs
- **Demo UI** — chat console, skill registry, BOM search, good/bad operator guide

---

## Quick Start

```bash
cd products/pplx-api-skills
npm install
npm test
npm run lint
npm run build
npm run dev    # http://localhost:3012
```

Mock mode works with **no** `PERPLEXITY_API_KEY`.

---

## Runtime configuration

| Variable | Required | Description |
| --- | --- | --- |
| `PERPLEXITY_API_KEY` | For live mode | Official Perplexity API key |
| `PPLX_APP_TOKEN` | Optional | Shared secret for API routes |
| `PPLX_FORCE_MOCK` | Optional | `true` forces mock even with a key |
| `PPLX_DEFAULT_MODEL` | Optional | Default `sonar-pro` |
| `PPLX_API_BASE_URL` | Optional | Default `https://api.perplexity.ai` |
| `PPLX_RATE_LIMIT_MAX` | Optional | Default `30` |
| `PPLX_RATE_LIMIT_WINDOW_MS` | Optional | Default `60000` |

```bash
cp .env.example .env.local
```

When `PPLX_APP_TOKEN` is set, send an HTTP Authorization header using the `Bearer` scheme and your token value (same pattern as other API keys in this monorepo).

Example header name: `Authorization` · scheme: `Bearer` · value: your `PPLX_APP_TOKEN`.

---

## API

### `GET /api/health`

Service status + monitor snapshot.

### `POST /api/chat`

```bash
curl -s http://localhost:3012/api/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "mock": true,
    "skills": ["bom_lookup", "skill_classify", "repo_context"],
    "messages": [{"role":"user","content":"Is pplx-api good for citation research?"}]
  }'
```

### `GET /api/skills` · `POST /api/skills`

List registry or execute a **local** skill:

```bash
curl -s http://localhost:3012/api/skills \
  -H 'Content-Type: application/json' \
  -d '{"name":"bom_lookup","arguments":{"query":"perplexity"}}'
```

### `GET /api/bom?q=perplexity`

Bill of Materials search.

### `GET /api/monitor`

Counters + recent structured logs for dashboards.

---

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Deploy | Vercel |
| Port | **3012** |

---

## Monetization path

1. **Free tier** — mock console + BOM + skill docs (lead gen for Revvel automation)
2. **Pro** — live Sonar key metering, higher rate limits, saved research runs
3. **Agency** — MCP bridge hosting + white-label skill packs
4. **Internal leverage** — cheaper, citation-native research lane vs pure chat LLMs

---

## Related repo lanes

- No-key research: [`docs/PERPLEXITY_NO_KEY_INTEGRATION.md`](../../docs/PERPLEXITY_NO_KEY_INTEGRATION.md)
- OpenRouter triage fallback: `scripts/openrouter-triage.js`
- API BOM registry: [`docs/Universal-BOM_List/API_REGISTRY_BOM.md`](../../docs/Universal-BOM_List/API_REGISTRY_BOM.md)

---

## License

MIT — see root [`LICENSE`](../../LICENSE)
