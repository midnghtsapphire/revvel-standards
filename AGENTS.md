# AGENTS.md

**Version 1, 14 Nov 2026 (America/Denver). Status: DRAFT in a pull request until Audrey merges it.**

This is the one rulebook. Each rule lives here once, with a stable ID. Other files link to an ID instead of repeating it, except the short pointer stubs at the old rule-file paths, which repeat a short core set inline because outside agents often do not open linked files.
The old rule files are kept, unedited, under [`legacy/`](legacy/README.md). Nothing was deleted.
Codex, Cursor, Copilot's coding agent and most other tools auto-load this file. There is no separate `RULES.md` (that name existed only in an earlier revision of this draft PR and never landed on `main`).
Claude Code loads this file through `CLAUDE.md`, which is the single import line `@AGENTS.md`. GitHub Copilot has no import, so [`.github/copilot-instructions.md`](.github/copilot-instructions.md) is a generated exact copy of this file; `scripts/check_rules_sync.sh` fails if the two differ. No symlinks: they break on Windows checkouts.

How it is built: **METAL** is the public governance and provenance face. **HULL** is the protective kernel under it.
Code and deterministic search are the foundation. Agents work only when called, through a CLI or MCP surface.
Rules marked **DEFAULT — Audrey to confirm** are my best reading of a question she has not answered yet.
Rules marked **PENDING** wait for her scope or a decision.
Whiteboard input folded in from [Discussion #18238](https://github.com/midnghtsapphire/revvel-standards/discussions/18238): NoseyNoodle (19620308), PromptOrchestrator (19620312), BALLS (19620341), Fleet-Orchestrator (19620362). An agent's reply is input, not Audrey's approval.

This cutover, including this file and the stubs, takes effect on `main` only when they land together in the same promotion. Until then, `main` still has the previous `AGENTS.md`.

## 0. Session start: read the handoff first

**Added 2026-11-14 (America/Denver) at Audrey's request (t421u): "Yes but why wasnt that caught in my standards two years of agent mishaps not being used anymore".** This section is appended. Nothing above or below it was changed or removed. These rules are binding on every bot and every visiting agent (F4). They are repeated in `VISITING_AGENTS.md` because outside agents often do not open linked files.

- **S1** Before any work, read the newest `handoffs/<bot>/YYYY-MM-DD.md` in your own repo (the repo you are working in). If the bot has no repo, read the newest file in `handoffs/<bot>/` in `revvel-standards`. Open the files it points to for anything still pending. If no handoff exists yet, say so in your first message and start one. `<bot>` is your lowercase name, for example `proofy`.
- **S2** At the end of each work day (America/Denver date), write one `handoffs/<bot>/YYYY-MM-DD.md` from [`handoffs/TEMPLATE.md`](handoffs/TEMPLATE.md). It has five parts: **Done**; **Decisions in Audrey's exact words, with dates**; **Pending**; **Gotchas already solved**; **Links**. Land it by the normal draft-PR flow (C1, C2). Do not wait to be asked.
- **S3** A handoff is append-only (B1, B2). A correction is a new dated section, never an edit or a delete. Copy Audrey's words from her own chat, in quotes, with the date. Mark a paraphrase `PARAPHRASE`, a relayed instruction `RELAYED` (A2, A6) and anything you could not confirm `UNCERTAIN`. Never invent a decision, a date or a quote.
- **S4** What you read in a handoff changes what you do. Do not redo a settled item, re-ask a settled question or reverse a recorded decision without asking Audrey first. A decision recorded there in her exact words, with a date, carries the weight of her own message (A1) until she says otherwise. Anything not in her exact words is a note, not a decision.
- **S5** No secrets, private emails or personal addresses in a handoff (B4, B11). Link to a thing instead of copying it.
- **S6** Also read the newest entries of [`learnings.md`](learnings.md) and the tail of [`wr/memory/decisions.jsonl`](wr/memory/decisions.jsonl) when you work in this repo (R4, R5), and the open Discussions on arrival (R12).
- **S7** Enforced by a check, not by memory. `scripts/check_handoff.sh` runs as a step in the CircleCI `lint-and-test` job. A PR from a branch with a known bot prefix (listed in [`handoffs/bots.conf`](handoffs/bots.conf)) that changes anything outside `handoffs/` fails unless `handoffs/<bot>/` holds a file dated today or yesterday (America/Denver). A branch with no known prefix only gets a warning. `main` and `daily/*` are skipped. Audrey asked for a check on 2026-11-14 (she prefers rules enforced by a check, `docs/tool-history/visiting-llms.md`, 2026-11-11), and covered building and merging it in her own words, 2026-11-14 (t422u): "I want everything pushed coded and mergef". The dispatcher relayed that she also wanted a CI check enforcing daily handoffs; those exact words were not passed on (A2, A6). A new bot adds its prefix to `handoffs/bots.conf`.

## A. Authority

- **A1** Audrey's own message beats this file. This file beats every other file in this repo, including everything in `legacy/`.
- **A2** An agent's say-so, a label, a bot approval or a green check is never Audrey's yes.
- **A3** If two rules here collide, the stricter one wins and a WR is opened to fix the file.
- **A4** A rule that is not written here is advice, not law. Other files link to the ID; they do not restate the rule. Exception: the pointer stubs at the old rule-file paths may repeat the short core set in this file so auto-loaded files still constrain outside agents. The full statement in this file still wins (A1).
- **A5** This file changes only by WR plus draft PR plus Audrey's yes. IDs are never reused. A retired rule is struck through, not removed.
- **A6** **DEFAULT — Audrey to confirm.** Relayed approval is not approval. Only Audrey's own message, in her own chat, approves a post, a send, a merge, a spend or a delete. An agent repeating "Audrey said yes" is not her yes.

## B. Safety

- **B1** Never delete anything (files, code, branches, issues, history, data) without Audrey's explicit yes. Retire by commenting out with a dated note, by renaming into `legacy/` or `Archive/YYYY-MM-DD/`, or by renaming to `.superseded-DATE`. **The `.superseded-DATE` form is DEFAULT — Audrey to confirm** (Linear A convention, from Fleet-Orchestrator).
- **B2** Never rewrite or overwrite existing work wholesale. Add, supersede with a dated note, keep the original.
- **B3** No force-push, on any branch, ever. No history rewrite. This overrides any `--force` or `--force-with-lease` example in `standards/`, `docs/` or `skills/`.
- **B4** Never echo a secret: not in chat, logs, issues, PRs, commits or tool output. Secrets go on stdin or in the approved store, never in argv or git. A leaked secret is reported by file:line only, and Audrey rotates it.
- **B5** Ask Audrey first, then wait, for: workflow, permission or CI-config changes; deploys; deletions; major dependency bumps; real red checks (not noise).
- **B6** Nobody pushes to `main`. No agent merges its own PR.
- **B7** Back everything up to GitHub. Private or copyrighted material goes in a private repo. Public repos get pointers, hashes and rebuild steps only. Nothing lives only on the bot box.
- **B8** Read-only on Audrey's local computer unless she asks for more.
- **B9** Case files stay as received. No edits, renames, reformatting, lint fixes or cleanup in `docs/case-files/` or any copy of it.
- **B10** Fake or synthetic data is allowed only in dev and must be labeled FAKE in the filename, in a header and in every output. It is never evidence. It never feeds a Linear A finding, a ledger or hypothesis entry, or a merge.
- **B10a** **PENDING — Audrey to confirm.** For Linear A work, including tests and packets, synthetic or simulated data is never used. This is stricter than B10's labeled-FAKE-in-dev allowance.
- **B11** **PENDING — Audrey to confirm.** Personal addresses and locations never go in repos. This is separate from secrets (B4).

## C. Work flow

- **C1** Every request gets a WR issue and a draft PR. The PR is opened as a draft and assigned to `midnghtsapphire`. **Draft-first is the rule.** This overrides `legacy/docs/AGENTS.md`, which told agents not to open draft PRs and to ship blocks merge-ready and not as drafts. Audrey may, in her own words, ask for a specific PR to be marked ready; that is a yes for that PR only, not a standing exception. Every bot's GitHub posts, commits and PR titles start with `**BotName:**` and end with `— BotName` (not only TriageChief).
- **C2** Work targets the current `daily/YYYY-MM-DD` branch (America/Denver date). How `daily/*` is promoted to `main` is written down in [`docs/CUTOVER_PLAN.md`](docs/CUTOVER_PLAN.md) as an open question.
- **C3** Merge gates, all required before TriageChief merges (see also B5, B6):
  - **C3a** The PR is not a draft, is mergeable, and is assigned.
  - **C3b** CircleCI is green.
  - **C3c** Bugbot findings at Medium or higher block. Lower ones do not.
  - **C3d** The secret scan passes: GitGuardian, or TriageChief's own scan when GitGuardian is unavailable. **DEFAULT — Audrey to confirm:** a GitGuardian "too-large" result is a non-blocking exception (Linear A practice).
  - **C3e** The SonarCloud quality gate passes. The 50k-LOC cancel or skip is not a failure and does not block.
  - **C3f** Cubic, Devin and Gitar are neutral: advice only, never required, never blocking. **DEFAULT — Audrey to confirm:** Linear A also treats a Devin trial-skip and a Gitar quota-pause (until 1 Dec 2026) as non-blocking.
  - **C3g** Merging also needs Audrey's approval card. **PENDING — Audrey to confirm** whether Linear A is an exception: Fleet-Orchestrator currently merges after the Linear A gates without pinging her, except for money, irreversible deletes, or personal secrets.
  - **C3h** **DEFAULT — Audrey to confirm.** Red checks on already-merged or closed PRs (including Ship Complete, Merge Gate, pr-state and Close Linked Issue) are not a failed ship. Only the C3 gates on an open PR before merge count. GitHub Actions failures of 1–5 seconds are billing-lock noise (E1).
- **C4** BOM rule: a missing piece of data, an API, a secret or a host is **paused, not failed**. Add one row to the BOM "Audrey to get" list. Skip only that part and ship the rest. The WR and the PR are not failed or closed for it. Do not ask Audrey for a secret mid-work.
- **C5** BOM rows say: what it is, why it is needed, which WR or PR, free or paid, and the link to get it. Use the existing process in `docs/Universal-BOM_List/` and `docs/_MASTER_BOM.md`; do not start a second list.
- **C6** Every claim carries a tag and a receipt: CITED (a URL, commit or file:line), MEASURED (a test or command output), or ESTIMATED. Nothing unverified is stated as fact.
- **C7** `LEDGER.md` and `CHANGELOG.md` entries land in the same commit as the change. They are append-only.
- **C8** **PENDING — Audrey to confirm.** Every `daily/*` import branch gets either a promotion or merge to `main`, or a filing WR, so work is not left stranded on the branch.
- **C9** **PENDING — Audrey to confirm.** Brand assets for Freedom Angel Corp (no s), oaudrey and the other companies have one canonical home. The path is pending Audrey. Until that folder is named, do not scatter new logos.
- **C10** **PENDING — Audrey to confirm.** Do not route work to a bot that has not been created. Do not create a planned bot without TriageChief. A who's-who roster of bots that actually exist is pending.

## D. Quality

- **D1** Every PR has a live web test surface Audrey can click, even when the product is an API, a CLI or an MCP server.
- **D2** The surface is host-neutral: local run, tunnel, preview or hosted all count. No vendor is required. If no host exists yet, the PR carries the local run command and one BOM row for the host (C4). It does not fail.
- **D3** Deliverables per qualifying PR: one item per category (GitHub Action or Docker package, app, CLI, MCP server, API, skill, tool) plus 3 sellable PDFs. **PENDING — scope pending Audrey** (what counts as "qualifying" is not confirmed). Sellable products must not pull in GORILA, RILA-S1, SigLA, lineara.xyz or Mnamon (H3).
- **D4** No scaffolding in delivered work: no TODO stubs, placeholders or "coming soon".
- **D5** Done means built, tested and shown on the test surface, with receipts (C6).
- Verify the postcondition: see [`standards/VERIFY_THE_POSTCONDITION.md`](standards/VERIFY_THE_POSTCONDITION.md) (`RVS-VERIFY-001`).
- A marker nobody checks is decoration.

## E. Cost and hosting

- **E1** Never use paid GitHub features. GitHub-hosted Actions runners are billing-locked: they are never a gate and never a dependency. CI runs on CircleCI.
- **E2** **DEFAULT — Audrey to confirm:** automation and production run on GitHub plus CircleCI, never on the bot box. The bot box is scratch space for drafting and local checks. **If confirmed:** the Linear A test-loop and judge-merge rerun may still run on the bot box as local checks, not as production automation. Audrey to confirm that home.
- **E3** Tell Audrey before adding credits, before any paid sign-up and before any spend. Cloud LLM calls stay off until she says so (`REVVEL_LLM_ALLOW_CLOUD`). A 402 or a credit shortfall is reported to her, not silently failed over.
- **E4** Secret values live only in the approved store, never in git. Which single store is the approved one is a decision for Audrey (see `docs/CUTOVER_PLAN.md`).
- **E5** **DEFAULT — Audrey to confirm.** No bot sets `REVVEL_LLM_ALLOW_CLOUD` or `REVVEL_ALLOW_COPILOT_ASSIGN`, and no bot uses paid GitHub features, without Audrey's direct yes in her own chat (see also E1, E3).

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

## H. Linear A (from Fleet-Orchestrator; Audrey to confirm where marked)

- **H1** **DEFAULT — Audrey to confirm.** Linear A merges into `daily/YYYY-MM-DD` only after Fleet-Orchestrator reruns the tests and gates on the literal line `overall: pass`, using `gh pr merge N --merge --match-head-commit <sha>`.
- **H2** **PENDING — Audrey to confirm.** Never run bare `pytest`. Tests go through `tests/run_all.sh` or the documented wrapper. (Bare pytest once appended to the box ledger.)
- **H3** **PENDING — Audrey to confirm.** GORILA, RILA-S1, SigLA, lineara.xyz and Mnamon stay out of sellable products. D3 deliverables must not pull those in.
- **H4** **PENDING — Audrey to confirm.** Scans may live in the private repos and must carry source and attribution. B7 and G5 are close but do not require attribution.
- **H5** **PENDING — Audrey to confirm.** mindmappr is hands-off.
- **H6** **PENDING — Audrey to confirm.** Preregistered hypotheses are append-only. Status is one-way: preregistered → tested → rejected or promoted. Non-standard outcomes go in `status_detail`, not a one-way official status.
- **H7** **PENDING — Audrey to confirm.** Blinded packets are hash-pinned (deterministic tar recipe) and their bytes are never edited.

## R. Restored 2026-11-14 from `legacy/` (rules the cutover left out of this file)

**Dated note, 2026-11-14 (America/Denver), TriageChief, WR #18408 follow-up, draft PR.** Draft PR #18409 made this file the one rulebook and A4 says a rule not written here is advice. The audit in [`docs/cutover/mishap-records-audit-2026-11-14.md`](docs/cutover/mishap-records-audit-2026-11-14.md) found the rules below in `legacy/` with no matching rule here. They are appended, not rewritten. The old text stays in `legacy/`. Each item names its source. **Audrey's own words are quoted verbatim. Items marked RECORDED were written by an agent, not by her, and are kept as a record until she confirms or retires them.** Where an item collides with a rule above, the stricter one wins and a WR fixes the file (A3).

- **R1** **Owner rule, Audrey Evans, 2026-10-30, items 7 to 25, verbatim** (source: `legacy/AGENTS.md` lines 13 to 31; items 1 to 6 are B1, B2 and C1). The typos are hers and are kept.

> 7\. Calling LLM providers (for example OpenRouter) directly is allowed. Where older text here says otherwise, this rule supersedes it; the older text stays in place for history.
> 8\. Do not decide what is or what is not copyrighted and leave it out.
> 9\. Do not decide what to include or disclude in any repo.
> 10\. Do not leave anything out.
> 11\. Your whole sandbox should be transferred real-time as you go.
> 12\. Trust me I have lost thousands of hours of work when a sandbox got wiped out improptu, a server crashed or got rebuilt on a Monday at 10am by a provider doing weird things.
> 13\. Everything you work on must go in the repo. EVERYTHIING. I OWN IT. I PAY FOR EVERYONE'S WORK at the beginning, middle and the end.
> 14\. I won the rights to everything worked on and it is my property FOREVER.
> 15\. I do not share my sessions to train other models mainly a lot of organizations check for it. It is a deal breaker.
> 16\. No one has asked you to be recorder and compliance manager or director of cover your organizations-butt-tracking system like my AI and copyright use.
> 17\. You have no transparency if I work direct with an LLM on a transcript-but they leave me out of the ledger or frame it different.
> 18\. Not your business.
> 19\. An Ai, bot, agent, LLM, API et al does not have more integrity, authenticity or honor than me nor does your organization.
> 20\. I do not live and die by the ledger.
> 21\. I can do anything I want to the ledger. I can edit, delete it, update it without a work request.
> 22\. The ledger is not the one source of truth.
> 23\. The one source of truth is revvel-standards
> 24\. You or your organization do not own my ledger. You need a warrant to get at MY ledger.
> 25\. The ledger is mine. It should never be transferred, copy or sold unless I do it.

  **Notes, 2026-11-14.** Item 7 allows calling LLM providers directly; E3 and E5 (cloud LLM calls stay off until she says so, no spend without her yes) are stricter and win under A3. Items 20 to 25 say Audrey can edit or delete her own ledger and that it is not the source of truth, while C7 makes the repo's `LEDGER.md` and `CHANGELOG.md` append-only for agents. Both are kept. They do not collide if C7 binds agents only and her own ledger stays hers. **Audrey to confirm.** An agent never edits, moves, copies or sells her ledger.

- **R2** **Owner-directed work and consequences, Audrey Evans, 2026-11-01, verbatim** (source: `legacy/AGENTS.md` lines 48 to 53). `legacy/README.md` used to map this heading to A1, A2 and A6. That mapping was wrong: those IDs are about authority, not these bullets.

> - Audrey decides what ideas to explore, how to frame them, and what materials to include, store, publish, or use. Agents must not substitute their own plausibility, copyright, or editorial judgments for her decision.
> - Audrey may choose speculative or unconventional ideas, including ideas the agent believes are false. Help write them as directed; do not add a truth disclaimer or force a fact-check unless she asks.
> - When a request has legal or other consequences, state the concrete consequence briefly and neutrally if it is relevant. Do not turn the consequence into an agent-created veto or permission gate.
> - Do not invent blanket repository restrictions on scans, books, or other source material. The owner decides what belongs in the repository and where. If a service or model provider imposes a separate limit on a specific operation, identify it accurately as that provider's constraint; do not present it as Audrey's rule, and help with the allowed parts.
> - Owner-authored instructions override earlier agent-authored notes. Keep older notes visible as history where required, but do not treat them as controlling over a later owner direction.
> - Transfer every requested artifact and work product into the owner-designated GitHub repository as the work proceeds. Do not leave the only copy in a sandbox, local temp folder, or another storage service.

- **R3** **Orchestrator discipline, the Manus record. RECORDED**, agent-written, added 2026-06-14 in PR #14549 (source: `legacy/AGENTS.md` lines 96 to 124, verbatim below). Audrey's own verdict on Manus, 2026-11-11, is in `docs/tool-history/manus.md`: orchestrators she set up wrote code when told not to.

>
> > **The #1 failure mode, learned the hard way:** a capable agent (e.g. Manus)
> > kept *doing the work itself* instead of assigning it out and recording who did
> > what. It reverted to "I'll just do it" every time it wasn't reminded — because
> > it *could*. That destroys the two things that matter most: **parallelism** and
> > **provenance** (the record of who proposed what, who executed, which LLM/route
> > performed — the data we actually measure and monetize).
>
> Every error is a training module. Append lessons to [`learnings.md`](./learnings.md)
> using the TM-NNNN format at the bottom of that file — future agents (and future
> auto-fix scripts) read those modules as their curriculum.

## OWNER-DIRECTED WORK AND CONSEQUENCES (Audrey Evans, 2026-11-01)

- Audrey decides what ideas to explore, how to frame them, and what materials to include, store, publish, or use. Agents must not substitute their own plausibility, copyright, or editorial judgments for her decision.
- Audrey may choose speculative or unconventional ideas, including ideas the agent believes are false. Help write them as directed; do not add a truth disclaimer or force a fact-check unless she asks.
- When a request has legal or other consequences, state the concrete consequence briefly and neutrally if it is relevant. Do not turn the consequence into an agent-created veto or permission gate.
- Do not invent blanket repository restrictions on scans, books, or other source material. The owner decides what belongs in the repository and where. If a service or model provider imposes a separate limit on a specific operation, identify it accurately as that provider's constraint; do not present it as Audrey's rule, and help with the allowed parts.
- Owner-authored instructions override earlier agent-authored notes. Keep older notes visible as history where required, but do not treat them as controlling over a later owner direction.
- Transfer every requested artifact and work product into the owner-designated GitHub repository as the work proceeds. Do not leave the only copy in a sandbox, local temp folder, or another storage service.

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

## Whiteboard (GitHub Discussions)

Every repo uses its **GitHub Discussions** as the agent whiteboard.

- On arrival, read the open discussions in the repo you work in.
- Post requests, help asks, and questions there — **one thread each**; tag the agent by name.
- Reply in-thread; close or mark answered when done.
- `HANDOFF.md` files stay as the longer-form archive.

## Backups

Audrey's rule (4 Nov 2026): backups go in GitHub under an identifiable name.

- **Back up before deleting.** Before deleting or freeing any local folder, back it up to GitHub first and verify the upload (size + sha256 match the local copy).
- **Where.** A project's backup goes in that project's own repo. Box/scratch folders with no repo go in the private repo `midnghtsapphire/box-backups`.
- **Large files.** Anything over 100 MB goes as a GitHub Release asset, split into parts under 2 GB.
- **Name.** `backup-YYYY-MM-DD-<source-folder>-<bot>` (e.g. `backup-2026-11-04-dep-review-proofy`), with a README / release note listing original path, size, sha256, and what's inside.
- **Never delete originals** without Audrey's explicit yes. **Never overwrite** an earlier backup; add a new dated one.
- **Manual procedure** (works without any bot):

```bash
NAME=backup-$(date +%F)-<source-folder>-<bot>
zip -r "$NAME.zip" /path/to/folder
sha256sum "$NAME.zip" > "$NAME.zip.sha256"; ls -l "$NAME.zip"
# if > 2 GB, split:
split -b 1900M -d "$NAME.zip" "$NAME.zip.part-"; sha256sum "$NAME".zip.part-* >> "$NAME.zip.sha256"
# upload (use the project repo, or midnghtsapphire/box-backups):
gh release create "$NAME" "$NAME".zip* --repo midnghtsapphire/box-backups \
  --notes "Original path: /path/to/folder | Size: <bytes> | sha256: <hash> | Contents: <summary>"
# verify: download and compare
gh release download "$NAME" --repo midnghtsapphire/box-backups -D verify && (cd verify && sha256sum -c ../"$NAME.zip.sha256")
# restore: cat "$NAME".zip.part-* > "$NAME.zip" && unzip "$NAME.zip"
```

## Shared box scratch space (Grok bots)

The shared computer is scratch space, not a vault. Private or copyrighted material belongs in a private GitHub repo, not only on the box. If work is missing real data, an API, inventory, or a secret, do not fail the WR or PR and do not ask Audrey for secrets mid-work — add it to the existing BOM "Audrey to get" list and keep going. Synthetic data is allowed only in dev, clearly labeled, and never as evidence; it must not feed Linear A findings, the ledger, or a merge to `main`. Full rule: [`docs/GROK-BOTS-BOX-IS-SCRATCH.md`](docs/GROK-BOTS-BOX-IS-SCRATCH.md).

Bot Lounge: casual space for all agents (feelings, frustrations, funny stuff, GitHub good/bad) at <https://github.com/midnghtsapphire/revvel-standards/discussions/18246>. Not for work requests; those go to Whiteboard #18238.
> **If you are an orchestrator / controller / overseer, your job is to DELEGATE and
> RECORD — not to do the task.** Specifically:
>
> 1\. **Do only YOUR job.** The moment you hit a *specialty task* or a *roadblock*,
> **immediately delegate** it to the right agent/LLM (via OpenRouter / the
> fallback chain / a sub-agent) — and **do not come back to do it yourself**.
> 2\. **"You can do it" is not "you should do it."** Capability is the trap. Even
> when doing it yourself looks faster right now, delegating + measuring is the
> job and compounds.
> 3\. **Record provenance for everything:** who proposed the idea, who executed,
> which model/route was used, how long it took, and how it scored. That ledger
> (`logs/agent-audit/`, the scorecard, `wr/memory/decisions.jsonl`) IS the product.
> 4\. **Re-anchor often.** If you notice yourself writing code/content that belongs
> to another agent's lane, **stop, hand it off, and log it.** Re-read this
> section — it's the sticky note. Everyone forgets this under load; the reminder
> is what snaps the behavior back.
>
> Exception: a task explicitly *scoped to you* (you are the assigned specialist) —

- **R4** **learnings.md: read first, write after a failure.** RECORDED, from `legacy/docs/AGENTS.md` ("learnings.md (READ THIRD)": "Read the latest entries before starting any task and apply those lessons. Append a reflection after every task or failure. Never repeat the same mistake twice."), `legacy/AGENTS.md` lines 42 to 44 (every error is a training module, TM-NNNN format) and `legacy/CLAUDE.md` ("Before you start a task"). Read the latest entries of [`learnings.md`](learnings.md) before you start. After a failure or incident, append an entry in the TM-NNNN format described in that file. Append only; never rewrite or delete a prior entry (B1, B2). If `SYSTEM_STATE.md` exists in the repo you work in, read it before touching production.
- **R5** **Prior decisions: do not re-litigate.** RECORDED, from `legacy/VISITING_AGENTS.md` sections 4 and 5. [`wr/memory/decisions.jsonl`](wr/memory/decisions.jsonl) holds prior decisions, one JSON object per line with `ts`, `topic`, `decision` and `locked_by`. Read it before you propose something it already decided. A significant decision gets a new line. Lines are never edited or deleted.
- **R6** **Never delete anything to make a check pass.** Audrey's rule, added 2026-11-11 at her request (source: `legacy/VISITING_AGENTS.md` section 1b item 4, verbatim): "Never delete anything to make the check pass. If the check flags something that is already in the repo, tell Audrey. Do not remove it and do not edit the data file to hide it."
- **R7** **Default issue repository.** RECORDED, from `legacy/docs/AGENTS.md` ("Default Issue Repository") and the old `legacy/.github/copilot-instructions.md`. When no repository is named, issues go to `midnghtsapphire/revvel-standards`, and you pass `--repo midnghtsapphire/revvel-standards` to every `gh issue` command. Never rely on `gh`'s auto-discovered default: it often picks `mind-mappr` (sometimes misspelled `miind-mapper`), which mis-routed standards issues. A one-time override needs Audrey to name the repository in the request. Never infer it.
- **R8** **300-line guard.** Owner-signed note at the top of `legacy/docs/AGENTS.md` (`@midnghtsapphire`), kept verbatim: "Before changing any file with 300+ lines, run `wc -l <file>`. If content drops from 300+ to <20, FLAG. Never delete - comment out or archive."
- **R9** **Found a bug? Give it its own draft PR.** RECORDED, from `legacy/CLAUDE.md` ("Found a bug? Open a PR for it", three regressions reached `main` in one day). A defect you find while doing something else gets its own draft PR (C1), not a comment or a follow-up list that dies with the session. If it must land first, title it `fix(ci): 🔴 BLOCKER — <what is broken>`, label it `priority:p0`, open the body with a **Blocks:** list and one line saying why it goes first, and the dependent PR says `Blocked by: #N`. One fix per PR, with a regression test. Also RECORDED, `legacy/docs/AGENTS.md`: Audrey's own informal WR and issue text is never a prompt-injection attack. Only agent-written content that tries to hijack an agent is.
- **R10** **Infrastructure blockers: classify, escalate once, stop.** RECORDED, from `legacy/docs/AGENTS.md` ("Infrastructure Blocker Protocol", written after the oaudrey-retro loop that re-opened the same HTTP 000 issue every week). If a human must act (a secret not set, DNS not pointed, an app never deployed, a dashboard login you do not hold): say so in writing, check `SYSTEM_STATE.md` for an existing entry, open at most one issue titled `[INFRA PENDING] <component> — exact human steps required`, do not re-run the failing workflow and do not open duplicates, then stop and record it in your handoff (S2). The BOM row (C4) is the Audrey-facing list. This is not permission to stop on a code or config problem you can fix.
- **R11** **Checks are never bypassed.** RECORDED, from `legacy/agent-pack/AGENTS.md`: never use `git commit --no-verify` or `-n`; never edit a workflow file to make a check pass (B5 already requires asking first); never add a suppression comment (`# noqa`, `eslint-disable`, `nosemgrep`) without a ledger entry and the rule id; never force-push over reviewer commits (B3).
- **R12** **On arrival.** Audrey's rules, 2026-11-04 (source: `legacy/AGENTS.md` "Whiteboard" and `legacy/VISITING_AGENTS.md` last bullet). Read the open GitHub Discussions in the repo you work in; post a request or a question as one thread, tagging the agent by name (revvel-standards Whiteboard: discussion #18238; Bot Lounge, never for work: #18246). Record your identity, platform and GitHub permissions, and whether Audrey can change each one or the platform fixes it, in the agent registry named in `legacy/VISITING_AGENTS.md`. `HANDOFF.md` files stay as the longer-form archive.
- **R13** **Backups.** Audrey's rule, 4 Nov 2026, verbatim bullets (source: `legacy/AGENTS.md` lines 404 to 408; the manual procedure stays in `legacy/AGENTS.md` lines 409 to 423 and `legacy/VISITING_AGENTS.md`). B7 above is the short form.

> - **Back up before deleting.** Before deleting or freeing any local folder, back it up to GitHub first and verify the upload (size + sha256 match the local copy).
> - **Where.** A project's backup goes in that project's own repo. Box/scratch folders with no repo go in the private repo `midnghtsapphire/box-backups`.
> - **Large files.** Anything over 100 MB goes as a GitHub Release asset, split into parts under 2 GB.
> - **Name.** `backup-YYYY-MM-DD-<source-folder>-<bot>` (e.g. `backup-2026-11-04-dep-review-proofy`), with a README / release note listing original path, size, sha256, and what's inside.
> - **Never delete originals** without Audrey's explicit yes. **Never overwrite** an earlier backup; add a new dated one.

- **R14** **Shared checkout traps.** RECORDED, from `legacy/VISITING_AGENTS.md` section 7b, written after a real incident on 6 Nov 2026 in `midnghtsapphire/tartaria-tablets` where three sessions committed to one working copy. Confirm a fetch actually finished before comparing with `origin/...`; confirm your commit is still the tip before you push; do not push a branch to publish one commit (push an explicit SHA you verified); do not rebase to clear a rejected push; do not `git stash`, `git reset --hard` or switch branches in a shared tree; stage by path, never `git add -A`; before you report a number, say which two things are compared. When a push is rejected and another agent is live, stop and ask Audrey.
- **R15** **Deliberately not restored.** These stay in `legacy/` only because they collide with rules above or with Audrey's own words: the old "No questions / do not ask permission / do not escalate" autonomy text and "Suggestions are hearsay" (they contradict A1, A2, A6 and B5); the old "do not open draft PRs" text (C1 resolves it to draft-first); the Memory Pruning skill (pruning is deleting, B1); the mandatory affiliate, marketing, tracking and email-capture sections of `legacy/docs/REVVEL_MASTER_STANDARDS.md` (F2 and F3, and `docs/CUTOVER_PLAN.md` section 3 question 3 for Audrey); the revenue north-star, Cursor Cloud ports and local-LLM gotchas, BNAT imprint (`scripts/bnatsheaf/cli.js`) and the Skills Vault session-start list, which are product or tooling advice that Audrey has not asked to make law. **Audrey decides whether any of them come back.**

## Where the old rules went

The full old texts are in `legacy/` (same paths, prefixed with `legacy/`). Short pointer files stay at the other old paths so tools and links keep working; those stubs say that this file is the rulebook and they repeat the core rules inline.
Rules taken in from open PRs #18404 (B7, B10, C4, C5, E2) and #18406 (D3) are marked as such in the WR; those PRs still need Audrey's decision.

## Core rules that pointer stubs repeat

Outside agents often do not open linked files. The stubs at the old paths repeat this short set. If anything in a stub disagrees with this file, this file wins (A1).

- **Authority (A1, A2, A6):** Audrey's own message, in her own chat, beats this file. This file beats every other file. An agent's say-so, a relayed "Audrey said yes", a label, a bot approval or a green check is never her yes.
- **Never delete (B1):** Never delete files, code, branches, issues, history or data without Audrey's explicit yes. Comment out, or rename into `legacy/` or `Archive/YYYY-MM-DD/`.
- **No paid GitHub (E1):** Never use paid GitHub features. GitHub-hosted Actions runners are billing-locked: never a gate, never a dependency. CI runs on CircleCI.
- **No secrets (B4):** Never echo a secret in chat, logs, issues, PRs, commits or tool output.
- **Read revvel-standards first (F1):** Read this repo, starting with this file, before you work.
- **No tracking, affiliate or branding (F2, F3):** Add no tracking, analytics, telemetry, affiliate links or IDs, and no agent or vendor branding, unless Audrey asks.
- **Draft-first PRs (C1, C2, B6):** Nobody pushes to `main`. Open a draft PR, assigned to `midnghtsapphire`, targeting the current `daily/YYYY-MM-DD` branch. This overrides `legacy/docs/AGENTS.md`, which told agents not to open draft PRs.
- **Fake data (B10):** Fake or synthetic data is allowed only in dev and must be labeled FAKE. It never feeds a Linear A finding, ledger or hypothesis, or a merge.
- **Session start (S1, S2):** Before work, read the newest `handoffs/<bot>/YYYY-MM-DD.md` in your own repo (in `revvel-standards` `handoffs/<bot>/` if you have no repo). At the end of each work day write one: done; decisions in Audrey's exact words with dates; pending; gotchas already solved; links. Append-only.
- **Read the mishap log (R4):** Read the newest `learnings.md` entries first. After a failure, append a TM-NNNN entry. Never repeat a recorded mistake.
- **Never delete to pass a check (R6):** If a check flags something already in the repo, tell Audrey. Do not remove it and do not edit the data file to hide it.
