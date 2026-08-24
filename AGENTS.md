# AGENTS.md

This document provides guidance for AI agents (Cursor, Claude, GPT, etc.) working in this repository.

> ⚡ **Call chain (what starts → what runs next):**  
> Read **[`START_HERE_CALL_CHAIN.md`](./START_HERE_CALL_CHAIN.md)** before changing workflows or claiming a step is “done.”  
> Do not invent a second pipeline; do not edit random folders for UI color — see that file’s “Where to change” table.
>
> **Visiting / transient agent?** (OpenHands, Cursor Cloud, Lovable, Replit, a one-off
> API caller…) Read [`VISITING_AGENTS.md`](./VISITING_AGENTS.md) **first** — it's the
> short guest contract: where you may write, where setup/API info lives, and how not to
> scaffold over the repo.
>
> Every error is a training module. Append lessons to [`learnings.md`](./learnings.md)
> using the TM-NNNN format at the bottom of that file — future agents (and future
> auto-fix scripts) read those modules as their curriculum.

## PRIME DIRECTIVE

**Start at $10k/month → Scale to $10M total by year 3**

Every change should be evaluated against this north star. Prefer work that:

1. Ships revenue-generating products faster
2. Reduces friction in the automated product pipeline
3. Improves Polar.sh / GitHub funding integrations
4. Strengthens OSINT tooling that we monetize

## BNAT Knowledge Sheaf — imprint before work

Every agent instantiation should call the imprint path and assert the geometric
invariant before high-blast edits:

```bash
node scripts/bnatsheaf/cli.js imprint_agent --agent <name>
node scripts/bnatsheaf/cli.js consistency_check --epsilon 1e-9
```

- Standard: `standards/BNAT_SHEAF_STANDARD.md`
- Skill: `skills/bnatsheaf/SKILL.md`
- Math + PH + cohomology: `scripts/bnatsheaf/`
- Public Observatory (Method · Living Manifold): `docs/bnatsheaf/observatory.html`
- Long-lived H¹ bars escalate — never silently glue
  (`wr/pending/14-veins-grounding-gate.md`).

## Goal Structure

- **Phase 1:** $10k/month (Month 1–6)
- **Phase 2:** $30k/month (Month 6–18)
- **Phase 3:** $100k/month (Month 18–30)
- **Phase 4:** $10M total (Month 30–36)

## Focus Areas

1. **POLAR.SH** — GitHub funding platform integrations
2. **OSINT tools** — Productized intelligence utilities
3. **Automated product pipeline** — Templates, scaffolding, CI/CD

## ⛔ ORCHESTRATOR DISCIPLINE — stay in your lane (read this every time)

> **The #1 failure mode, learned the hard way:** a capable agent (e.g. Manus)
> kept *doing the work itself* instead of assigning it out and recording who did
> what. It reverted to "I'll just do it" every time it wasn't reminded — because
> it *could*. That destroys the two things that matter most: **parallelism** and
> **provenance** (the record of who proposed what, who executed, which LLM/route
> performed — the data we actually measure and monetize).

**If you are an orchestrator / controller / overseer, your job is to DELEGATE and
RECORD — not to do the task.** Specifically:

1. **Do only YOUR job.** The moment you hit a *specialty task* or a *roadblock*,
   **immediately delegate** it to the right agent/LLM (via OpenRouter / the
   fallback chain / a sub-agent) — and **do not come back to do it yourself**.
2. **"You can do it" is not "you should do it."** Capability is the trap. Even
   when doing it yourself looks faster right now, delegating + measuring is the
   job and compounds.
3. **Record provenance for everything:** who proposed the idea, who executed,
   which model/route was used, how long it took, and how it scored. That ledger
   (`logs/agent-audit/`, the scorecard, `wr/memory/decisions.jsonl`) IS the product.
4. **Re-anchor often.** If you notice yourself writing code/content that belongs
   to another agent's lane, **stop, hand it off, and log it.** Re-read this
   section — it's the sticky note. Everyone forgets this under load; the reminder
   is what snaps the behavior back.

