# Runbook — Rollback

**Principle:** rollback is designed before the forward action. If `rollback_ref` is absent, the action
was never automatable (policy rule R070).

## Procedure

1. **Identify** the run and item.
   ```bash
   grep -h '"event_type":"policy.decided"' var/audit/<run_id>.jsonl | head
   ```
   Note the `proposal_id`, `decision_id` and the proposal's `rollback_ref`.
2. **Verify the chain** before acting: `revvel-ops verify-audit`. A broken chain turns this into an
   incident.
3. **Execute the compensating action** (intended procedures; no live adapters in the MVP):

| Capability | Rollback |
| --- | --- |
| `gmail.labels.apply` | Remove the `Revvel/*` label recorded in the label snapshot |
| `gmail.threads.archive` | Re-add the `INBOX` label |
| `gmail.threads.trash` | Untrash within the provider retention window (~30 days) |
| `gmail.subscriptions.unsubscribe` | **None.** Resubscribe manually via the sender |
| `calendar.events.create_private_hold` | Delete the created event id |
| `calendar.events.invite_guests` | Cancel; original notifications cannot be recalled |
| `drive.files.move` / `dropbox.files.move` / `box.items.move` | Move back to the recorded prior parent/path |
| `drive.permissions.share` / `dropbox.sharing.create_link` / `box.collaborations.create` | Revoke the permission/link/collaboration id; assume content may already be copied |
| `*.trash` / `dropbox.files.delete` | Restore from trash / restore the file revision |
| `github.branches.create` | Delete the branch ref |
| `github.pulls.create` | Close the PR; notifications already delivered |
| `local.fs.move_to_staging` | Move back from staging using the recorded original path |
| `n8n.workflows.modify` | Re-import the exported workflow JSON snapshot |
| `n8n.workflows.trigger_production` | Run the workflow-specific compensating flow |

4. **Record** the rollback as an audit event referencing the original `proposal_id` and
   `decision_id`. Rollbacks are appended, never overwritten.
5. **Prevent recurrence:** tighten policy (move the capability back to `require_approval` or onto the
   deny list), add a test, and file an ADR if the change is structural.

## Retention constraint

Audit retention (400 days) must exceed every provider's trash window so the record outlives the
ability to undo. If a rollback window has expired, escalate as an incident rather than improvising.
