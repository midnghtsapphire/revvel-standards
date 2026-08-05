# Security Model

## 1. Assets

1. Mailbox / calendar metadata (never bodies in this MVP).
2. File metadata across Drive, Dropbox, Box and the local companion allowlist.
3. The audit chain — its integrity is the basis for every other claim.
4. Credentials and identity bindings (held outside this repository).

## 2. What this repository must never contain

Secrets, tokens, API keys, OAuth client secrets, private email addresses other than the explicitly
allowlisted operator account, real message contents, actual agent memory contents, raw internal
system prompts, or closed/proprietary tool internals. `.gitignore` excludes `.env`, `var/`, and the
live `config/*.yaml`; only `*.example.yaml` templates are tracked. `.env.example` carries secret
*references* (`keychain://...`), never values.

## 3. Identity binding (the primary brake)

`config/identities.yaml` is an allowlist of `(identity, provider, permissions[])`. Rules:

- Every `ActionProposal` carries an `identity`. There is no ambient/default credential path.
- A non-allowlisted identity is **denied** at rule R020 before scoring is considered.
- An identity present with `allowlisted: false` is treated as explicitly forbidden — this is how you
  neutralize other accounts that happen to be signed into the same browser or OS profile.
- Permissions are separated verbs: `read`, `suggest`, `write`, `delete`, `unsubscribe`. Granting
  `read` never implies `write`. A permission not granted to the identity is denied at rule R021.
- The example configuration allowlists `angelreporters@gmail.com` with `read, suggest, write` only.
  Delete and unsubscribe are intentionally withheld, so those proposals are denied twice over
  (identity layer *and* policy layer).

## 4. Least privilege

Each connector capability declares the minimum provider scope it needs
(see [CONNECTORS.md](CONNECTORS.md)). Practical consequences:

- Prefer metadata scopes over full-content scopes; prefer `drive.file` over full-drive scopes.
- Read scopes and write scopes are requested as separate consent steps, not bundled.
- Scope escalation requires an ADR, a `CHANGELOG.md` entry, and a fresh consent screen.
- `gmail.send`, guest-visible calendar writes, sharing/collaboration links, PR creation, production
  n8n triggers and local command execution are all approval-gated capabilities.
- Repository deletion, local file deletion, arbitrary mobile device reading and sending raw content
  to a third-party model are **hard-denied**, not merely gated.

## 5. Data minimization and redaction

`audit.redact()` runs before any payload is written. Keys named `body`, `content`, `snippet`, `text`,
`html`, `message`, `token`, `access_token`, `refresh_token`, `password`, `secret`, `api_key`,
`authorization` are replaced with `redacted:sha256:<16 hex>`. Evidence stores an opaque `source_ref`
plus a digest, never the observation itself. Notes are capped at 280 characters to discourage
copying content into logs.

## 6. Threat model

| Threat | Mitigation | Residual risk |
| --- | --- | --- |
| Agent acts over the wrong signed-in account | R020/R021 identity allowlist; explicit deny rows | Operator misconfigures the allowlist |
| Runaway bulk mutation | dry-run default, per-run caps, `require_approval` on all delete/unsubscribe | Approved batch is still large — cap batch size in config |
| Irreversible external side effect (unsubscribe, email send, PR) | `externally_visible` + `irreversible` always gated; deny list for the worst cases | Human approves a bad proposal |
| Audit tampering | SHA-256 chain, append-only writes, verifier + tamper demo | Whole-file deletion — mitigate with offsite append-only copy (backlog) |
| Secret leakage into logs or docs | redaction, `.gitignore`, secret references only, capability-matrix test asserting no secret-like strings | Human pastes a secret into config |
| Local companion abused as a remote shell | outbound-only, empty command allowlist, forbidden roots, local approval prompt | Operator adds a dangerous command to the allowlist |
| Mobile over-collection | nothing readable by default; OS permission + enrollment + biometric required | Operator opts into notification forwarding |
| Third-party model retention | redacted payloads only; raw-content capability denied | Provider-side retention policy |
| Prompt injection from message content | content is never fed to a policy decision; policy is deterministic code over typed fields | Future content-reading skills must re-establish this boundary |

## 7. Prompt-injection stance

Untrusted text (email subjects, file names, issue bodies) may influence *which category a skill
suggests*, but it can never change a disposition: `policy.py` reads only typed fields
(`permission`, `risk_tier`, `reversibility`, `externally_visible`, `identity`, `capability`) and a
bounded integer heuristic. There is no path from message text to a policy override, and no natural
language is executed.

## 8. Reporting

Handle security findings privately. Do not open a public issue and do not include real message
contents, tokens, or personal addresses in a report; reference audit `event_id` / `evidence_id`
values instead. See the repository-root [../SECURITY.md](../SECURITY.md) for the reporting workflow.
