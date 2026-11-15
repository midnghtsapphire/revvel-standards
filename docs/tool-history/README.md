# Tool history and decision log

Why Audrey liked or disliked each tool or agent she used, with links to the
evidence. Four years from now this should answer: what did I try, what did it
do, why did I keep it or drop it, and what proof is there.

It is also client proof of what works for local, small, medium, and enterprise
setups. The size-by-size sort is a follow-up; it needs her verdicts first.

## How this fits the logs that already exist

This extends them. It does not replace them, and it does not edit them.

- [`DECISIONS.md`](../../DECISIONS.md): numbered decisions (D001 to D016). Tool
  cuts and keeps live there.
- [`docs/TOOL_COST_INDEX.md`](../TOOL_COST_INDEX.md): cost and keep or cut per
  tool. Tests pin it.
- [`data/subscriptions.yml`](../../data/subscriptions.yml): subscriptions and
  trial dates.
- [`docs/UPGRADE_LOG.md`](../UPGRADE_LOG.md): tier changes.
- [`docs/agents/`](../agents/README.md): per-agent profiles.
- [`docs/Master Revvel-Standards Flow Charts/TOOLS_CATALOG.md`](<../Master Revvel-Standards Flow Charts/TOOLS_CATALOG.md>):
  generated catalog of tools in the flow.

The `.github/workflows/mabl.yml` header already recorded "what it did, what we
liked, what we did not" for one tool. This log gives every tool that treatment
in one place.

## Files

- [`TOOLS.csv`](TOOLS.csv): one row per tool. Columns: tool, category,
  first_seen, last_seen, status (active, dropped, trial, unknown), cost_model,
  used_for, verdict, why, evidence_links, needs_audrey_input.
- One markdown file per tool, linked in the table below.
- [`visiting-llms.md`](visiting-llms.md): the cross-tool problem of visiting
  LLMs forgetting rules, and what now enforces them.

## Rules for entries

1. Use only evidence you can link: a repo file, commit, PR, issue, or
   Discussion in `midnghtsapphire` or `freedom-angel-corp`. Link it.
2. Never invent an opinion, date, or cost. If Audrey's verdict is unknown, write
   `NEEDS AUDREY`.
3. Never delete an entry or a line of history. Add a new dated line and say what
   it supersedes.
4. No secrets, keys, or tokens. Not even in quotes from old PRs.
5. `first_seen` and `last_seen` are the earliest and latest dated artifact found
   in these repos. They are not adoption dates.

## What the verdict labels mean

- `AUDREY: ...`: she said it herself. The date is in the text.
- `RECORDED: ...`: a decision written down in the repo. The repo shares one
  GitHub login, `midnghtsapphire`, so a decision made under that login may have
  been drafted by an agent. Treat it as a record, not as her confirmed opinion.
- `NEEDS AUDREY`: no verdict on record.

## How to add an entry

1. Search first: `gh search issues "<tool>" --owner midnghtsapphire --owner freedom-angel-corp`
   and the same with `prs`, then `git grep -w "<tool>"` in this repo.
2. Copy an existing tool file. Keep the same sections: what it was used for,
   what worked, what did not work, why kept or dropped, evidence, open gaps.
3. Add one row to `TOOLS.csv`. Quote any field that has a comma.
4. Add the row to the table below.
5. Update `CHANGELOG.md`, `LEDGER.md`, and `Library/README.md` in the same
   commit.

## Visiting-agent rules

Audrey's rules for every visiting agent are in
[`VISITING_AGENTS.md`](../../VISITING_AGENTS.md) section 1b. They are checked by
`scripts/visiting-agent-scan.js`, driven by
[`config/visiting-agent-patterns.json`](../../config/visiting-agent-patterns.json),
and run in CircleCI.

## Tools logged (44)

