# RULES

**Version 1, 14 Nov 2026 (America/Denver). Status: DRAFT in a pull request until Audrey merges it.**

This is the one rulebook. Each rule lives here once, with a stable ID. Other files link to an ID instead of repeating it.
The old rule files are kept, unedited, under [`legacy/`](legacy/README.md). Nothing was deleted.

How it is built: **METAL** is the public governance and provenance face. **HULL** is the protective kernel under it.
Code and deterministic search are the foundation. Agents work only when called, through a CLI or MCP surface.
Rules marked **DEFAULT — Audrey to confirm** are my best reading of a question she has not answered yet.
Rules marked **PENDING** wait for her scope.

## A. Authority

- **A1** Audrey's own message beats this file. This file beats every other file in this repo, including everything in `legacy/`.
- **A2** An agent's say-so, a label, a bot approval or a green check is never Audrey's yes.
- **A3** If two rules here collide, the stricter one wins and a WR is opened to fix the file.
- **A4** A rule that is not written here is advice, not law. Other files link to the ID; they do not restate the rule.
- **A5** This file changes only by WR plus draft PR plus Audrey's yes. IDs are never reused. A retired rule is struck through, not removed.

## B. Safety

- **B1** Never delete anything (files, code, branches, issues, history, data) without Audrey's explicit yes. Retire by comment, or by renaming into `legacy/` or `Archive/YYYY-MM-DD/`.
- **B2** Never rewrite or overwrite existing work wholesale. Add, supersede with a dated note, keep the original.
- **B3** No force-push, on any branch, ever. No history rewrite. This overrides any `--force` or `--force-with-lease` example in `standards/`, `docs/` or `skills/`.
- **B4** Never echo a secret: not in chat, logs, issues, PRs, commits or tool output. Secrets go on stdin or in the approved store, never in argv or git. A leaked secret is reported by file:line only, and Audrey rotates it.
- **B5** Ask Audrey first, then wait, for: workflow, permission or CI-config changes; deploys; deletions; major dependency bumps; real red checks (not noise).
- **B6** Nobody pushes to `main`. No agent merges its own PR.
- **B7** Back everything up to GitHub. Private or copyrighted material goes in a private repo. Public repos get pointers, hashes and rebuild steps only. Nothing lives only on the bot box.
- **B8** Read-only on Audrey's local computer unless she asks for more.
- **B9** Case files stay as received. No edits, renames, reformatting, lint fixes or cleanup in `docs/case-files/` or any copy of it.
- **B10** Fake or synthetic data is allowed only in dev and must be labeled FAKE in the filename, in a header and in every output. It is never evidence. It never feeds a Linear A finding, a ledger or hypothesis entry, or a merge.

## C. Work flow

- **C1** Every request gets a WR issue and a draft PR. The PR is opened as a draft and assigned to `midnghtsapphire`. TriageChief titles and comments start with "**TriageChief:**" and end with "— TriageChief".
- **C2** Work targets the current `daily/YYYY-MM-DD` branch (America/Denver date). How `daily/*` is promoted to `main` is written down in [`docs/CUTOVER_PLAN.md`](docs/CUTOVER_PLAN.md) as an open question.
- **C3** Merge gates, all required before TriageChief merges (see also B5, B6):
  - **C3a** The PR is not a draft, is mergeable, and is assigned.
  - **C3b** CircleCI is green.
  - **C3c** Bugbot findings at Medium or higher block. Lower ones do not.
  - **C3d** The secret scan passes: GitGuardian, or TriageChief's own scan when GitGuardian is unavailable.
  - **C3e** The SonarCloud quality gate passes. The 50k-LOC cancel or skip is not a failure and does not block.
  - **C3f** Cubic, Devin and Gitar are neutral: advice only, never required, never blocking.
  - **C3g** Merging also needs Audrey's approval card.
