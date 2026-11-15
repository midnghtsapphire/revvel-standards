# Workflow Audit — 2026-11-10 (WR #18313 / #18268)

Full structural audit of all **241 workflows** in revvel-standards:

| Check | Result |
|---|---|
| Dead script references | 0 (ship-to-market's record.ts/js is guarded by `[[ -f ]]`) |
| Deprecated actions @v1/v2 | 0 (dependabot groups keep them current — merged today) |
| References to deleted agent-approval-check | 0 (removed cleanly per #18328) |
| Duplicate workflow names | 0 |

## Root cause of "agents not working" (#18268)
1. **The human-approval gate** (`agent-approval-check.yml`) sat on every agent-authored PR —
   agents could open work but never land it. Removed per your directive in #18328.
2. **Merge backlog**: 131 open PRs had accumulated (91 dependabot, 28 ImgBot, others).
   All triaged and merged today (124 merged, rest rebasing).
3. Recent failing workflows (security-fleet, pr-review-status, agent-audit-logger,
   create-issue-branch) fail in the event lane — logs expired before triage, but
   `scripts/tier3_self_heal.py` (WR #18339) now watches failures continuously and
   will auto-file diagnosed WRs.

## Streamlining
- `scripts/audit_workflows.py` added — run any time: `python3 scripts/audit_workflows.py`
- Tier-3 self-healing watches failure classes (deprecated-action, yaml-syntax,
  stale-artifact-path) with a 2-attempts/day cap and full WR audit trail.