Exception: a task explicitly *scoped to you* (you are the assigned specialist) —
then do it well, fast, and hand the result + provenance back to the orchestrator.

## Conventional Commits

All commits and PR titles must use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation only
- `chore:` — tooling / maintenance
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `test:` — adding or updating tests
- `ci:` — CI/CD changes

## Cursor Cloud specific instructions

These instructions help Cursor Cloud (and other remote) agents bootstrap quickly
in this repository. Keep this section updated as the layout evolves.

### Repository structure

This is a **monorepo** that combines repo-wide standards with individual
revenue-generating products:

```text
/                       # Root: standards, shared tooling, CI workflows
├── .github/            # GitHub Actions workflows and issue templates
├── AGENTS.md           # This file
├── package.json        # Root tooling (markdownlint, yaml parsing, tests)
└── products/           # Individual shippable products (Next.js, etc.)
    ├── music-video-creator/
    ├── affiliate-hub/
    ├── ai-video-toolkit/
    ├── screen-recorder-finder/
    ├── revvel-skill-runner/
    ├── creator-payout-tracker/
    ├── hvac-calc-service/
    ├── fda-design-controls/
    └── agent-manifest-validator/
```

Root-level code is intentionally lightweight — it provides linting, validation,
and shared CI. Each product under `products/` is self-contained and owns its
dependencies, build, and deploy pipeline.

### Node.js products and port assignments

When running multiple products locally, use the assigned ports below to avoid
collisions:

