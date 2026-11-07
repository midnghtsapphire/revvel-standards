# Repo: revvel-standards

## Description

This is the **single source of truth** for all Revvel and MIDNGHTSAPPHIRE standards, processes, and specifications. It is a **documentation and workflow repository**, not a code application.

## What It Contains

- **WR (Work Request) templates** — `wr/WR_TEMPLATE_BASIC.md` (recommended) and `wr/WR_TEMPLATE_FULL.md` (advanced)
- **GitHub Actions workflows** — Automation for research, ship-to-market, status auditing
- **Labels** — Standard labels for WR lifecycle management
- **Agents instructions** — How AI agents should behave
- **Process documentation** — Ship-to-market, research fleet, review fleet

## How to Use

### For New WRs
1. Copy `wr/WR_TEMPLATE_BASIC.md` to a new file in your WRs directory
2. Fill in **Title** and **Description**
3. The research engine auto-fills everything else

### For Workflows
- **Research Fleet**: Triggered by label `research`
- **Ship-to-Market**: Triggered by label `deliver:*`
- **Status Audit**: Run manually via GitHub Actions

## Environment

Mostly Markdown and GitHub Actions YAML, but **not documentation-only**: there
is a real `package.json` with a test suite, a typecheck and a linter, and
agents are expected to run them before opening a PR.

| Command | What it does |
|---------|--------------|
| `npm test` | `node --test tests/**/*.test.js` plus `tests/social_post_formatter.test.sh` |
| `npm run lint` | `scripts/markdownlint-repo.mjs` (`lint:fix` to repair) |
| `npm run typecheck` | `tsc -p tsconfig.json`; `npm run build` is this and nothing else |
| `npm run verify` | workflows:validate + lint + test — the one to run before a PR |
| `npm run llm:doctor` | which LLM lane is live, and whether it costs anything |

There are ~37 npm scripts in total, driving the tooling under `scripts/`. Read
`package.json` rather than assuming a command exists.

**LLM routing.** Work runs on Layer 0 first — LM Studio at
`http://127.0.0.1:1234/v1`, free. Cloud lanes are gated behind
`REVVEL_LLM_ALLOW_CLOUD=1` and are off by default locally. Run
`npm run llm:doctor` before assuming a model is reachable.

> This section said the opposite until 3 Nov 2026 — "No `package.json` with
> runnable code / No tests to execute" — while `package.json` carried 37 npm
> scripts and a two-part test command. An agent briefed with that had no reason
> to run the suite before opening a PR.

## Key Files

| Path | Purpose |
|------|---------|
| `wr/WR_TEMPLATE_BASIC.md` | Simple WR template |
| `wr/WR_TEMPLATE_FULL.md` | Advanced WR template |
| `.github/workflows/ship-to-market.yml` | Ship WR to production |
| `.github/workflows/research.yml` | Run market research |
| `SHIP_STATUS.md` | Status tracking |

---

*Updated: 2026-11-03*
