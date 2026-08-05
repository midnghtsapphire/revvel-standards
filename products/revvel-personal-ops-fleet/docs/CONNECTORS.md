# Connectors: contracts, scopes and gates

Every connector is a **skeleton adapter**: it declares capabilities and refuses to execute
(`apply()` raises `NotImplementedError`). `dry_run()` returns a simulation and asserts
`would_call_network: false`. Regenerate the live matrix at any time:

```bash
revvel-ops connectors            # table
revvel-ops connectors --json     # machine-readable
```

**Every right-hand side is user-configurable** — identities, scopes, allowlists, gates, spend caps
and enabled capabilities all live in `config/*.yaml` (see `config/connectors.example.yaml`).
`availability` values (`available | partial | planned | unavailable`) are hints and **must be
revalidated at runtime**.

## Permission verbs (never bundled)

| Verb | Meaning |
| --- | --- |
| `read` | Fetch metadata/state. No mutation. |
| `suggest` | Produce proposals locally. Touches nothing external. |
| `write` | Mutate state in a way that is reversible or has a defined rollback. |
| `delete` | Remove/trash. Always approval-gated; permanent deletion is denied. |
| `unsubscribe` | Contact a third party to stop a subscription. Externally visible, irreversible, always approval-gated. |

## Gmail

Default permissions: `read, suggest`. Label namespace `Revvel/*` so rollback never touches user labels.

| Capability | Perm | Scope | Gate | Rollback | Availability |
| --- | --- | --- | --- | --- | --- |
| `gmail.messages.search` | read | `gmail.readonly` | allow | n/a | partial |
| `gmail.messages.categorize` | suggest | (none) | allow | discard proposal | available |
| `gmail.labels.apply` | write | `gmail.modify` | propose | remove `Revvel/*` label | planned |
| `gmail.threads.archive` | write | `gmail.modify` | propose | re-add `INBOX` | planned |
| `gmail.threads.trash` | delete | `gmail.modify` | require_approval | untrash within ~30d | planned |
| `gmail.subscriptions.unsubscribe` | unsubscribe | `gmail.readonly` | require_approval | none — manual resubscribe | planned |
| `gmail.messages.send` | write | `gmail.send` | require_approval | none | planned |

**Do not assume all Gmail operations are available.** The reachable operation set depends on the
granted scopes *and* on what the host platform's Gmail connector actually exposes; several rows above
are `planned`/`partial` for exactly that reason and may require your own user-authorized OAuth
client. Permanent deletion, filter mutation and forwarding rules are out of scope.

## Google Calendar

| Capability | Perm | Scope | Gate | Rollback | Availability |
| --- | --- | --- | --- | --- | --- |
| `calendar.events.list` | read | `calendar.readonly` | allow | n/a | partial |
| `calendar.events.propose_hold` | suggest | (none) | allow | discard | available |
| `calendar.events.create_private_hold` | write | `calendar.events` | propose | delete created event id | planned |
| `calendar.events.invite_guests` | write | `calendar.events` | require_approval | cancellation only; notices cannot be recalled | planned |

## Google Drive

Sample state: **authorization succeeded — treat as ready-to-revalidate, not proven.** The folder
allowlist is still empty, so nothing is addressable until folders are added explicitly.

| Capability | Perm | Scope | Gate | Rollback | Availability |
| --- | --- | --- | --- | --- | --- |
| `drive.files.search` | read | `drive.metadata.readonly` | allow | n/a | partial |
| `drive.files.propose_organize` | suggest | (none) | allow | discard | available |
| `drive.files.move` | write | `drive.file` | propose | move to prior parent id | planned |
| `drive.permissions.share` | write | `drive.file` | require_approval | revoke permission id (copy may persist) | planned |
| `drive.files.trash` | delete | `drive.file` | require_approval | restore from trash | planned |

Full-drive scopes are deliberately never requested.

## Dropbox

| Capability | Perm | Scope | Gate | Rollback | Availability |
| --- | --- | --- | --- | --- | --- |
| `dropbox.files.list` | read | `files.metadata.read` | allow | n/a | partial |
| `dropbox.files.propose_dedupe` | suggest | `files.metadata.read` | allow | discard | available |
| `dropbox.files.move` | write | `files.content.write` | propose | move back to prior path | planned |
| `dropbox.sharing.create_link` | write | `sharing.write` | require_approval | revoke link id | planned |
| `dropbox.files.delete` | delete | `files.content.write` | require_approval | restore file revision | planned |

Team/admin scopes are never requested. Permanent delete is denied by policy.

## Box

Sample state: **disabled by operator choice.** Authorization was dismissed. The fleet must **not**
retrigger Box authorization — reconnect is operator-initiated only (`never_prompt_for_auth: true` in
`config/connectors.example.yaml`). All Box capabilities resolve to `unavailable` until then.

| Capability | Perm | Scope | Gate | Rollback | Availability |
| --- | --- | --- | --- | --- | --- |
| `box.items.list` | read | `root_readonly` | allow | n/a | unavailable |
| `box.items.propose_retention` | suggest | (none) | allow | discard | available (offline only) |
| `box.items.move` | write | `root_readwrite` | propose | move to prior folder id | planned |
| `box.collaborations.create` | write | `manage_managed_users` | require_approval | remove collaboration id | planned |
| `box.items.trash` | delete | `root_readwrite` | require_approval | restore from trash | planned |

