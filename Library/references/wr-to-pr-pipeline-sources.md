# Sources: WR-to-PR Pipeline Plan (2026-11-05)

These are the sources for `docs/plans/WR_TO_PR_PIPELINE_PLAN_2026-11-05.md`. They were
collected by Grok Bot (executor subagent) on 2026-11-05 (MST, UTC-7).

## Owner instructions (Audrey Evans, 2026-11-05)

These are relayed by the parent agent and TriageChief and recorded as given.

- Pipeline goal: Every request automatically becomes a WR (GitHub issue) and a draft PR at the
  same time. There is no gate on whether a request is worth doing. A bot rewrites the WR so it
  is clearer and keeps her original words verbatim alongside it.
- Merge direction, in her words: "can you approve those or from now on act silently and approve everything".
- Jules: Jules rewrites the WR text and the PR description and opens the draft PR. Its key is
  in env `JULES_API_KEY` and is never printed. No GitHub-hosted Actions. Code Jules writes uses
  no-key Perplexity or the repo model chain, with no new keys. There must be a manual fallback.
- Via TriageChief: The Jules rewrite runs in code (API, MCP, or CLI; document all three and
  name the default), never as a chat handoff between bots. The architecture is pull-only, with
  efficient pull paths (cursors, ETags, batching, caching, rate limits), because they may become
  APIs she sells.

## Repo documents read (branch `daily/2026-11-05`)

- `AGENTS.md`: owner rules (2026-10-30), Layer 0 LLM order, the spend gate
- `MASTER.md`: the pipeline, including step 6 "Jules normalize"
- `VISITING_AGENTS.md`: allowed write areas, the decisions ledger path
- `REPO_LIBRARY_STANDARD.md`, `WRITE_AS_YOU_GO_STANDARD.md`, `standards/LEDGER_STANDARD.md`
- `WR_TEMPLATE.md`, `WR_TEMPLATE_BASIC.md`, `.github/ISSUE_TEMPLATE/00-work-request.yml`
- `process/wr-pr-pipeline.md`: the auto-merge policy for the 4470 band
- `docs/BRAIN_DUMP_INTAKE.md`, `config/labels-allowlist.yml`
- `.github/workflows/anti-scaffolding-enforcer.yml`, `no-root-junk.yml`, `wr-rewrite.yml`,
  `wr-pr-creation.yml`, `brain-dump-intake.yml`: read only, not changed
- `scripts/local_llm.py`, `scripts/llm-spend-gate.js`, `scripts/perplexity-no-key-bridge.js`,
  `scripts/openrouter-triage.js`
- `scripts/confidence_scorer.py` and `docs/standards/confidence-scorer.md`, which exist only on
  `daily/2026-11-04` (PR #18249)

## External sources (read 2026-11-05)

- Google, *Jules API reference*: <https://developers.google.com/jules/api>
- Google, *Jules changelog*, 2026-10-29 entry "Jules Turndown" (sessions until 2026-11-11,
  shutdown 2026-12-31): <https://jules.google/docs/changelog/>
- Google, *Jules CLI reference*: <https://jules.google/docs/cli/reference/>
- Gemini CLI Jules extension (MCP wrapper around the CLI): <https://github.com/gemini-cli-extensions/jules>
- GitHub Docs, *Best practices for using the REST API* (conditional requests, since-cursors):
  <https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api>
- GitHub Docs, *Rate limits for the REST API* (primary and secondary limits):
  <https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api>

## Owner lock (Audrey Evans, 2026-11-05) — Q1 and Q2

Recorded by RulesSteward from 1-Git-Triage widget t83s308 → Proofy. The same lock is the
2026-11-05 comment on PR #18267. This file does not contain any Jules export, secrets, or
vault material. No bot is created from this note.

- **Q1 locked.** After 2026-11-11 the WR rewriter options are Roo or Roomote (Jules
  successor). Both are recorded. Audrey did not pick only one. Lane 4 (repo model chain)
  and verbatim are the fallbacks if Roo and Roomote are unavailable. No call path is
  specified.
- **Q2 locked.** Jules data export: Yes. Secret runs Google's Jules export into the vault
  only (never a repo). The export may include secrets. Free-tier first. Anything paid
  needs its own WR/PR for Audrey's approval.
