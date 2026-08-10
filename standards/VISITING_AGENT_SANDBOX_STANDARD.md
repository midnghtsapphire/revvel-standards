# Visiting Agent Sandbox Standard

All visiting agents (OpenRouter, OpenHands, Jules, external bots) MUST operate
within an isolated sandbox to preserve auditability and prevent regressions.

## Requirements

1. **Workspace**: Each agent writes only within `.sandbox/<agent-id>/`.
2. **No secrets at import**: Modules must not read secrets on import; use env
   vars fetched inside functions and guarded by `MOCK_MODE`.
3. **Mock external services**: Stripe, Gumroad, nvidia-smi, network calls are
   mocked when `MOCK_MODE=1` (default in CI).
4. **Audit log**: Append a JSON line to `.sandbox/<agent-id>/activity.log`
   describing each run (timestamp, task, files touched).
5. **Additive only**: Do not delete or rename existing files without an
   explicit issue reference.
6. **Pinned actions**: GitHub Actions must be pinned to a full commit SHA.
7. **Least privilege**: Workflows declare `permissions: contents: read` unless
   a write scope is explicitly justified.

## Enforcement

- `zizmor` scans workflow files for unpinned actions and excessive permissions.
- `markdownlint` enforces documentation hygiene.
- Unit tests under `products/*/tests/` must pass in mock mode.
