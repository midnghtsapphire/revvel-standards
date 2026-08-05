# Inventory and Consolidation Plan

## 1. Connector inventory — CLEARLY LABELED SAMPLE

Non-secret sample of known state. **Every value must be revalidated at runtime before planning or
acting.** Regenerate with `revvel-ops inventory --demo`; machine-readable copy in
`fixtures/connector_inventory.sample.json`.

| Connector | Sample status | Permissions granted | Notes |
| --- | --- | --- | --- |
| Gmail | connected | read, suggest | Write/delete not granted. Not all Gmail operations are reachable. |
| Google Calendar | connected | read, suggest | Read-only in practice. |
| GitHub | connected | read, suggest | Repo writes gated; repo deletion denied. |
| Dropbox | connected | read | Metadata read under path allowlist. |
| Google Drive | connected (ready to revalidate) | read | Authorization succeeded. Folder allowlist still empty — authorization is not access. |
| Box | disabled (reconnect required, by user choice) | — | Authorization dismissed by the operator. **Do not retrigger**; reconnect is operator-initiated only. |
| Local companion (Windows) | not configured | — | Not installed/enrolled. |
| Mobile companion | not configured | — | No device enrolled; phone data unreadable by default. |
| n8n | not configured | — | Existing self-hosted instance not yet registered. |
| OpenRouter | not configured | — | Service key not configured. |

### Status change log

- `google_drive`: requires_reauthorization → **connected**. Authorization succeeded; treated as
  *ready-to-revalidate*, not proven. A scoped metadata probe plus a non-empty folder allowlist are
  still required before any Drive proposal can be planned.
- `box`: requires_connection → **disabled_by_user**. The operator dismissed authorization. The fleet
  must never prompt for Box auth again; `never_prompt_for_auth: true` is set in the example config and
  all Box capabilities resolve to `unavailable`.

### Status vocabulary

`connected` · `requires_reauthorization` · `requires_connection` · `disabled_by_user` ·
`not_configured` · `unknown`. A `connected` hint never implies write, delete or unsubscribe
permission — permissions are tracked separately per identity.

## 2. Consolidation intent

Today the operator's automation is spread across n8n workflows, ad-hoc scripts, mailbox rules and
manual habits. The fleet consolidates the *decision layer*, not the execution layer:

| Existing surface | Consolidation move | Why |
| --- | --- | --- |
| n8n workflows with side effects | Register in `workflow_allowlist`; production triggers become approval-gated proposals | Side effects get an audit trail and a rollback statement |
| Mailbox rules / filters | Reimplement as `email_cleanup` proposals with evidence | Rules are invisible and unauditable; proposals are both |
| Ad-hoc local scripts | Move behind the Windows companion command allowlist (empty by default) | Removes arbitrary shell execution from the automation path |
| Manual file tidying | `*.propose_organize` / `propose_dedupe` capabilities | Metadata-only, reversible, cheap to review |
| Model calls scattered across tools | Route through OpenRouter capability with redaction + spend cap | One egress point, one budget, one policy |

Sequence: **inventory → read-only skills → proposal queue → one reversible automation → measure →
expand**. Never consolidate an execution path before its rollback path exists.

## 3. Storage consolidation

Four file stores (Drive, Dropbox, Box, local) overlap. Target end state:

1. **Drive** — canonical for documents that need sharing (`drive.file` scope, folder allowlist).
2. **Dropbox** — canonical for working/scratch sets under `/Revvel/Ops`.
3. **Box** — out of scope while disabled by operator choice; revisit only on operator initiative.
4. **Local (Windows)** — ingest + staging only, inside the folder allowlist, deletion replaced by
   staging + retention.

Deduplication uses content hashes from metadata; every move proposal records the prior location as
`rollback_ref`.

## 4. Revalidation procedure

Before each planning session, for every connector to be used:

1. Confirm the identity is allowlisted in `config/identities.yaml` for the needed permission verb.
2. Confirm the connector is enabled and (for Drive/Dropbox/Box) has a non-empty allowlist.
3. Perform the cheapest possible read to prove the scope is live (metadata list, 1 item).
4. Record the result; if it fails, mark the connector `requires_reauthorization` and stop planning
   for it. Never auto-retrigger an authorization the operator dismissed.
