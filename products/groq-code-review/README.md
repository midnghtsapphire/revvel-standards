# Groq Code Review

## Live Deployment

▶️ **[Open the live app & test it](https://midnghtsapphire.github.io/revvel-standards/docs/groq-code-review/)**

> Until the monorepo docs route is published, run locally on port **3012** (`npm run dev`).

## What It Is

**Groq Code Review** is a production SaaS + GitHub Action bundle that reviews pull request unified diffs with GroqCloud LLMs. Oversized PRs are split into model-safe chunks, each chunk is reviewed, and findings are consolidated into a single Markdown report / PR comment.

When `GROQ_API_KEY` is missing or Groq returns an error (401/402/429/5xx), the engine falls back to a deterministic local heuristic reviewer so demos and CI stay green.

**Market context:** AI code-review Actions (CodeRabbit, Bito, marketplace Groq/HuggingFace reviewers) are table-stakes for agentic repos. This product packages the [Groq Code Review marketplace pattern](https://github.com/marketplace/actions/groq-code-review) as a Revvel-owned, testable, monetizable surface with Polar.sh upsell hooks.

---

## Features

- **Diff chunking** — file-aware packing + oversized-file split with overlap
- **Groq Chat Completions** — configurable model (`repoId`), temperature, top_p, max tokens
- **Local fallback reviewer** — secrets, XSS sinks, eval/exec, empty catches, TODOs, `any`, force-push
- **SaaS UI** — paste a diff, tune chunk size, download Markdown, preview GitHub comment body
- **Review API** — `POST /api/review` for automations
- **Composite GitHub Action** — `products/groq-code-review/action` with marketplace-compatible inputs
- **Workflow template** — `workflows/groq-code-review.yml` ready to copy into `.github/workflows`
- **SEO keywords** — AI code review, Groq API, GitHub Actions LLM, PR review automation, large PR chunking

---

## Quick Start

```bash
cd products/groq-code-review
cp .env.example .env.local
npm install
npm test
npm run lint
npm run build
npm run dev    # http://localhost:3012
```

---

## Runtime Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `GROQ_API_KEY` | Optional | GroqCloud API key. Empty → local reviewer only. |
| `GROQ_MODEL` | Optional | Default `llama-3.3-70b-versatile` |
| `NEXT_PUBLIC_POLAR_CHECKOUT_URL` | Optional | SaaS upgrade / Polar checkout link |
| `NEXT_PUBLIC_APP_URL` | Optional | Public base URL for docs/snippets |

---

## Review API

```bash
curl -X POST http://localhost:3012/api/review \
  -H "Content-Type: application/json" \
  -d '{"diff":"diff --git a/x b/x\n+++ b/x\n+const api_key = \"sk-live-demo-key-123456\"\n","forceLocal":true,"chunkSize":4000}'
```

Response includes `findings`, `summary`, `markdown`, `stats`, and `githubReviewBody`.

Health check: `GET /api/health`

---

## GitHub Action inputs

Mirrors the marketplace action so existing docs transfer:

| Input | Purpose |
| --- | --- |
| `apiKey` | Groq API key |
| `githubToken` | PR comment token |
| `githubRepository` | `owner/repo` |
| `githubPullRequestNumber` | PR number |
| `gitCommitHash` | Head SHA metadata |
| `pullRequestDiff` | Unified diff |
| `pullRequestDiffChunkSize` | Chunk budget (chars) |
| `repoId` | Groq model id |
| `temperature` / `topP` / `maxNewTokens` | Sampling |
| `logLevel` | `DEBUG` \| `INFO` \| `WARN` |

Example workflow: [`workflows/groq-code-review.yml`](./workflows/groq-code-review.yml)

---

## Monetization path

1. **Free:** local heuristics + self-hosted Action  
2. **Pro (Polar.sh):** hosted Groq minutes, org policy packs, retention controls  
3. **Enterprise:** private VPC runner + custom rule packs

---

## Citations

- Groq Code Review marketplace action — <https://github.com/marketplace/actions/groq-code-review>
- Upstream example workflow — <https://github.com/rajsinghparihar/llm-code-review>
- Groq Chat Completions API — <https://console.groq.com/docs/api-reference>

---

## Deploy

```bash
cd products/groq-code-review
npm install
npm run build
# Vercel: set root to products/groq-code-review (see vercel.json)
```

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).