## GitHub

This project never creates or modifies cloud repositories. GitHub is read + suggest in practice.

| Capability | Perm | Scope | Gate | Rollback | Availability |
| --- | --- | --- | --- | --- | --- |
| `github.repos.read` | read | `repo:read`, `issues:read` | allow | n/a | partial |
| `github.issues.propose` | suggest | (none) | allow | discard | available |
| `github.branches.create` | write | `contents:write` | propose | delete branch ref | planned |
| `github.pulls.create` | write | `pull_requests:write` | require_approval | close PR; notifications already sent | planned |
| `github.repos.delete` | delete | `delete_repo` | **deny** | none | unavailable |

Fine-grained PATs or a GitHub App with a repo allowlist only. Force-push, history rewrite and org
administration are denied.

## Local companion (Windows)

A user-installed Windows tray/service app. **Outbound only**: it dials the control plane over TLS,
never listens on a port, and is not remotely addressable. It operates strictly inside an explicit
folder allowlist — no globs above an allowlisted root, no wildcards, no system directories. An empty
allowlist means it does nothing. It refuses to start if the allowlist includes `C:\Windows`,
`C:\Program Files`, or a user profile root.

| Capability | Perm | Scope | Gate | Rollback | Availability |
| --- | --- | --- | --- | --- | --- |
| `local.fs.index_allowlisted` | read | `folder_allowlist:read` | allow | n/a (metadata + hashes only leave the machine) | planned |
| `local.fs.propose_cleanup` | suggest | (none) | allow | discard | planned |
| `local.fs.move_to_staging` | write | `folder_allowlist:write` | propose | move back from staging | planned |
| `local.fs.delete` | delete | (none) | **deny** | none | unavailable |
| `local.process.run_allowlisted_command` | write | `command_allowlist:execute` | require_approval | none — needs a documented compensating action first | planned |

Design details: enrollment uses a one-time operator-generated pairing code; tokens are stored in
Windows DPAPI / Credential Manager; every write capability additionally requires a **local** approval
prompt (toast + tray confirm) on the machine itself; the command allowlist is empty by default and
arbitrary shell execution is never enabled. Deletion is replaced by staging + retention.

## Mobile companion (contract only)

**A phone cannot be read by default, and this repository contains nothing that can observe a mobile
device.** Mobile participation requires all three of:

1. an **installed companion app** (user-initiated install),
2. **user-approved OS permissions**, granted per data class in OS settings and revocable at any time,
3. a **separate local authorization** step — device enrollment with a pairing code plus device
   biometric confirmation, distinct from any cloud OAuth grant.

Absent any one of these, every capability resolves to `unavailable`. The channel is
**device-initiated push only**; there is no server-to-device pull path for user data.

| Capability | Perm | Gate | Availability |
| --- | --- | --- | --- |
| `mobile.capture.push_note` | suggest | allow | planned (device-initiated) |
| `mobile.notifications.summarize_optin` | read | require_approval | unavailable (Android-only permission class; off by default) |
| `mobile.files.upload_selected` | read | require_approval | unavailable (OS document picker scope only) |
| `mobile.approvals.respond` | write | require_approval | planned (biometric per approval) |
| `mobile.device.read_arbitrary` | read | **deny** | unavailable — explicitly not offered |

iOS restricts background notification and file access far more than Android: assume less capability,
never more.

## n8n (existing self-hosted agents)

| Capability | Perm | Gate | Rollback | Availability |
| --- | --- | --- | --- | --- |
| `n8n.workflows.list` | read | allow | n/a | planned |
| `n8n.executions.read` | read | allow | n/a | planned |
| `n8n.workflows.trigger_dry_run` | suggest | propose | none needed (workflow must be declared side-effect free) | planned |
| `n8n.workflows.trigger_production` | write | require_approval | workflow-specific compensating flow, required before enabling | planned |
| `n8n.workflows.modify` | write | require_approval | restore exported workflow JSON snapshot | planned |

The fleet is a *client* of n8n, not its owner: n8n credentials stay inside n8n, and only workflows in
`workflow_allowlist` are addressable.

## OpenRouter (existing model routing)

| Capability | Perm | Gate | Notes |
| --- | --- | --- | --- |
| `openrouter.models.list` | read | allow | routing/pricing metadata |
| `openrouter.chat.completion_redacted` | suggest | propose | redacted, minimized input; per-run token cap and monthly spend cap |
| `openrouter.chat.completion_raw_content` | write | **deny** | sending unredacted personal content is denied; enabling requires an ADR |

## Adding a connector

1. Subclass `BaseConnector`; declare each `Capability` with `permission`, `scopes`, `risk_tier`,
   `reversibility`, `externally_visible`, `approval_gate`, `rollback`, `availability`.
2. Register it in `connectors/registry.py`.
3. Add config keys to `config/connectors.example.yaml` (identity + allowlist + enabled flags).
4. Add tests: the suite already asserts that every capability declares a gate and rollback, that
   externally visible capabilities are gated, and that `apply()` is unimplemented.
5. Write the rollback path **before** the forward path.
