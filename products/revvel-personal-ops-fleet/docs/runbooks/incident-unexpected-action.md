# Runbook — Incident: unexpected action

Trigger: something changed that you did not approve, a chain verification failed, or a connector
reports state you did not authorize.

## 1. Contain (first 5 minutes)

```bash
export REVVEL_AUTONOMY_MODE=review_everything   # or edit config/policy.yaml
```
Stop planning. Do not delete or edit any file under `var/`.

## 2. Preserve

Copy the audit directory to a read-only location. Never modify a chain file — copies only.

## 3. Verify integrity

```bash
revvel-ops verify-audit
python scripts/verify_audit_chain.py var/audit/<run_id>.jsonl
```
- Chain intact → the fleet's record is trustworthy; continue at step 4.
- Chain broken → treat the host as untrusted. Rotate any credential referenced by the environment,
  and reconstruct from the last verifiable sequence number.

## 4. Reconstruct the decision

Find the `policy.decided` event for the action. It contains confidence, disposition, rule ids and
reasons. Then read the paired `proposal.created` event for identity, capability, target and evidence
digests. Together they answer: was policy followed, or was policy wrong?

## 5. Classify

| Finding | Meaning | Fix |
| --- | --- | --- |
| Policy followed, outcome undesired | Configuration/design error | Tighten gates; add capability to `always_require_approval_capabilities` or `deny_capabilities` |
| Policy not followed | Code defect | Write a failing test first, then fix; file an ADR |
| Wrong identity | Allowlist error | Correct `config/identities.yaml`; add explicit `allowlisted: false` rows |
| Action outside the fleet | Another automation (n8n, mailbox rule, another agent) | Inventory it; consolidate or disable |
| No matching audit event | Not this fleet, or the chain is incomplete | Investigate the host; the fleet writes an event before every decision |

## 6. Recover

Follow [rollback.md](rollback.md). Record the rollback in the chain.

## 7. Postmortem

Document: timeline, evidence ids, rule ids, root cause, the configuration or code change, and the new
test. Update `CHANGELOG.md`. Do not include real message content, tokens or personal addresses —
reference `event_id` / `evidence_id` values.
