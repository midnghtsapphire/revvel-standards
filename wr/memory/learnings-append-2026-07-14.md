---

**Date/Time:** 2026-07-14T13:15:00Z

**Task Attempted:** External full-repo prosecution audit (Claude, chat session) — gaps, broken wiring, errors, bugs across revvel-standards. 10 WRs filed at `wr/pending/audit-2026-07-14/`, pushed via Zapier GitHub MCP on branch `audit/2026-07-14-wr-a1`.

**Outcome:** Success — audit complete, fixes proven empirically, WRs + memory + skill files landed on branch, PR opened for review. One incident during push: a Zapier whole-file write replaced learnings.md with only this entry (branch-only; main untouched; restored via scripts/restore-learnings.sh from blob 58bb597a).

**Root Cause of Failure (If any):** Audited a clone snapshot; at push time live main had already gained a partial WR-A1 fix (yaml/ajv/ajv-formats/@types/node landed; semver + @octokit/rest still missing). Remaining audit findings verified still live: state.json = `{}` (issue-13555), 3 workflows calling missing scripts (call-cursor-api.sh, record.js, index.js), 13 pull_request_target workflows, gitbito@main unpinned, 5 duplicate issue files, 5 broken SSOT links, 78 cron workflows unbudgeted. Incident root cause: tools that replace whole-file content must never be pointed at append-only logs — the transfer-size ceiling forces truncation or replacement.

**Self-Healing Fix / Learned Lesson:** (1) **Audits decay — re-verify every finding against live HEAD before applying fixes**; merge into current state, never overwrite newer work with stale audit copies. This bit twice in one session (package.json, learnings.md itself). (2) Cluster failures by root cause before filing: 23 test failures were 1 bug (undeclared deps); proven fix took the suite 482 discovered → 631/631 green + clean tsc. (3) Fix + vaccine together: every corrective WR names the guard preventing recurrence (WR-A10 dependency-declaration lint is WR-A1's vaccine). (4) NEW from the incident: **whole-file-write APIs are forbidden on append-only logs** — route log appends through git-native paths (Actions workflow with checkout, or a side-file + fold-in script) where the write can be atomic and size-unbounded. Full toolchain + method in `wr/memory/audit-2026-07-14-tools.md`; procedure codified in `skills/repo-audit/SKILL.md`.

**Next Action:** Review/merge PR from `audit/2026-07-14-wr-a1`. Then agents execute WR-A1..A10 in priority order (A2 state engine and A3 dead script paths first — both P0/P1 and both currently breaking live automation). Also: archive learnings.md entries older than 90 days per its own header rule — the log is 70KB+ and growing; a WR for the archival cron is warranted.
