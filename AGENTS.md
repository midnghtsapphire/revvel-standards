# AGENTS.md

This document provides guidance for AI agents (Cursor, Claude, GPT, etc.) working in this repository.

> **Visiting / transient agent?** (OpenHands, Cursor Cloud, Lovable, Replit, a one-off
> API caller…) Read [`VISITING_AGENTS.md`](./VISITING_AGENTS.md) **first** — it's the
> short guest contract: where you may write, where setup/API info lives, and how not to
> scaffold over the repo.

## PRIME DIRECTIVE

**Start at $10k/month → Scale to $10M total by year 3**

Every change should be evaluated against this north star. Prefer work that:

1. Ships revenue-generating products faster
2. Reduces friction in the automated product pipeline
3. Improves Polar.sh / GitHub funding integrations
4. Strengthens OSINT tooling that we monetize

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
    └── creator-payout-tracker/
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
| CLI Engine | `products/cli-engine` | 3008 | Next.js. Glassmorphic CLI agent terminal UI with PDF export and Stripe billing. |

Start a specific product on its assigned port:

```bash
cd products/music-video-creator && npm run dev -- -p 3000
cd products/affiliate-hub        && npm run dev -- -p 3001
cd products/ai-video-toolkit     && npm run dev -- -p 3002
cd products/screen-recorder-finder && npm run dev -- -p 3003
cd products/revvel-skill-runner  && npm run dev -- -p 3004
cd products/creator-payout-tracker && npm run dev -- -p 3005
cd products/cli-engine           && npm run dev -- -p 3008
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
- **Port conflicts:** Always pass `-- -p <port>` to `npm run dev` when running
  more than one product simultaneously; defaults all collide on 3000.
- **OpenRouter is NOT free-for-all:** `OPENROUTER_API_KEY` must belong to a
  **funded/verified** OpenRouter account. Even `:free` models need credits, so a
  missing or unfunded key returns `401/402/403/429`, not a completion. Automation
  must therefore always fall back to a keyless lane (e.g. the keyless Perplexity
  bridge in `scripts/openrouter-triage.js` → `triageWithFallback()`). If triage
  or research "isn't processing," check the key **and** the balance at
  <https://openrouter.ai/credits> before assuming a code bug.

## Commenting

Comment **robustly, for the next human** (who may not be you and can't skim code
as fast as an agent): explain *why*, document external-service gotchas at the
call site, and always state the fallback / "what to check if it fails." See
`standards/CODE_COMMENTING_STANDARD.md`.