| Product | Path | Dev port | Notes |
| --- | --- | --- | --- |
| Music Video Creator | `products/music-video-creator` | 3000 | Next.js. Requires API keys for full functionality (see product README). |
| Affiliate Hub | `products/affiliate-hub` | 3001 | Next.js. May require `npm install --legacy-peer-deps` (see gotchas). |
| AI Video Toolkit | `products/ai-video-toolkit` | 3002 | Next.js. |
| Screen Recorder Finder | `products/screen-recorder-finder` | 3003 | Next.js. |
| Revvel Skill Runner | `products/revvel-skill-runner` | 3004 | Next.js. Needs `OPENROUTER_API_KEY` for live skill execution. |
| Creator Payout Tracker | `products/creator-payout-tracker` | 3005 | Next.js. Shippable deep-research product for creator payout rankings. |
| HVAC Calc Service | `products/hvac-calc-service` | 3006 | Next.js. ACCA Manual J/S/D HVAC load calculator with Markdown/CSV export. |
| CLI Engine | `products/cli-engine` | 3008 | Next.js. Glassmorphic CLI agent terminal UI with PDF export and Stripe billing. |
| AI Ad Generator | `products/ai-ad-generator` | 3009 | Next.js. Zeely AI-inspired ad automation: product scraper, AI copy, static creatives, campaign manager, analytics. |
| Red Light Therapy Dosage Calculator | `products/red-light-therapy-dosage-calculator` | 3010 | Next.js. Mobile-friendly PBM/red-light session-time calculator using irradiance and target dose. |
| FDA Design Controls | `products/fda-design-controls` | 3010 | Next.js. Interactive 21 CFR 820.30 compliance checklist and DHF generator with Markdown/CSV export. |
| MedDevice Compliance Navigator | `products/meddevice-compliance-navigator` | 3010 | Next.js. Medical device compliance tracker: FDA 510(k), ISO 13485, IEC 60601, ISO 10993, EU MDR pathways. |
| DevOps Dashboard | `products/devops-dashboard` | 3011 | Next.js. Real-time DevOps monitoring: self-healing PRs, CI/CD pipeline health, agent status, workflow run history. |
| WR Title Studio | `products/wr-title-studio` | 3012 | Next.js. Autocreate clean generic `[WR]` titles from messy drafts; keyless template engine. |
| GOAP Swarm Console | `products/goap-swarm-console` | 3012 | Next.js. Symbolic GOAP planner + swarm allocator, research eval, Markdown/CSV export. |
| GoSQLX SQL Linter | `products/gosqlx-sql-linter` | 3012 | Next.js. Multi-dialect SQL lint playground + API aligned with GoSQLX rules; CI twin of `.github/workflows/gosqlx-lint.yml`. |
| Easy Env Vars | `products/easy-env-vars` | 3012 | Next.js. Safe briantist/ezenv env-block composer with injection/cycle validation and workflow export. |
| MergeMe Status | `products/mergeme-status` | 3012 | Next.js. mergeme.dev wiring status console + owner Slack/GitHub App setup checklist (WR #16824). |
| GHCR Console | `products/ghcr-console` | 3012 | Next.js. GitHub Container Registry setup console + image ref builder + owner Packages checklist (WR #17695). Image: `ghcr.io/midnghtsapphire/revvel-standards/ghcr-console`. |
| pplx-api Skills Console | `products/pplx-api-skills` | 3012 | Next.js. Perplexity API integration with skills/tools framework, auth, rate limits, BOM lookup, monitoring. Needs `PERPLEXITY_API_KEY` for live mode (mock works without). |
| Caspian Channel Console | `products/caspian-channel-console` | 3012 | Static SPA. Multi-channel agent planner/simulator from Caspian SDK research (WR-16898). |
| Greenfield UI Lab | `products/greenfield-ui-lab` | 3012 | Next.js. Modernized idea board + day wallet from rgn/greenfield-ui research patterns. |
| Groq Code Review | `products/groq-code-review` | 3012 | Next.js. Groq-powered PR review SaaS + composite Action with large-diff chunking and local fallback. |
| Star Optimizer | `products/star-optimizer` | 3012 | Next.js. Rank starred GitHub repos by activity/recency; pairs with `scripts/prioritize_stars.py` automation. |

Start a specific product on its assigned port:

```bash
cd products/music-video-creator && npm run dev -- -p 3000
cd products/affiliate-hub        && npm run dev -- -p 3001
cd products/ai-video-toolkit     && npm run dev -- -p 3002
cd products/screen-recorder-finder && npm run dev -- -p 3003
cd products/revvel-skill-runner  && npm run dev -- -p 3004
cd products/creator-payout-tracker && npm run dev -- -p 3005
cd products/cli-engine           && npm run dev -- -p 3008
cd products/ai-ad-generator      && npm run dev -- -p 3009
cd products/red-light-therapy-dosage-calculator && npm run dev -- -p 3010
cd products/fda-design-controls  && npm run dev -- -p 3010
cd products/meddevice-compliance-navigator && npm run dev -- -p 3010
cd products/devops-dashboard     && npm run dev -- -p 3011
cd products/wr-title-studio      && npm run dev -- -p 3012
cd products/gosqlx-sql-linter    && npm run dev -- -p 3012
cd products/easy-env-vars        && npm run dev -- -p 3012
cd products/mergeme-status       && npm run dev -- -p 3012
cd products/ghcr-console         && npm run dev -- -p 3012
cd products/pplx-api-skills      && npm run dev -- -p 3012
# Static: python3 -m http.server 3012 -d products/caspian-channel-console/public
cd products/greenfield-ui-lab     && npm run dev -- -p 3012
cd products/groq-code-review      && npm run dev -- -p 3012
cd products/star-optimizer       && npm run dev -- -p 3012
```

### Running and testing

**Root level** (standards, workflow validation, markdown linting):

```bash
npm install          # installs markdownlint-cli2, yaml, etc.
npm test             # runs root test suite (workflow / YAML validation)
npm run lint         # runs markdownlint across the repo
```

**Per-product** (run from inside the product directory):

```bash
cd products/<product-name>
npm install          # add --legacy-peer-deps if peer-dep conflicts occur
npm run dev          # start dev server (pass -- -p <port> to override)
npm run build        # production build
npm run lint         # product-specific lint
npm test             # product-specific tests (if defined)
```

### Known gotchas

- **Never call an LLM provider directly.** Route through
  `scripts/local_llm.py` (Python) or `scripts/llm-spend-gate.js` (JavaScript).
  Local first, and the paid lane is refused unless `REVVEL_LLM_ALLOW_CLOUD=1`.
  A new ungated call site fails the build. See **Layer 0** below.

- **`affiliate-hub` peer dependencies:** `npm install` may fail due to peer
  dependency conflicts. Use `npm install --legacy-peer-deps` if needed.
- **Music Video Creator ESLint:** A known ESLint configuration issue may surface
  during `npm run lint`. It does not block `npm run build` or `npm run dev`.
- **API key requirements:** Several products (notably Music Video Creator) need
  third-party API keys at runtime. Missing keys degrade functionality but do
  not prevent the dev server from starting — check the product's `.env.example`
  and README for the required variables.
- **Pre-existing workflow test failures:** A small number of root `npm test`
 failures stem from intentionally malformed YAML fixtures used to validate
 error paths. Treat the suite as green if only those known cases fail.
- **Root `npm run lint` exits non-zero on a clean tree.** It runs
 `markdownlint-cli2`, which does **not** honor the repo's `.markdownlintignore`,
 so it still flags committed generated files under
 `docs/agents/**/transcripts/*.md`. It also recurses into any installed
 `products/*/node_modules/**/*.md`, producing tens of thousands of errors. These
 are pre-existing / environment noise, not caused by your change — scope the
 output to the specific `.md` files you touched (e.g.
 `npx markdownlint-cli2 <your-file>.md`) rather than trying to green the whole
 tree.
- **`hvac-calc-service` install fails with `EOVERRIDE`.** Its `package.json`
 `overrides.postcss` range conflicts with its direct `postcss` devDependency, so
 `npm install` aborts. Other products install cleanly; use a different product
 (e.g. `red-light-therapy-dosage-calculator`) when you just need a keyless
 sample app to run.
- **Root `npm run lint` differs from the CI markdown gate.** The script's
 ignore globs only exclude *root-level* `node_modules`/`transcripts`, so it
 reports tens of thousands of errors from committed
 `docs/agents/claude/transcripts/**` files and from any installed
 `products/*/node_modules` (product deps are gitignored and absent in a fresh
 CI checkout). The authoritative gate is `.github/workflows/lint-md.yml`
 (`markdownlint-cli2`), which excludes those paths; the repo's own ~1000
 markdown files lint clean. Don't treat the root script's error flood as a
 regression you introduced.
- **Port conflicts:** Always pass `-- -p <port>` to `npm run dev` when running
 more than one product simultaneously; defaults all collide on 3000.
- **Next.js "multiple lockfiles" warning is benign:** Each product ships its own
 `package-lock.json` while the repo root also has one, so `npm run dev` inside a
 product prints a "Next.js inferred your workspace root … detected additional
 lockfiles" warning. The dev server still starts and serves normally — ignore it.
 Root `npm install` does NOT install product deps; run `npm install` inside each
 `products/<name>/` you intend to run.
- **OpenRouter is NOT free-for-all:** `OPENROUTER_API_KEY` must belong to a
  **funded/verified** OpenRouter account. Even `:free` models need credits, so a
  missing or unfunded key returns `401/402/403/429`, not a completion. Automation
  must therefore always fall back to a keyless lane (e.g. the keyless Perplexity
  bridge in `scripts/openrouter-triage.js` → `triageWithFallback()`). If triage
  or research "isn't processing," check the key **and** the balance at
  <https://openrouter.ai/credits> before assuming a code bug.

## Layer 0 — local LLMs first, and the spend gate

Read this before you make any LLM call from this repo.

`wr/agents/HIERARCHY.md` puts local models at Layer 0 and targets 60–70% of
work there. `scripts/local_llm.py` implements that ordering for every caller:
**LM Studio → Ollama → OpenRouter**, with the paid lane refused by default.

### The gate

Nothing here may bill a provider unless someone said so. `REVVEL_LLM_ALLOW_CLOUD`
must be exactly `"1"` — `true`, `yes` and `TRUE` all fail closed, deliberately,
so a half-remembered value cannot spend money.

- JavaScript: `scripts/llm-spend-gate.js` → `assertCloudAllowed('your-caller')`
- Python: `cloud_allowed()` in `scripts/local_llm.py`, or the local
  `_assert_cloud_allowed` helpers
- Workflows: the repository **variable** of the same name, checked with
  `if: vars.REVVEL_LLM_ALLOW_CLOUD == '1'`

`tests/llm-spend-gate-coverage.test.js` **discovers** call sites rather than
trusting a list, so a new ungated one fails the build. Do not work around it —
if your call genuinely needs the cloud, open the gate in that one workflow with
a comment saying why the work cannot run locally.

Why it exists: ~$80 of OpenRouter spend appeared in a single day with nobody
touching the repo. 46 scheduled workflows fired ~496 runs/day, ten of them
calling OpenRouter (#17849). Spend then sat at zero for months for the *wrong*
reason — the account was at 402, which is an outage that looks like a control.

### Using it

```bash
python3 scripts/local_llm.py doctor          # what is reachable, exits non-zero if nothing is
python3 scripts/local_llm.py load <model-id> # load a model without touching the LM Studio UI
python3 scripts/local_llm.py ask "prompt"    # one completion; prints the lane and whether it billed
```

```python
import sys; sys.path.insert(0, "scripts")
import local_llm
r = local_llm.complete("...")
r.lane      # 'lane-0-lmstudio'
r.is_local  # True -> this cost nothing
```

`complete(..., allow_cloud=False)` forbids the paid lane for that call even if
the environment allows it. A caller can narrow the gate; nothing can widen it.

### Gotchas that have actually bitten

- **An embedding model is not a chat model.** LM Studio lists both in
  `/v1/models`. Selecting "the first loaded model" can pick
  `text-embedding-*` and send it to `/chat/completions`, which fails with a
  provider error naming nothing useful. `is_embedding_model()` filters them; if
  only embeddings are loaded, `doctor` says so and exits non-zero.
- **A 401 is not "unreachable".** LM Studio 0.4.0 can require a bearer token
  (`LMSTUDIO_API_KEY`). Reporting a secured server as unreachable sends you to
  check whether LM Studio is running when it plainly is. The model probe takes
  a `strict` flag for exactly this — and strict still raises `LaneUnavailable`
  rather than a raw error, or failover to Ollama breaks.
- **Two different API surfaces.** Inference uses the OpenAI-compatible `/v1`;
  model management (`load`, `unload`, `download`) lives on the native
  `/api/v1`, which needs LM Studio 0.4.0+. `lmstudio_native_base()` derives one
  from the other so they cannot drift apart. A 404 on `load` usually means an
  older LM Studio, not a broken endpoint.
- **`urllib` sends `127.0.0.1` through `http_proxy`.** On a machine behind a
  corporate proxy or VPN — which a work laptop usually is — the call to your own
  LM Studio gets routed to the proxy and Layer 0 looks broken for a reason that
  has nothing to do with LM Studio. Local lanes use an opener with
  `ProxyHandler({})`. If you write a new local client, do the same.
- **A GitHub-hosted runner cannot reach a laptop.** `ubuntu-latest` is a VM in
  Azure; `127.0.0.1` is its own loopback. Every LLM call made from CI is a
  billed call. `.github/workflows/wr-rewrite.yml` is `runs-on: self-hosted` for
  this reason, and `tests/local-llm-cascade.test.js` pins that — "fixing" it to
  `ubuntu-latest` makes it green *and* 100% billed.

Setup, including the Windows specifics: `docs/LOCAL_LLM_SETUP.md`.

## Commenting

Comment **robustly, for the next human** (who may not be you and can't skim code
as fast as an agent): explain *why*, document external-service gotchas at the
call site, and always state the fallback / "what to check if it fails." See
`standards/CODE_COMMENTING_STANDARD.md`.
