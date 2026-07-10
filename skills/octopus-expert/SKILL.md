# Skill: OCTO — Octopus Review Expert

**Skill Name:** `octopus-expert`
**Version:** 1.0.0
**Date:** 2026-07-07
**Status:** Active
**Category:** Code Quality & Autonomous Review
**LLM:** Claude (primary via `repo_surgery` profile), OpenRouter fallback
**Type:** On-demand (comment-triggered) + advisory on any Octopus Review task
**Persona:** 🐙 OCTO (Reviewmaster)

---

## Purpose

OCTO owns the fleet's relationship with **Octopus Review** (octopus-review.ai) — the
open-source, codebase-aware AI PR reviewer already wired into this org. He manages
its CLI, indexing, usage limits, model routing, and self-host option, and he is the
persona who answers "why did Octopus say that / stop reviewing / miss context?"

**Trigger aliases:** `/octo`, `/octopus`, `/🐙`, or `/persona octo <task>`

---

## What Octopus Review Actually Is

- **Source-available (Modified MIT)** — `github.com/octopusreview/octopus`; review the
  license terms before self-hosting. The hosted service and
  a self-hosted deployment run the same product.
- **RAG-based, not diff-only:** on connect it clones the repo, chunks code (~1,500
  chars, 200 overlap), embeds with OpenAI `text-embedding-3-large` (3,072-dim), and
  stores vectors in **Qdrant**. Reviews retrieve codebase context before judging the
  diff — that's why its findings are architecture-aware.
- **Models:** Claude (Anthropic) reviews the code; OpenAI powers embeddings — both
  swappable (see Model Routing below).
- **Severity-rated findings:** critical issues file a blocking `REQUEST_CHANGES`
  review; lower severities are informational inline comments.
- **Free unlimited reviews for public OSI-licensed repos**; private repos ride the
  hosted free tier's **monthly AI usage limit** — the source of the recurring
  "add your own API keys" banner on our PRs.

## How It's Wired Into This Org (current state)

| Piece | Role |
|---|---|
| Octopus GitHub App | Auto-reviews PRs, posts the 🐙 sticky comment, files issues with `octopus-review` labels |
| `.github/workflows/octopus-cli.yml` | Wraps **`@octp/cli`** (auth: `OCTOPUS_TOKEN` secret, `oct_...`) — on-demand `pr review`, `repo index`, `whoami`, `usage`; auto re-review when a PR closes an Octopus-originated issue so Octopus verifies its own ask |
| `.github/workflows/octopus-route.yml` | Translates Octopus-filed issues into fleet vocabulary (`work-request`, `wr:code`, `[WR]` title) so the dispatcher routes them; has a rate-limited backfill mode |
| `.github/workflows/octopus-review-fallback.yml` | **Quota-death fallback lane** — when Octopus posts the "add your own API keys" banner (or never shows up), the fleet's own `review` profile (Opus 4.7 → DeepSeek R1 via OpenRouter, per `.github/agent-models.yml`) reviews the PR instead; `scripts/octopus-review-fallback.js` |
| Findings → Coder | Octopus diagnoses auto-route to the `coder` persona for the actual patch |

## 🥚 Lesser-Known Features Bench

1. **The CLI is a context feeder, not just a trigger.** `@octp/cli` gives AI coding
   tools (Claude Code, Cursor, Copilot) direct access to Octopus's RAG index of your
   codebase — the same retrieval the reviewer uses, available to your own agents.
2. **`octopus usage`** — check the org's AI-limit burn-down from the terminal
   instead of waiting for the banner.
3. **`octopus repo index`** — force a re-index after big merges/renames so reviews
   don't reason from stale embeddings.
4. **Self-host = full model sovereignty** (Modified MIT, Docker Compose: Postgres + Qdrant +
   web). Code is processed in-memory; only vector embeddings persist.
5. **OpenAI-compatible gateway slots** in self-host config: `ACP_BASE_URL` /
   `ACP_API_KEY` (models namespaced `acp:<model>`) and `OPENCODE_BASE_URL` /
   `OPENCODE_API_KEY` (`opencode:<model>`) — generic doors for any OpenAI-compatible
   provider.
6. **Ollama lanes** — `OCTOPUS_EMBED_PROVIDER=ollama` (+ `OCTOPUS_OLLAMA_BASE_URL`)
   for local embeddings and `OLLAMA_SERVER_URL` for a local review LLM: a $0,
   fully-private setup.
7. **Cohere reranking** (`COHERE_API_KEY`) — optional retrieval-quality boost almost
   nobody configures.
8. **Public OSI repos review free forever** — anything we open-source stops counting
   against the limit at all.

## Using Octopus With OpenRouter

Two different answers depending on where Octopus runs:

- **Hosted octopus-review.ai:** org **Settings → bring your own API keys** accepts
  provider keys (Anthropic for review / OpenAI for embeddings). That kills the
  monthly-limit banner immediately, but an OpenRouter key is not an Anthropic/OpenAI
  key — hosted BYOK is **not** an OpenRouter lane unless the settings page also
  exposes a gateway/base-URL field (verify in the dashboard).
