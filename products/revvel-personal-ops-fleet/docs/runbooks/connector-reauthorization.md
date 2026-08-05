# Runbook — Connector reauthorization and revalidation

Recorded statuses are **samples**. Revalidate before every planning session.

## Revalidation (per connector, per session)

1. Confirm the identity is allowlisted for the needed permission verb (`revvel-ops identities`).
2. Confirm the connector is enabled and, for file connectors, that its folder/path allowlist is
   non-empty. **Authorization is not access.**
3. Perform the cheapest possible read (list one item's metadata) to prove the scope is live.
4. Record the outcome. On failure, mark the connector `requires_reauthorization` and stop planning
   for it.

## Reauthorization (when a scope has lapsed)

1. Reauthorize interactively, as the operator, for the **same** allowlisted identity — never a
   different signed-in account.
2. Request only the scopes the capabilities in use require. If new scopes are needed, file an ADR and
   a `CHANGELOG.md` entry first.
3. Re-run revalidation, then run `revvel-ops inventory --demo` and reconcile the sample state.
4. Update `config/connectors.example.yaml`, `inventory.SAMPLE_STATUS` and the status change log in
   `docs/INVENTORY_AND_CONSOLIDATION.md` together; run `make test`.

## Current sample state notes

- **Google Drive — authorized, ready to revalidate.** Authorization succeeded. Treat it as
  ready-to-revalidate rather than proven: run the metadata probe, and add explicit folders to
  `folder_allowlist` (still empty) before any Drive proposal can be planned. Keep `drive.file` /
  metadata-readonly scopes; do not request full-drive scopes.
- **Box — disabled by operator choice.** Authorization was dismissed. **Do not retrigger Box
  authorization.** `never_prompt_for_auth: true` is set in the example config, Box capabilities
  resolve to `unavailable`, and reconnect is operator-initiated only. If the operator later chooses to
  reconnect, follow the reauthorization steps above and update the status change log.

## Anti-patterns

- Auto-retriggering a consent screen the operator dismissed.
- Reauthorizing while a different account is the active browser session.
- Treating `connected` as permission to write, delete or unsubscribe.
- Bundling read and write scopes into one consent step.
