# learnings.md append — audit 2026-07-14

Append this block to `learnings.md` **after** running `scripts/restore-learnings.sh`
(which restores the file from `origin/main`). Do not commit the corrupted 1.9KB
version currently on this audit branch.

---

## 2026-07-14 — External prosecution audit (15 WRs)

**Session:** Claude adversarial audit against live main. 482 modules discovered,
631/631 tests green after P0 dep fix, clean tsc, automation-doctor loads.

### Applied on branch
- **WR-A1 (P0, proven):** `package.json` — added `semver` + `@octokit/rest`,
  the last two undeclared `require()`s after drift check. Vaccine: `dep-lint`.

### Headline patterns learned

| Pattern | WR | Vaccine |
|---|---|---|
| Undeclared runtime deps drift silently past `npm test` | A1 | CI `dep-lint` job enumerating `require()` vs `package.json` |
| Empty `state.json` = live SSOT outage | A2 | Nightly `state-freshness` gate |
| Deleted script, stale workflow references | A3 | `workflow-ref-integrity` CI gate |
| `pull_request_target` proliferation | A4 | Security review on every new `pull_request_target:` |
| LLM judges "today" from training data | A11 | Inject `date -u` into every mirror/judge prompt; ban textual date reasoning |
| Persona→persona delegation blocked by @-mention + bot-filter | A13 | `summon:<persona>` label bus (labels bypass @-mention filters and are bot-visible) |
| COMMENT-DONT-DELETE has no CI gate | A14 | `deletion-guard.yml` — fail PRs deleting protected paths without an `allow-deletion` label + rationale |
| "Temporarily" deleted files never restored (llm-router.yml, 2026-06-15, bd3c4687) | A15 | Deletion archaeology in every audit; `git log --diff-filter=D --since="60 days ago"` |

### Method memory
See `wr/memory/audit-2026-07-14-tools.md` for the full toolchain and the
reusable procedure at `skills/repo-audit/SKILL.md` (7 gates).

### Execution order (post-merge)
A13 → A14 → A11 → A2 → A3 → remaining by priority.

### Prime-directive tie-in
Each fix protects the $10k→$10M pipeline:
- A1/A2/A3 keep the Polar.sh funding automation shippable.
- A4/A14 protect the OSINT product surface from supply-chain and silent-deletion regressions.
- A11/A13 restore orchestrator autonomy so product pipelines actually run without human hand-holding.
---

**Date/Time:** 2026-07-14T13:15:00Z

**Task Attempted:** External full-repo prosecution audit (Claude, chat session) — gaps, broken wiring, errors, bugs across revvel-standards. 10 WRs filed at `wr/pending/audit-2026-07-14/`, pushed via Zapier GitHub MCP on branch `audit/2026-07-14-wr-a1`.

**Outcome:** Success — audit complete, fixes proven empirically, WRs + memory + skill files landed on branch, PR opened for review. One incident during push: a Zapier whole-file write replaced learnings.md with only this entry (branch-only; main untouched; restored via scripts/restore-learnings.sh from blob 58bb597a).

**Root Cause of Failure (If any):** Audited a clone snapshot; at push time live main had already gained a partial WR-A1 fix (yaml/ajv/ajv-formats/@types/node landed; semver + @octokit/rest still missing). Remaining audit findings verified still live: state.json = `{}` (issue-13555), 3 workflows calling missing scripts (call-cursor-api.sh, record.js, index.js), 13 pull_request_target workflows, gitbito@main unpinned, 5 duplicate issue files, 5 broken SSOT links, 78 cron workflows unbudgeted. Incident root cause: tools that replace whole-file content must never be pointed at append-only logs — the transfer-size ceiling forces truncation or replacement.

**Self-Healing Fix / Learned Lesson:** (1) **Audits decay — re-verify every finding against live HEAD before applying fixes**; merge into current state, never overwrite newer work with stale audit copies. This bit twice in one session (package.json, learnings.md itself). (2) Cluster failures by root cause before filing: 23 test failures were 1 bug (undeclared deps); proven fix took the suite 482 discovered → 631/631 green + clean tsc. (3) Fix + vaccine together: every corrective WR names the guard preventing recurrence (WR-A10 dependency-declaration lint is WR-A1's vaccine). (4) NEW from the incident: **whole-file-write APIs are forbidden on append-only logs** — route log appends through git-native paths (Actions workflow with checkout, or a side-file + fold-in script) where the write can be atomic and size-unbounded. Full toolchain + method in `wr/memory/audit-2026-07-14-tools.md`; procedure codified in `skills/repo-audit/SKILL.md`.

**Next Action:** Review/merge PR from `audit/2026-07-14-wr-a1`. Then agents execute WR-A1..A10 in priority order (A2 state engine and A3 dead script paths first — both P0/P1 and both currently breaking live automation). Also: archive learnings.md entries older than 90 days per its own header rule — the log is 70KB+ and growing; a WR for the archival cron is warranted.