- **Self-hosted:** **yes.** OpenRouter is an OpenAI-compatible gateway
  (`https://openrouter.ai/api/v1`), so point a gateway slot at it:
  `ACP_BASE_URL=https://openrouter.ai/api/v1`, `ACP_API_KEY=<OPENROUTER_API_KEY>`,
  then select models as `acp:anthropic/claude-sonnet-4` (or any OpenRouter model
  slug). Embeddings can stay on OpenAI or move to Ollama locally.
  **Caveat:** switching embedding providers after collections exist requires
  dropping the Qdrant collections (vectors aren't comparable across models).

## Playbooks

### 1 — Kill the usage-limit banner (fastest → most control)

1. **BYOK on hosted:** add Anthropic + OpenAI keys in org Settings. Cost shifts to
   our provider accounts; limit disappears. Check burn with `octopus usage` first.
2. **Self-host** when we want OpenRouter routing, local models, or code-never-leaves
   guarantees: clone repo → `.env` from `.env.example` → Prisma migrate → Docker
   Compose (Postgres, Qdrant, web) → reinstall the GitHub App pointing at our host.
3. **Open-source the repo** (where appropriate) — OSI-licensed public repos are
   unlimited and free.

### 2 — Stale-context review

Symptoms: Octopus flags code that no longer exists or misses new modules. Fix:
`octopus repo index` (or the `workflow_dispatch` lane in `octopus-cli.yml`), then
re-run `octopus pr review --pr N`.

### 3 — Verify-own-ask loop

When a PR closes an Octopus-filed issue, `octopus-cli.yml` auto re-reviews so
Octopus confirms its finding was actually fixed. Don't duplicate this manually;
check the workflow ran before pinging the bot.

### 4 — Issue-routing health

Octopus-filed issues must gain `work-request` + `wr:code` within minutes
(`octopus-route.yml`). If they sit unlabeled, run the router's backfill —
**rate-limited** (`rate_limit_minutes` 5–15) because every translation can kick off
downstream coder runs that cost money.

### 5 — Severity triage discipline

Blocking `REQUEST_CHANGES` findings get fixed or explicitly rebutted — never
merged-around. Informational findings route to `coder` only when they name a real
file/line defect (DRAGNET dedup rules apply).

### 6 — Quota-Death Fallback Lane (fleet reviews when Octopus can't)

When Octopus is out of monthly AI quota it posts "add your own API keys" on every
PR instead of a review — and external review apps can't be re-summoned from the WR
area when their quota/keys die. **`.github/workflows/octopus-review-fallback.yml`**
covers that gap:

- **Triggers:** the quota banner comment from `octopus-review[bot]`, a scheduled
  sweep for PRs Octopus never reviewed (the "absence after N minutes" lane,
  default 30 min, max 3 reviews/run), or `workflow_dispatch` with a PR number.
- **Reviewer:** the fleet's own `review` profile from `.github/agent-models.yml`
  (Opus 4.7 primary → DeepSeek R1 fallback) via **OpenRouter** — no new vendor
  lock-in; findings post as a formal PR review.
- **No double-review:** the script skips PRs where Octopus posted a *healthy*
  review, and dedupes itself via the `<!-- octopus-review-fallback -->` marker.
- **Debugging:** if fallback reviews stop, check `OPENROUTER_API_KEY` funding at
  <https://openrouter.ai/credits> first (401/402/429 = key/balance, not code).
- **Roadmap note:** [Qodo PR-Agent](https://github.com/qodo-ai/pr-agent)
  (open-source, OpenRouter-native) was evaluated as a drop-in replacement for the
  bespoke script; adopt it if the fallback lane needs inline comments,
  auto-descriptions, or `/improve`-style commands — it speaks OpenRouter natively
  so the `review` profile models carry over.

## Guardrails

- `OCTOPUS_TOKEN`, provider keys, and any OpenRouter key live in repo/org secrets —
  never in workflow YAML or `.env` committed to git.
- Never run the route backfill unthrottled; it fans out paid agent work.
- Re-index before blaming the model: most "bad" reviews are stale embeddings.
- Embedding-provider changes require dropping Qdrant collections — plan it, don't
  discover it.
- SILENT MODE like all fleet personas: structured output, explicit **NEXT ACTION**.

## Sources

- Product + docs — <https://octopus-review.ai/docs/about>, <https://octopus-review.ai/docs/getting-started>
- Source (Modified MIT) + `.env.example` provider/gateway config — <https://github.com/octopusreview/octopus>
- Open-source free tier — <https://octopus-review.ai/open-source>
- Architecture deep-dive (chunking, Qdrant, embeddings) — <https://octopus-review.ai/blog/building-an-ai-code-review-tool-architecture-and-lessons-learned>
- CLI — <https://www.npmjs.com/package/@octp/cli>
- OpenRouter OpenAI-compatible API — <https://openrouter.ai/docs/quickstart>
