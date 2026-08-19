# Provenance Standard — name the source every time

Every reference to an external tool, service, agent, model, or workflow in
**any** doc / wireframe / schema / workflow file / PR description / comment
**must include its source** so a reader (or future-agent) can follow it
without guessing.

> Today "Jules" means three different things in this repo depending on which
> file you read. This standard fixes that.

---

## The rule

Whenever you name a tool, write it as:

```text
Tool name (Publisher / Sponsor) via `package@version` [nested: dep1, dep2]
```

Each piece:

| Piece | What it answers | Example |
| --- | --- | --- |
| **Tool name** | Plain-language name | Jules |
| **(Publisher / Sponsor)** | Who owns / maintains it (Google, BeksOmega, sanjay3290, our org, etc.) | (Google) |
| **via `package@version`** | The exact action, SDK, package, image, or URL the workflow uses | via `BeksOmega/jules-action@v1.0.0` |
| **[nested: …]** | Anything *inside* the tool that matters (downstream deps, sub-services, models) | [nested: Render for previews] |

For internal artifacts (our own scripts, repos, workflows), still name the
file path so the reader can click straight to it:

```text
the coder (us) via `scripts/openrouter_coder.py` [models: Claude / Gemini / GPT triad]
```

---

## Good vs bad

❌ **Bad** — ambiguous, agent has to guess
```text
Jules reviews this PR.
```

✅ **Good** — agent knows exactly where to look
```text
Jules (Google) via `BeksOmega/jules-action@v1.0.0` — see jules-invoke.yml.
Note: `sanjay3290/jules-pr-reviewer@v1` (different author!) was SILENCED in
#13974 because it was broken; only the BeksOmega family is active.
```

❌ **Bad**
```text
The coder builds a PR.
```

✅ **Good**
```text
The coder (us) via `openrouter-coder.yml`, which calls `scripts/openrouter_coder.py`
[nested: OpenRouter API → Claude Opus 4.7 (anthropic/claude-opus-4-7) by default,
fallback to Gemini Pro 1.5 then DeepSeek Chat].
```

❌ **Bad**
```text
Mabl runs tests.
```

✅ **Good — and reflects current state**
```text
Mabl (Mabl Inc., paused 2026-05-27 — see workflow header) via `@mablhq/mabl-cli`.
Replaced by Keploy (Keploy Inc.) via the GitHub App + Chrome extension.
```

---

## Where this applies

This isn't optional in any of these surfaces — if it mentions a tool, it must
say where the tool comes from:

| Surface | Where the provenance goes |
| --- | --- |
| Workflow files (`.github/workflows/*.yml`) | Header comment at the top |
| Standards docs in `docs/` | Wherever the tool is first introduced + in any reference table |
| `docs/SYSTEM_MAP.md`, `docs/AUTOMATION_AUDIT.md` | The columns must include Publisher and Package/URL |
| `docs/TESTING_STACK.md`, `docs/TOOL_COST_INDEX.md` | Already updated as the reference pattern — match its style |
| Wireframes / mermaid diagrams | Each named tool node carries `(Publisher · package)` in the label |
| Schemas (JSON Schema, OpenAPI, etc.) | `description` field on every external-dep property names its source |
| Work Request docs (`wr/issues/*.md`) | The "Reuse manifest" and "Build it with" sections must name publishers |
| PR descriptions | When citing tools in summaries |

---

## Why this matters (the enterprise pitch angle, again)

A buyer asks: *"What's actually under the hood?"* Today the honest answer for
some tools is "I'd have to dig through three workflows to tell you." With this
standard:
- The first place they look (`docs/SYSTEM_MAP.md`, the workflow headers, the
  cost index) names every dependency by publisher and exact package.
- No ambiguity = no awkward "let me get back to you" moments.
- Audit-ready out of the box.

It also helps agents: a Work Request that says "use Jules" is ambiguous; one
that says "use Jules (Google) via `BeksOmega/jules-action@v1.0.0`" sends the
agent to exactly the right action without guessing.

---

## Quick reference — the families you'll mention most

| You write… | Means |
| --- | --- |
| `Jules (Google) via BeksOmega/jules-action@v1.0.0` | The active Jules invoke lane |
| `Jules feedback (Google) via BeksOmega/jules-comms@v1.0.0` | Jules feedback lane |
| `Jules publish (Google) via BeksOmega/jules-publish@v1.0.0` | Jules publish lane |
| `Jules PR review (Google) via sanjay3290/jules-pr-reviewer@v1 — SILENCED` | The broken one in #13974 |
| `Keploy (Keploy Inc.) via github.com/apps/keploy + Chrome extension` | Our test generator |
| `OpenRouter (OpenRouter Inc.) via openrouter-coder.yml` | Our coder lane |
| `The Professor (us) via scripts/openrouter-personas.js (perplexity/sonar-pro)` | The research persona |
| `Vercel (Vercel Inc.) via the GitHub-Vercel integration` | Hosting |
| `ImgBot (ImgBot.net) via the GitHub App` | Image optimization |
| `Mabl (Mabl Inc., PAUSED) via @mablhq/mabl-cli` | Paused testing tool |
| `Octopus Review (Octopus Review Inc.) via github.com/apps/octopus-review + @octp/cli` | PR analyzer + issue filer. Secret: `OCTOPUS_TOKEN` (format `oct_...`). CLI wrapped by `.github/workflows/octopus-cli.yml`. Octopus-filed issues are translated into the WR pipeline by `.github/workflows/octopus-route.yml`. |
| `Bernstein (Bernstein contributors) via sipyourdrink-ltd/bernstein@v2.7.0` | Deterministic multi-agent orchestrator — spawns CLI coding agents (Claude Code, Codex, Gemini, Qwen) in parallel git worktrees, verifies with lint/type-check/tests, merges only passing worktrees. Chosen over `nyldn/claude-octopus` (HVTrust 20.2/100, Grade D) for its HMAC-signed audit chain and HVTrust score of 85.1/100 (Grade A). Manual dispatch via `.github/workflows/bernstein-orchestrator.yml`. Uses existing secrets `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`. Not to be confused with "Octopus Review" (unrelated PR-review SaaS, row above) or the "Claude Octopus" plugin (evaluated, not adopted). |
| `BIOME (us) via .github/workflows/biome-*.yml` | Credit-free, additive self-healing crew (no AI keys; `GITHUB_TOKEN` only). Workers: `biome-sentinel`, `biome-medic`, `biome-homeostat`, `biome-sheaf`. Status feed: `docs/biome/biome-status.json`. Design + registry: `docs/biome/README.md`, `docs/biome/crew.yml`. |
| `Fleet Controller (us) via .github/workflows/fleet-controller.yml` | Credit-free (no paid keys; the free `GITHUB_TOKEN` with the repo-standard `ADMIN_GITHUB_TOKEN` fallback so re-dispatch can cascade), fail-open grid scheduler over every orchestrator. Cuts + reassigns stalled/runaway runs to fallback LLMs, then escalates to self-healing. Core: `scripts/controller/core.js`; driver: `scripts/controller/controller.js`. Feeds: `docs/controller/controller-status.json` (Lovable), `docs/controller/controller-ingestion.json` (self-healing). Design: `docs/controller/README.md`. |

Extend as we add. Source of truth for costs stays
`docs/TOOL_COST_INDEX.md`; source of truth for active tools stays
`docs/TESTING_STACK.md`; this file is just the *naming standard*.
