# RVS-PRESERVE-001: Preserve Goals & History (No-Delete Standard)

**Standard ID:** `RVS-PRESERVE-001`
**Status:** Active
**Author:** revvel engine-spine agent (claude-code) · **Added:** 2026-06-25
**Applies to:** All agents and humans operating on Revvel repositories.

> This standard is **additive**. It complements, and does not replace,
> [`COMMENT-DONT-DELETE.md`](COMMENT-DONT-DELETE.md) (RVS-AGENT-001). That standard
> governs *code* audit trails; this one governs *data, goals, and stats*.

---

## 1. No-Delete Rule

- **Do not delete files, content, or silently replace existing behavior.** Nothing
  is ever "removed" — it is **archived or commented out** with metadata.
- If something truly must be deprecated, **comment it out or move it to an
  `archive/` location** with a header recording **who, date, and why**.
- Prefer **additive** changes (new file, new section, sidecar `*.revvel.md`) over
  edits that overwrite existing working content.
- For code, use the `REVVEL-DISABLED` block from RVS-AGENT-001. For docs/data,
  use a one-line header: `> ARCHIVED <YYYY-MM-DD> by <who> — <why>`.

## 2. Goals Are Sacred

- Existing **goals and stats are source-of-truth data**. Do **not** change, remove,
  overwrite, normalize away, or genericize them.
- The **$10M-in-3-years** prime directive in [`GOAL.md`](../GOAL.md) and any other
  goal/stat tracking currently present must be **preserved and passed through
  exactly**. The orchestrator owns goals/stats; engines/runners read and carry them
  but never rewrite them.
- Templates and examples must use **placeholders** or **additive examples** only —
  never edit a real goal value to make an example.

## 3. Orchestrator Owns Goals/Stats

- The Orchestrator (`engines/runner-orchestrator/orchestrate.js`) is the only layer
  that aggregates goals/stats into `state.json`.
- Engines and runners do **last-mile work** and emit **receipts/artifacts/state
  patches** for the orchestrator to aggregate. They must carry
  `revenue_target_monthly_usd` and `goal_phase` through untouched
  (see `engines/CONTRACT.md` Rule 4).

## 4. Legitimate Deletion

The only legitimate path to deleting an archived/commented block is a **human**
ratifying the removal with a commit message referencing the original work request
and explaining why deletion is correct. **Agents may never ratify their own
deletions.**

## 5. Summary

| Do | Don't |
|----|-------|
| Add new files / sidecar `*.revvel.md` | Overwrite working content |
| Archive with who/date/why | Delete silently |
| Preserve goals/stats exactly | Edit the $10M goal or any goal value |
| Let the orchestrator own goals | Let an engine rewrite goals |
| Let humans ratify deletions | Let agents ratify their own deletions |

**Questions / amendments:** open an issue tagged `standard:RVS-PRESERVE-001`.
