# Runbook — Email cleanup pass

**Goal:** turn an inbox backlog into labeled, archived, and (with approval) trashed or unsubscribed
threads, with full evidence and rollback.

**Preconditions**
- `revvel-ops doctor` shows the expected autonomy mode and allowlisted identity.
- Gmail identity is allowlisted for the permission verbs you intend to use.
- Sample connector statuses have been revalidated (see `connector-reauthorization.md`).

## Steps

1. **Posture check**
   ```bash
   revvel-ops doctor
   revvel-ops identities
   ```
   Confirm `angelreporters@gmail.com` (or your configured identity) is the only allowlisted Google
   identity and that `delete`/`unsubscribe` are not granted unless you intend them.

2. **Plan**
   ```bash
   revvel-ops plan --mode review_everything --identity angelreporters@gmail.com
   ```
   Expect four proposal families: label (all threads), archive (stale bulk mail), unsubscribe
   (high-volume, low-engagement bulk senders), trash (stale promotional/notification threads only).
   Protected categories — `security`, `personal`, `receipt` — are never archived or trashed.

3. **Dry-run**
   ```bash
   revvel-ops dry-run --mode review_everything
   ```
   Verify `network_calls=0` and that the chain reports `ok=True`.

4. **Review the plan file** (`var/plans/<plan_id>.json`). For each item confirm identity, target,
   evidence, `rollback_ref`, and that the disposition matches the rule ids in `reasons`.

5. **Approve selectively.** Start with label-only. Never batch-approve unsubscribe or trash items;
   review them one at a time. Unsubscribe is externally visible and has no rollback.

6. **Apply** — *not available in the MVP.* `revvel-ops apply` refuses and records `apply.refused`.
   When live adapters exist: apply labels first, verify, then archive, then re-review deletions.

7. **Close out**
   ```bash
   revvel-ops verify-audit
   ```
   Record the plan id, chain head hash, and counts in your operations notes.

## Rollback
- Label → remove the `Revvel/*` label (pre-existing labels are untouched).
- Archive → re-apply `INBOX`.
- Trash → untrash within the provider retention window (~30 days).
- Unsubscribe → **no rollback**; resubscribe manually if it was wrong.

## Failure modes
| Symptom | Cause | Action |
| --- | --- | --- |
| Everything denied | Identity not allowlisted or permission not granted | Fix `config/identities.yaml`; rules R020/R021 name the cause |
| Zero archive proposals | Fixtures/metadata too recent or all starred | Expected; check `age_days` thresholds |
| Unexpected category | Rule-based classifier limitation | Improve the skill rules and add a fixture + test |
| Chain verification fails | Log edited or truncated | Stop, follow `incident-unexpected-action.md` |
