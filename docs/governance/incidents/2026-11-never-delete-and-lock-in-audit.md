# Incident audit: never-delete rule and vendor lock-in (2026-11)

Added 2026-11-05 by Grok Bot for Audrey Evans. Source: Freedom-Angel-Corp/brain-dump#4. This is evidence only. Nothing was deleted, reverted, or restored.

## 1. Files removed since the rule took effect (2026-10-30)

I ran `git log --all --since=2026-10-30 --diff-filter=D --name-only` on 2026-11-05.

- **No file deletions** on `main`, `daily/2026-10-30`, `daily/2026-10-31`, `daily/2026-11-04`, or `daily/2026-11-05` since 2026-10-30.

## 2. Deletions from before the rule (candidates for owner review)

- **`d3732059` / PR #17891** (2026-08-24 06:19 MDT, "chore: remove accept-both leftover copies"). It removed 10 files, a net of 875 lines deleted: `Autonomous_Resilience_Architecture_Overview.jpg`, `Autonomous_Resilience_in_Code_Repositories.jpg`, `Biomimetic_AI_Fleets.pdf` (about 14 MB), `Self-Healing_Cyber-Physical_Systems_Guide.jpg`, a "Playbook for Self-Healing Autonomous Fleets" PDF, `VEINS_Immortal_Agent_Architectures.pdf` (about 13 MB), `vine-orders.html` (454 lines), two research `.md` notes (49 and 371 lines), and 1 line of `START_HERE_CALL_CHAIN.md`. These files still exist in git history (`git show d3732059^:<path>`). The owner decides whether to restore them.
- **`ad7e476a` / PR #17789** (2026-08-20, "fix(ci): clean up #17758's residue…"). The trailers are `Co-Authored-By: Claude Opus 5` and `Claude-Session: https://claude.ai/code/session_01KFMvpCoLuxSAoDWboxkDYk`. The body says three root patchers were deleted (`patch_ossar.js`, `fix-semgrep.js`, `fix-zizmor.js`). The actual deletion of those files is in `327c320f1` / PR #17769 (2026-08-20). The `ad7e476a` diff itself only touches `.github/workflows/no-root-junk.yml`, `ossar.yml`, a vendored `cdp.py` (a reflow revert), and a test. This was Claude-authored deletion activity before the rule existed.

## 3. Vendor lock-in surface (Claude-specific)

- **`.claude/hooks/save-transcript.sh`** is a Claude Code Stop hook. It copies session JSONL into `docs/agents/claude/transcripts/`. It only works under Claude Code (`CLAUDE_TRANSCRIPT_PATH`, `~/.claude/projects`), and no other agent has an equivalent. `.claude/settings.json` is **not** committed, even though the hook header says to wire it there, so the hook may not be active.
- **Transcript still missing:** `docs/agents/claude/transcripts/` has 46 files, all from 2026-06-19 sessions. None matches session `01KFMvpCoLuxSAoDWboxkDYk`, which is cited by `ad7e476a`. The reasoning behind that deletion is not in the repo.

## 4. CLAUDE.md vs AGENTS.md (two sources of truth)

- `CLAUDE.md` (118 lines) is a separate rulebook that Claude reads on every task. It says the `standards/` docs win over it. It **does not mention** the OWNER RULE, never-delete, comment-out-don't-delete, draft-only PRs, or "agents never merge".
- `CLAUDE.md` "Green-main rules" say "Close the source issue via `Closes #N`" and "Watch live CI on your own in-flight PRs". They do not say draft-only or don't-merge, so a Claude agent following only CLAUDE.md could miss the OWNER RULE.
- `CLAUDE.md` "Prime directive" says "If a change serves none of those, justify it … or don't ship it". This is in tension with OWNER RULE items 9–10 ("Do not decide what to include or disclude", "Do not leave anything out").
- `AGENTS.md` mentions CLAUDE only generically (line 3) and in the transcripts path (line 283). It does not say which file wins for Claude agents. The OWNER RULE says it overrides any conflicting text in the repo, so AGENTS.md wins, but CLAUDE.md does not point to it.
- Suggested additive fix for the owner to approve: add a pointer line at the top of CLAUDE.md to the AGENTS.md OWNER RULE. This was not done in this PR.

## 5. learnings.md

One incident line was appended to `learnings.md`, which `CLAUDE.md` describes as append-only.
