# Runbook — Working the approval queue

**Inputs:** `var/plans/<plan_id>.json`, the matching `var/audit/<run_id>.jsonl`.

## Triage order

1. `deny` — read the rule id. If a denial is wrong, fix configuration or the skill; never bypass.
2. `require_approval` — decide individually. Required: correct identity, evidence supports the
   summary, rollback stated in one sentence, blast radius understood.
3. `propose` — batch-accept only when every item shares one capability and one rollback path.
4. `allow` — spot-check a sample; confirm the capability is genuinely reversible and internal-only.

## Approval record

Each approval must produce an audit event containing the decision id, approver, timestamp and the
decision hash it approves. Approvals expire after `approval_ttl_minutes` (default 720). An expired
item must be **re-planned and re-scored**, not revived: the underlying state may have changed.

## Rules of thumb

- If you cannot explain the action from its evidence rows, reject it.
- If the rollback needs more than one sentence, reject it.
- Never approve an externally visible action in a batch.
- Never approve delete + unsubscribe in the same session as a large archive batch; separate blast
  radii.

## Escalation

Two-person review is not implemented (backlog 5.4). Until then, high-consequence approvals should be
deferred rather than rushed.
