# Security Policy

## Scope

This repository is a control plane MVP that cannot mutate any external service. The security-relevant
assets are the audit chain's integrity, the identity allowlist, and the absence of secrets.

## Reporting

Report privately to the repository owner (see `CODEOWNERS`). Do **not** open a public issue.

Include: the affected file/rule/capability, reproduction steps, and impact. Reference audit
`event_id` / `evidence_id` values instead of pasting content. **Never include** tokens, credentials,
real message contents, or personal email addresses in a report.

## Handling

| Severity | Example | Target response |
| --- | --- | --- |
| Critical | Policy bypass allowing an ungated mutating action; secret committed | Immediate: revert, rotate, set `review_everything` |
| High | Identity binding defect; audit chain verification defect | Same day |
| Medium | Missing gate on a planned capability; doc overstating availability | Next change window |
| Low | Hardening suggestion | Backlog |

## Committed-secret procedure

1. Rotate the credential immediately — assume disclosure.
2. Remove it from the working tree and add the pattern to `.gitignore`.
3. Purge history if the repository was ever shared.
4. File an incident note per `docs/runbooks/incident-unexpected-action.md`.

## Hard security invariants

- No network calls in `src/`; `apply()` unimplemented.
- Default autonomy `review_everything`; delete/unsubscribe always human-gated.
- Externally visible, irreversible, or high-risk actions always require approval.
- Only allowlisted identities are addressable (rules R020/R021).
- Hard-denied: repository deletion, local file deletion, arbitrary mobile device reading, sending raw
  personal content to a third-party model.
- Audit log append-only and SHA-256 hash-chained; content and secret-like keys redacted before write.

Full threat model: [docs/SECURITY.md](docs/SECURITY.md).
