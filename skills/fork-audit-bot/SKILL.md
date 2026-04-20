# Skill: Fork-Audit Bot

**Trigger keywords:** fork audit, upstream eval, repo scoring, presence boost,
GitHub authority, OpenRank, Pull Shark, contribution graph, swarm cron.

**Load when:** you are asked to research, score, fork, or submit
contributions to external GitHub repositories on a recurring basis — or when
you are wiring up presence-/authority-boosting automation for
`@midnghtsapphire`.

---

## What this skill owns

1. The scoring rubric in [`scripts/fork-audit-bot.js`](../../scripts/fork-audit-bot.js)
   and how to extend it.
2. The compliant-PR routing contract — i.e. which labels and assignees every
   bot-created issue / PR must carry so the existing OpenRouter orchestrator
   picks it up. See [`docs/FORK_AUDIT_BOT_PROCESS.md`](../../docs/FORK_AUDIT_BOT_PROCESS.md)
   §Compliant-PR routing.
3. The candidate list at [`fork-audit/candidates.json`](../../fork-audit/candidates.json).
4. The cron workflow [`.github/workflows/fork-audit-bot.yml`](../../.github/workflows/fork-audit-bot.yml).

## Rules

1. **Never add a candidate without a `strategic_value`.** It is doubled in the
   rubric and the single most important human-owned knob.
2. **Do not remove any label from `ROUTING_LABELS`.** Each one is consumed by
   a different downstream workflow (`openrouter-assignee.yml`,
   `ralph-loop.yml`, `priority-router.yml`). Add labels, don't subtract.
3. **Every issue / PR the bot opens must carry `Copilot` as an assignee.**
   That is how the OpenRouter orchestrator is actually triggered —
   `@openrouter` is not a GitHub user.
4. **Dedup by title.** Search `repo:<self> is:issue in:title "Fork-Audit Report — <repo>"`
   before opening a second mirror issue.
5. **Never impersonate.** Authorship = `GITHUB_ACTOR`. The bot adds a footer
   linking back to `FORK_AUDIT_BOT_PROCESS.md` so upstream maintainers can
   see exactly what is running.
6. **Never hard-fail a run on one bad candidate.** Log and move on; the cron
   will try again tomorrow.
7. **Never log secrets.** `GITHUB_TOKEN` and `ADMIN_GITHUB_TOKEN` are inputs
   only.

## Workflow (step by step)

1. Load [`skills/openrouter-swarms/SKILL.md`](../openrouter-swarms/SKILL.md)
   for the downstream routing model.
2. Load [`docs/OPENROUTER_ASSIGNEE_PROCESS.md`](../../docs/OPENROUTER_ASSIGNEE_PROCESS.md)
   for the label / assignee contract.
3. Edit [`fork-audit/candidates.json`](../../fork-audit/candidates.json) —
   append new upstream candidates with `repo`, `goal_tags`, `strategic_value`,
   `notes`.
4. Dry-run locally:
   ```bash
   DRY_RUN=1 GITHUB_TOKEN="$(gh auth token)" \
     node scripts/fork-audit-bot.js
   ```
5. Inspect the JSON log lines. Each one has `repo`, `score`, `band`,
   `action`, and either `mirror_issue` / `upstream_issue` or `error`.
6. If happy, merge. The scheduled workflow picks it up at next cron; or
   trigger it manually:
   ```bash
   gh workflow run "Fork-Audit Bot"
   ```

## Presence-/Authority-metric map

(Expanded in [`docs/FORK_AUDIT_BOT_PROCESS.md`](../../docs/FORK_AUDIT_BOT_PROCESS.md)
§GitHub Presence & Authority.) Short version — the bot moves:

- GitHub **contribution graph** (squares per day)
- GitHub **Achievements**: *Pull Shark*, *Galaxy Brain*, *Quickdraw*, *YOLO*
- **OpenRank** (X-lab / CHAOSS network-authority score)
- **GitRank**, **CHAOSS Community Health** metrics
- Appearance in upstream **Contributors** sidebars

## Anti-patterns

- ❌ Opening dozens of shallow "typo fix" PRs to farm *Pull Shark* —
  maintainers flag and block this. The bot's rubric intentionally gates on
  `strategic_value` + `goal_tag` alignment so only substantive audits land.
- ❌ Forking every starred repo — waste of storage and attention. The
  candidate list is opt-in.
- ❌ Stripping labels to "keep the issue clean" — breaks OpenRouter routing.

## See also

- [`docs/FORK_AUDIT_BOT_PROCESS.md`](../../docs/FORK_AUDIT_BOT_PROCESS.md)
- [`scripts/fork-audit-bot.js`](../../scripts/fork-audit-bot.js)
- [`.github/workflows/fork-audit-bot.yml`](../../.github/workflows/fork-audit-bot.yml)
- [`tests/scripts/fork-audit-bot.test.js`](../../tests/scripts/fork-audit-bot.test.js)
- [`skills/openrouter-swarms/SKILL.md`](../openrouter-swarms/SKILL.md)
- [`skills/ralph-loop/SKILL.md`](../ralph-loop/SKILL.md)