| Tool | Category | Status | First evidence | Latest evidence | Verdict |
| --- | --- | --- | --- | --- | --- |
| [Augment Code](augment-code.md) | code review / agent | active | 2026-05-06 | 2026-05-28 | NEEDS AUDREY |
| [Bito](bito.md) | code review | unknown | 2026-04-30 | 2026-11-11 | AUDREY |
| [CircleCI](circleci.md) | CI | active | 2026-04-20 | 2026-11-11 | NEEDS AUDREY |
| [Claude (Claude Code, API)](claude.md) | LLM / coding agent | active | 2026-04-25 | 2026-11-11 | NEEDS AUDREY |
| [Cloudflare](cloudflare.md) | DNS | active | 2026-11-09 | 2026-11-11 | AUDREY |
| [CodeQL / Semgrep](codeql-semgrep.md) | security scanning | active | 2026-04-30 | 2026-08-21 | RECORDED |
| [CodeRabbit](coderabbit.md) | code review | active | 2026-03-07 | 2026-08-16 | RECORDED |
| [cubic](cubic.md) | code review | unknown | 2026-06-15 | 2026-08-16 | NEEDS AUDREY |
| [Cursor (IDE, cloud agents)](cursor.md) | coding agent | active | 2026-04-30 | 2026-11-11 | NEEDS AUDREY |
| [Cursor Bugbot](cursor-bugbot.md) | code review | active | 2026-11-03 | 2026-11-11 | NEEDS AUDREY |
| [Dependabot](dependabot.md) | dependency updates | active | 2026-04-14 | 2026-11-06 | RECORDED |
| [Deploybot](deploybot.md) | deploy | active | 2026-08-21 | 2026-08-21 | RECORDED |
| [Devin (Cognition)](devin.md) | coding agent / code review | unknown | 2026-04-25 | 2026-08-17 | NEEDS AUDREY |
| [DigitalOcean](digitalocean.md) | hosting | active | 2026-02-16 | 2026-11-11 | NEEDS AUDREY |
| [Doppler](doppler.md) | secrets | active | 2026-04-25 | 2026-08-12 | NEEDS AUDREY |
| [Gitar](gitar.md) | code review / CI fix | active | 2026-11-05 | 2026-11-11 | NEEDS AUDREY |
| [GitGuardian](gitguardian.md) | secret scanning | active | 2026-04-23 | 2026-11-11 | NEEDS AUDREY |
| [GitHub Copilot (coding agent, code review)](github-copilot.md) | coding agent / code review | active | 2026-04-14 | 2026-08-27 | RECORDED |
| [GitHub-hosted Actions](github-hosted-actions.md) | CI | unknown | 2026-04-01 | 2026-11-04 | AUDREY |
| [Google Antigravity](antigravity.md) | agentic IDE | unknown | 2026-04-23 | 2026-06-02 | NEEDS AUDREY |
| [Graphite](graphite.md) | stacked PRs | unknown | 2026-04-20 | 2026-08-17 | NEEDS AUDREY |
| [Grok (xAI) and the Grok bots](grok.md) | LLM / bot platform | active | 2026-08-03 | 2026-11-11 | AUDREY |
| [Jules (Google)](jules.md) | coding agent | dropped | 2026-04-19 | 2026-11-05 | RECORDED |
| [Keploy](keploy.md) | testing | active | 2026-05-28 | 2026-07-09 | RECORDED |
| [LM Studio / Ollama (local LLMs)](lm-studio-ollama.md) | local LLM | active | 2026-07-23 | 2026-11-10 | RECORDED |
| [Lovable](lovable.md) | app builder | dropped | 2026-03-16 | 2026-04-30 | RECORDED |
| [mabl](mabl.md) | testing | dropped | 2026-04-15 | 2026-07-09 | AUDREY |
| [Manus](manus.md) | autonomous agent | unknown | 2026-02-25 | 2026-11-11 | AUDREY |
| [n8n](n8n.md) | automation | trial | 2026-04-23 | 2026-11-05 | RECORDED |
| [Octopus Review](octopus-review.md) | code review | dropped | 2026-05-28 | 2026-08-21 | RECORDED |
| [OpenAI Codex](codex.md) | coding agent | active | 2026-07-22 | 2026-11-11 | NEEDS AUDREY |
| [OpenClaw](openclaw.md) | agent framework | unknown | 2026-02-13 | 2026-07-20 | NEEDS AUDREY |
| [OpenHands](openhands.md) | coding agent | active | 2026-04-20 | 2026-10-31 | RECORDED |
| [OpenRouter](openrouter.md) | LLM routing | active | 2026-04-16 | 2026-11-11 | RECORDED |
| [Perplexity](perplexity.md) | research / LLM | unknown | 2026-05-16 | 2026-11-05 | NEEDS AUDREY |
| [Railway](railway.md) | hosting | trial | 2026-10-16 | 2026-11-07 | NEEDS AUDREY |
| [RecurseML](recurseml.md) | code review | dropped | 2026-04-14 | 2026-08-21 | RECORDED |
| [Renovate](renovate.md) | dependency updates | unknown | 2026-07-13 | 2026-07-25 | NEEDS AUDREY |
| [Replit](replit.md) | app builder | unknown | 2026-02-20 | 2026-06-19 | NEEDS AUDREY |
| [Rollbar](rollbar.md) | error monitoring | unknown | 2026-08-21 | 2026-08-21 | RECORDED |
| [Roo / Roomote (and Roo-Cline, Cline)](roo-roomote.md) | coding agent | trial | 2026-05-03 | 2026-11-11 | NEEDS AUDREY |
| [Stripe](stripe.md) | payments | trial | 2026-07-03 | 2026-11-11 | AUDREY |
| [Supabase](supabase.md) | database | unknown | 2026-03-07 | 2026-08-09 | RECORDED |
| [Vercel](vercel.md) | hosting | unknown | 2026-05-01 | 2026-11-09 | NEEDS AUDREY |
