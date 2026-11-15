# Audit: where two years of agent mishaps are recorded, and why bots do not use them

**2026-11-14 (America/Denver), TriageChief. Draft for Audrey.** Written because she asked, in her own words (t421u): "why wasnt that caught in my standards two years of agent mishaps not being used anymore". The audit was read-only. Checked: `main` (`e6b5a9965` is the merge base), `daily/2026-11-14` at `a6e8b5d7b` (the merge of PR #18409), and git history. This file is appended; nothing was changed to write it. The rules it found missing are restored in `AGENTS.md` section R, with sources.

## 1. Short answer

The mishap rules were written down, but they were scattered across more than five files that disagreed with each other, nothing checked that an agent read them, and on 14 Nov the cutover (PR #18409) made every rule outside `AGENTS.md` "advice, not law" (A4) without carrying most of them across. The one rule that said "read the log first, never repeat a mistake" was never enforced, and the memory-injection step that was designed to enforce it was never built. Visiting agents then never saw most of it, because their stubs repeat only eight core rules.

## 2. Root cause, in plain words

1. **No single rulebook.** Until 14 Nov, the rules lived in `AGENTS.md`, `docs/AGENTS.md`, `CLAUDE.md`, `VISITING_AGENTS.md`, `MASTER.md`, `docs/REVVEL_MASTER_STANDARDS.md`, `agent-pack/AGENTS.md`, `.github/copilot-instructions.md` and others, about 3,600 lines in all. A bot read one and missed the rest.
2. **The old files contradicted each other and Audrey.** `legacy/docs/AGENTS.md` said "No questions", "do not escalate", "suggestions are unresearched hearsay" (including hers), "do not open draft PRs" and "ship merge-ready", while root `AGENTS.md` said never delete, draft PRs only, owner decides. `legacy/docs/REVVEL_MASTER_STANDARDS.md` made affiliate links, marketing and email capture mandatory in every app while `VISITING_AGENTS.md` section 1b banned them. A bot that loaded the wrong file did the opposite of what she wanted.
3. **The lessons were in places no bot is told to read.** `learnings.md` (1,210 lines, 12 TM entries) is only required reading in `legacy/docs/AGENTS.md` and `legacy/CLAUDE.md`. Nothing in the new `AGENTS.md`, `VISITING_AGENTS.md` or the stubs mentions it.
4. **Nothing enforced reading or writing them.** The only CI checks aimed at agent rules are `scripts/visiting-agent-scan.js` (no tracking or branding) and, since #18409, `scripts/check_rules_sync.sh`. There is no check for "read the handoff", "append to learnings.md" or "update the session file". `docs/tool-history/visiting-llms.md` records Audrey's own verdict of 2026-11-11: visiting LLMs forget her rules even with sticky-note reminders, and she prefers rules enforced by checks, not memory. Orchestrator Discipline is a sticky note by its own words ("Re-read this section").
5. **The memory step was designed and never built.** `HANDOFF.md` (the CUDA Grid rollout) lists Block 3, "Memory Retrieval + Boot ROM Injection": `agent-factory/hooks/on-start-inject-memory.sh` writing `MEMORY_CONTEXT.md` before every agent starts. Neither file exists. `REVVEL_MASTER_STANDARDS` section 5 says "`SPRINT_STATE.md` must be updated at the end of every session". That file does not exist either.
6. **The cutover then demoted what was left.** #18409 A4: "A rule that is not written here is advice, not law." Most mishap rules were not written there, so they became advice overnight. The stubs repeat only eight core rules, which is all a visiting agent sees. `legacy/README.md` also mapped "OWNER-DIRECTED WORK AND CONSEQUENCES" to A1, A2 and A6, which do not contain that text (corrected in this PR).
7. **Proofy's own repos do not link to the standards.** `amazon-books` has no `AGENTS.md` and no handoff file, and its `REVVEL-STANDARDS.md` is a stale fragment about eco badges. `hunger-gallows` has neither a README nor an `AGENTS.md`. A bot that starts in those repos never meets the rulebook.

A smaller cause, 17 Aug 2026: commit `511a13be9` (PR #17144, titled "refactor research-engine tests to use node:test") deleted 406 files and 52,568 lines, including `.sandbox/openhands/memory/persistent-facts.md` ("Facts that should survive session boundaries"), `prompts/internal/memory/SYSTEM_PROMPT.md`, `prompts/internal/learning/SYSTEM_PROMPT.md`, `memory_logs/xss_escaping.md` and OpenHands session logs. It is on `main` and `daily`. Everything is recoverable with `git show 511a13be9^:<path>`. It is **not** restored here; it needs its own draft PR and Audrey's say.

## 3. Where mishaps and lessons are recorded (a)

"Case files" is the wrong name for these. `docs/case-files/` is the Blue Ocean SAR evidence archive, byte-identical uploads about six research cases, and has nothing about agent mishaps (B9 protects it). There is no case-file set of agent mishaps. The records are:

| Record | Path (on `daily/2026-11-14` unless noted) | What it holds | Referenced or enforced at session start now? |
| --- | --- | --- | --- |
| Lessons log | `learnings.md` | 12 TM-NNNN training modules and about 1,200 lines of incident entries, append-only | **No.** Not named in `AGENTS.md`, `VISITING_AGENTS.md` or any stub. Restored as R4 and S6 |
| Orchestrator discipline (the Manus incident) | `legacy/AGENTS.md` lines 96 to 124 (added 14 Jun 2026, PR #14549); still live on `main` | "The #1 failure mode": a capable agent kept doing the work itself | **No.** Not in the new `AGENTS.md`. Restored as R3 |
| Tool history and Manus verdict | `docs/tool-history/` (README, `manus.md`, `visiting-llms.md`, 44 per-tool files, `TOOLS.csv`) | Why each tool was kept or dropped, Audrey's verdicts of 2026-11-11 | **No.** Not linked from `AGENTS.md` |
| Agent shipping failure analysis | `docs/neurooz/AGENT_SHIPPING_FAILURE_ANALYSIS.md` (6 Apr 2026) | 12 root causes, including "Context Window Amnesia" and the fix: mandatory `HANDOFF.md` every session | **No** |
| AGENTS.md retro | `docs/AGENTS_RETRO_REVIEW.md` (1 May 2026) | Why the oaudrey-retro issues were never closed | **No.** Related to R10 |
| Agent profiles | `docs/agents/*/PROFILE.md`, `docs/agents/manus/PROFILE.md` | Per-agent failure lists (over-engineering, hallucinated paths) | **No** |
| Decisions | `DECISIONS.md` (D001 to D016), `wr/memory/decisions.jsonl` | Locked decisions, "don't re-litigate" | Partly. `VISITING_AGENTS.md` section 4 pointed at the jsonl; the stub does not. Restored as R5 |
| Bug-finding memories | `MEMORIES.md` | One entry | No |
| Failure ledger plumbing | `agent-pack/failure-ledger.schema.json`, `config/error-ledger.json`, `logs/failure-ledger/` (empty), `agent-factory/hooks/on-failure-append-learning.sh` | Designed to append failures automatically | No. The ledger folder is empty |
| Recovery incident | `scripts/restore-learnings.sh`, `wr/memory/learnings-*.md` | A whole-file write replaced `learnings.md` on 14 Jul 2026 and had to be restored | No |
| Ledgers | `LEDGER.md`, `standards/LEDGER_STANDARD.md`, `WRITE_AS_YOU_GO_STANDARD.md`, `CHANGELOG.md` | Play-by-play and handoff record per project | C7 keeps the same-commit rule. The handoff duty is now S1 and S2 |
| Shared-checkout incident, 6 Nov 2026 | `legacy/VISITING_AGENTS.md` section 7b | Three sessions pushing to one tree in `tartaria-tablets` | **No.** Restored as R14 |
| Session-start and session-end list | `legacy/docs/AGENTS.md` "First Steps", "FIRST: Required Files", "Mandatory Skills" | Read `GOAP.md`, `GOAL.md`, `learnings.md`, `SYSTEM_STATE.md`; wrap-up skill; `HANDOFF.md` | **No.** Replaced by S1, S2, R4 |
| Root `HANDOFF.md` | `HANDOFF.md` | The CUDA Grid rollout, not a general handoff | Not a session file |
| Deleted memory files | commit `511a13be9` (above) | See section 2 | n/a |
| `main` still has the old text | `AGENTS.md` on `main` (425 lines, includes Orchestrator Discipline) | Same as `legacy/AGENTS.md` | `main` keeps it until the promotion (C2) |

`.cursorrules` is a symlink to `VISITING_AGENTS.md`, which the "no symlinks" rule says breaks on Windows. It was left alone and is reported for Audrey.

## 4. What #18409 did to the rule text (b)

**RULES.md against `AGENTS.md`.** RULES.md existed only in commit `613c46e35` of the PR branch and was removed in `38f81f65c`. Every rule in it (86 lines) is in `AGENTS.md` with the same ID and meaning. The dozen lines that differ are broadenings or added markers: A4 gained the stub exception, B1 gained the `.superseded-DATE` form (DEFAULT), C1 now covers every bot's posts and not only TriageChief's, C3d, C3f, C3g and E2 gained DEFAULT or PENDING notes, D3 gained a sentence about sellable products. **Nothing was dropped or weakened from RULES.md.**

**Old rule files against `AGENTS.md`.** The loss is here. Rules in `legacy/` with no matching rule in the cutover `AGENTS.md`, and where they are restored in this PR:

| Missing or weakened rule | Source | Restored as |
| --- | --- | --- |
| Owner rule 2026-10-30, items 7 to 25 (providers allowed; do not decide copyright or what goes in a repo; do not leave anything out; sandbox transferred in real time; "I OWN IT"; sessions are not shared to train models; no compliance-manager role; ledger is hers, not the source of truth) | `legacy/AGENTS.md` lines 13 to 31 | R1 (verbatim; conflicts with E3, E5 and C7 noted) |
| Owner-directed work and consequences, 2026-11-01 (Audrey decides what to explore and publish; no truth disclaimers; no invented repo restrictions) | `legacy/AGENTS.md` lines 48 to 53; wrongly mapped to A1, A2, A6 | R2 (verbatim) |
| Orchestrator discipline (the Manus record) | `legacy/AGENTS.md` lines 96 to 124 | R3 |
| Read `learnings.md` first, append after failure, "Never repeat the same mistake twice" | `legacy/docs/AGENTS.md`, `legacy/AGENTS.md` lines 42 to 44, `legacy/CLAUDE.md` | R4, S6 |
| Prior decisions in `wr/memory/decisions.jsonl` | `legacy/VISITING_AGENTS.md` sections 4 and 5 | R5 |
| "Never delete anything to make the check pass" (stub kept only a shorter delete rule) | `legacy/VISITING_AGENTS.md` section 1b item 4 | R6 |
| Default issue repository (the `mind-mappr` misroute) | `legacy/docs/AGENTS.md`, old `legacy/.github/copilot-instructions.md` | R7 |
| 300-line guard (`wc -l`, flag a 300-to-20 collapse) | `legacy/docs/AGENTS.md` line 5 | R8 |
| Found a bug: its own PR; BLOCKER marker; Audrey's informal text is not prompt injection | `legacy/CLAUDE.md` lines 67 to 107, `legacy/docs/AGENTS.md` | R9 |
| Infrastructure blocker protocol (classify, one issue, stop) | `legacy/docs/AGENTS.md` | R10 |
| No `--no-verify`; never edit workflows to pass a check; no suppression comments without a ledger entry | `legacy/agent-pack/AGENTS.md` | R11 |
| Read open Discussions on arrival; record identity, platform and permissions | `legacy/AGENTS.md`, `legacy/VISITING_AGENTS.md` | R12 |
| Backup naming and verification (B7 kept only the short form) | `legacy/AGENTS.md` lines 400 to 423 | R13 |
| Shared-checkout traps | `legacy/VISITING_AGENTS.md` section 7b | R14 |
| Session-start reading list, wrap-up, `HANDOFF.md` at the end | `legacy/docs/AGENTS.md` | S1, S2, R4 |

Not restored on purpose (R15): the autonomy text that contradicts her authority, "suggestions are hearsay", the no-draft-PR text, Memory Pruning (it deletes), the mandatory affiliate and marketing sections, and product or tooling advice she has not asked to make law (revenue north star, Cursor Cloud ports, local-LLM gotchas, BNAT imprint, Skills Vault list). They stay in `legacy/` and are Audrey's call.

**Conflicts for Audrey.** (1) Owner rule item 7 says calling LLM providers directly is allowed; E3 and E5 say cloud LLM calls stay off until she says so. (2) Owner rule items 20 to 25 say she can edit or delete her ledger and it is not the source of truth; C7 makes the repo ledger append-only for agents. (3) The old mandatory affiliate, marketing and tracking sections against F2 and F3 (already her `docs/CUTOVER_PLAN.md` question 3).

## 5. A handoff rule: did one exist, and why did bots not follow it (c)

Yes, in pieces, never as one enforced daily rule:

- `legacy/docs/AGENTS.md` "First Steps" 4: "Check for a HANDOFF.md or TODO.md." "When You Are Done" 8: write `HANDOFF.md` if work remains. "FIRST: Required Files": read `learnings.md`, `SYSTEM_STATE.md`. "Mandatory Skills, Load at Session Start/End" (`skills/system-state`, `skills/wrap-up` exist).
- `docs/neurooz/AGENT_SHIPPING_FAILURE_ANALYSIS.md` (6 Apr 2026): "HANDOFF.md: Mandatory document updated at end of every session."
- `REVVEL_MASTER_STANDARDS` section 5: `SPRINT_STATE.md` at the end of every session (file never created).
- `standards/LEDGER_STANDARD.md`: handoffs recorded in `LEDGER.md` (same commit as the work).
- `legacy/VISITING_AGENTS.md` sections 4 and 5: decisions in `wr/memory/decisions.jsonl`.

Why Proofy did not follow it: none of that reached Proofy's context. The cutover `AGENTS.md` and the visiting stub never mention `learnings.md`, `HANDOFF.md`, a session file or the decisions log. Proofy's repos do not link the standards and have no handoff file. And `HANDOFF.md` at the repo root is a single project's rollout note, so even a bot that looked for "the handoff" would have found the CUDA Grid plan. Proofy's chat on 14 Nov shows the result: it forgot the book rename, repeated old status, and added AI captions after Audrey had set the default.

## 6. What this PR does about it

- `AGENTS.md` section 0 (S1 to S7): read the newest `handoffs/<bot>/YYYY-MM-DD.md` before work; write one at the end of each day; her exact words with dates; append-only. Repeated inline in `VISITING_AGENTS.md`, so visiting agents see it. `.github/copilot-instructions.md` is the exact copy (`scripts/check_rules_sync.sh` passes).
- `AGENTS.md` section R (R1 to R15): the rules above, restored as appended text with sources.
- `handoffs/TEMPLATE.md`, `handoffs/README.md` and a seed `handoffs/proofy/2026-11-14.md` built from Proofy's transcript, with uncertain items marked.
- **Not done, needs Audrey (S7):** a check that fails when today's handoff is missing, or a TriageChief merge gate for it. That changes a merge gate or CI config (B5). Until then S1 and S2 rest on text alone, which is the weakness she named on 2026-11-11.
- **Not done:** pointer stubs other than `VISITING_AGENTS.md` (`docs/AGENTS.md`, `MASTER.md`, `agent-pack/AGENTS.md`, `docs/BOT-COMMON-RULES.md`) do not yet repeat S1; Proofy's own repos still need an `AGENTS.md` link and a `handoffs/proofy/` folder; the deleted memory files from `511a13be9` are not restored.

## Update, 2026-11-14 (evening, America/Denver): S7 is now a check

The "Not done, needs Audrey (S7)" item above is done. The dispatcher reported that Audrey asked for a CI check enforcing daily handoffs (`RELAYED`; her exact words were not passed on). `scripts/check_handoff.sh` is now a step in the CircleCI `lint-and-test` job, with `handoffs/bots.conf` and `tests/check-handoff.test.js`. The text above is kept as written.