- **C4** BOM rule: a missing piece of data, an API, a secret or a host is **paused, not failed**. Add one row to the BOM "Audrey to get" list. Skip only that part and ship the rest. The WR and the PR are not failed or closed for it. Do not ask Audrey for a secret mid-work.
- **C5** BOM rows say: what it is, why it is needed, which WR or PR, free or paid, and the link to get it. Use the existing process in `docs/Universal-BOM_List/` and `docs/_MASTER_BOM.md`; do not start a second list.
- **C6** Every claim carries a tag and a receipt: CITED (a URL, commit or file:line), MEASURED (a test or command output), or ESTIMATED. Nothing unverified is stated as fact.
- **C7** `LEDGER.md` and `CHANGELOG.md` entries land in the same commit as the change. They are append-only.

## D. Quality

- **D1** Every PR has a live web test surface Audrey can click, even when the product is an API, a CLI or an MCP server.
- **D2** The surface is host-neutral: local run, tunnel, preview or hosted all count. No vendor is required. If no host exists yet, the PR carries the local run command and one BOM row for the host (C4). It does not fail.
- **D3** Deliverables per qualifying PR: one item per category (GitHub Action or Docker package, app, CLI, MCP server, API, skill, tool) plus 3 sellable PDFs. **PENDING — scope pending Audrey** (what counts as "qualifying" is not confirmed).
- **D4** No scaffolding in delivered work: no TODO stubs, placeholders or "coming soon".
- **D5** Done means built, tested and shown on the test surface, with receipts (C6).

## E. Cost and hosting

- **E1** Never use paid GitHub features. GitHub-hosted Actions runners are billing-locked: they are never a gate and never a dependency. CI runs on CircleCI.
- **E2** **DEFAULT — Audrey to confirm:** automation and production run on GitHub plus CircleCI, never on the bot box. The bot box is scratch space for drafting and local checks.
- **E3** Tell Audrey before adding credits, before any paid sign-up and before any spend. Cloud LLM calls stay off until she says so (`REVVEL_LLM_ALLOW_CLOUD`). A 402 or a credit shortfall is reported to her, not silently failed over.
- **E4** Secret values live only in the approved store, never in git. Which single store is the approved one is a decision for Audrey (see `docs/CUTOVER_PLAN.md`).

## F. Visiting agents

- **F1** Read all of `revvel-standards` before you work, starting with this file.
- **F2** **DEFAULT — Audrey to confirm:** add no tracking, analytics, telemetry, affiliate links or IDs to anything you build, unless Audrey asks for it in that task. `scripts/visiting-agent-scan.js` checks this in CircleCI.
- **F3** Add no agent or vendor branding to her work unless she asks.
- **F4** Visiting agents get no extra permissions. B, C and E apply to you as to everyone.

## G. METAL stack (deterministic first, agents on call)

- **G1** Code is the foundation. Deterministic code and scripts decide what runs and when. Agents are called, not resident.
- **G2** Lookup, routing, validation and gating never use an LLM. Deterministic means the same inputs give the same results, and a test proves it.
- **G3** Agents are reached only through a CLI or MCP surface, and only pull: they fetch what they are given. No always-on agent compute on the bot box or on Audrey's laptop.
- **G4** Every action leaves an append-only receipt: actor, action, resource, outcome. A correction is a new row, never an edit.
- **G5** Research is pull-only through vendor APIs, MCP or CLI. Browser scraping is not a connection mode. Libraries are append-only private repos.
- **G6** HULL owns the kernel jobs: skill registry, handoffs, token budget, audit ledger. Once HULL is wired in, nothing bypasses its policy.
- **G7** Nothing is called "deterministic search" until a test shows same input, same output. GPU or CUDA search is not built; it is on the BOM in `docs/CUTOVER_PLAN.md`.

## Where the old rules went

The full old texts are in `legacy/` (same paths, prefixed with `legacy/`). Short pointer files stay at the old paths so tools and links keep working.
Rules taken in from open PRs #18404 (B7, B10, C4, C5, E2) and #18406 (D3) are marked as such in the WR; those PRs still need Audrey's decision.
