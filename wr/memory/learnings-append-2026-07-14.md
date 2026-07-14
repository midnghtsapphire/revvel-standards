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
