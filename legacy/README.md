# legacy: the old rule files

These are the previous rule files, **renamed here with `git mv` so their history is kept. They are not edited and not deleted.**
They are superseded by [`../AGENTS.md`](../AGENTS.md), which is now the one rulebook. If anything here disagrees with `AGENTS.md`, `AGENTS.md` wins.

Each file sits at its old path under `legacy/` (for example `legacy/docs/AGENTS.md`). A short pointer file stays at the old path, except:

- Root [`../AGENTS.md`](../AGENTS.md) is the full new rulebook, not a stub. The old root text is this file: `legacy/AGENTS.md`.
- [`../CLAUDE.md`](../CLAUDE.md) is the single Claude Code import line `@AGENTS.md`. The old text is `legacy/CLAUDE.md`.
- [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) is a generated exact copy of `AGENTS.md`. The old text is `legacy/.github/copilot-instructions.md`. `scripts/check_rules_sync.sh` fails if the two current files differ. No symlinks.

The new `AGENTS.md`, this `legacy/` tree, and the remaining stubs take effect on `main` only when they land together in the same promotion.

| Old path | Now |
| --- | --- |
| `AGENTS.md` (old text) | `legacy/AGENTS.md` (new rulebook is root `AGENTS.md`) |
| `CLAUDE.md` | `legacy/CLAUDE.md` (current file is `@AGENTS.md`) |
| `MASTER.md` | `legacy/MASTER.md` |
| `VISITING_AGENTS.md` | `legacy/VISITING_AGENTS.md` |
| `docs/AGENTS.md` | `legacy/docs/AGENTS.md` |
| `docs/REVVEL_MASTER_STANDARDS.md` | `legacy/docs/REVVEL_MASTER_STANDARDS.md` |
| `docs/MERGE_AND_OVERRIDE_POLICY.md` | `legacy/docs/MERGE_AND_OVERRIDE_POLICY.md` |
| `docs/BOT-COMMON-RULES.md` | `legacy/docs/BOT-COMMON-RULES.md` |
| `docs/DEFINITION_OF_DONE.md` | `legacy/docs/DEFINITION_OF_DONE.md` |
| `agent-pack/AGENTS.md` | `legacy/agent-pack/AGENTS.md` |
| `.github/copilot-instructions.md` (old text) | `legacy/.github/copilot-instructions.md` (current file is a copy of `AGENTS.md`) |
| `.github/pull_request_template.md` | `legacy/.github/pull_request_template.md` (the new template is short) |

Other rule-bearing files (`seed.md`, `README.md` sections, `UPREV_METHOD.md`, `GOAP*.md`, `COMPLIANCE_RUBRIC`, and the domain files in `standards/`) were not moved in this step.
They stay in place and sit below `AGENTS.md` in authority (A1). `docs/CUTOVER_PLAN.md` lists them for a later step.

## Section mapping (old IDs to AGENTS.md)

CircleCI and other docs cite old section IDs (for example `.circleci/config.yml` cites "VISITING_AGENTS.md section 1b"). This PR does not change other CI config or workflows. The `VISITING_AGENTS.md` and `docs/AGENTS.md` stubs keep the commonly cited headings so those anchors still resolve. Remaining citations are inventoried in `docs/cutover/reference-inventory.md` and are a Phase 1 item.

### `VISITING_AGENTS.md`

| Old section | `AGENTS.md` ID |
| --- | --- |
| §1 The Prime Directive | F1, F4 |
| §1b Hard rules, checked by CI | F2, F3 |
| §2 Where you may and may not write | B1, B8 |
| §2b Imprint-at-spawn (BNAT Knowledge Sheaf) | not in `AGENTS.md` (A4: advice); see this legacy file |
| §3 Durability / pipe to git | B7, E2 |
| §4 Setup / API info | E4, C4 |
| §5 Record what you did | C6, C7, G4 |
| §6 What already runs the fleet | not in `AGENTS.md` (A4: advice); see this legacy file |
| §7 Before you open your PR | C1 (draft-first) |
| §7b Shared checkout | not in `AGENTS.md` (A4: advice); see this legacy file |
| Whiteboard / Backups | B7; discussion #18238 |

### Root `AGENTS.md` (old headings, now in `legacy/AGENTS.md`)

| Old heading | `AGENTS.md` ID |
| --- | --- |
| OWNER RULE — NEVER DELETE, NEVER REWRITE | B1, B2 |
| OWNER-DIRECTED WORK AND CONSEQUENCES | A1, A2, A6 |
| PRIME DIRECTIVE | A1, F1 |
| Conventional Commits | C7 |
| Layer 0 — local LLMs first, and the spend gate | E3, E5 |
| Commenting | B1, B2 |
| Backups | B7 |

### `docs/AGENTS.md` (selected headings)

| Old heading | `AGENTS.md` ID |
| --- | --- |
| Prime Directive | F1 |
| NO MORE SCAFFOLDING — ENFORCEMENT | D4 |
| Checkpoint-Gated Grids | C1 (draft-first wins; the old text said not to open draft PRs) |
| Commit Messages | C1, C7 |
| What NOT to Do | B1, B3, B4, E1, F2, F3 |
| FIRST: Required Files | F1 |
| Non-Negotiable Rules | the core set in `AGENTS.md` |

`legacy/docs/AGENTS.md` told agents not to open draft PRs (around the scaffolding ban and Checkpoint-Gated Grids). `AGENTS.md` C1 resolves that contradiction to draft-first.

## Correction, 2026-11-14

The "Root `AGENTS.md`" table above maps the old heading "OWNER-DIRECTED WORK AND CONSEQUENCES" to B1, B2 and A1, A2, A6. That mapping was wrong: those IDs are about deletion and authority, not about Audrey deciding what to explore, store and publish. The text is now in `AGENTS.md` as R2, and owner rule items 7 to 25 are R1. The old map row was left as written. See `docs/cutover/mishap-records-audit-2026-11-14.md`.
