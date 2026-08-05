# Runtime Capability Boundary

## 1. Why this document exists

An agent fleet has two very different kinds of ability, and conflating them produces both security
mistakes and false expectations. This repository documents only the first kind.

| | **Documented runtime skills** (in scope) | **Platform-internal capabilities** (out of scope) |
| --- | --- | --- |
| Definition | Declared capabilities of this control plane and its connectors | Whatever a hosting agent platform can do internally |
| Where defined | `connectors/*.py`, `skills/*.py`, `docs/skills/manifest.yaml` | Vendor-internal; not reproduced here |
| Contract | Stable capability key, permission verb, scopes, gate, rollback, availability | No contract exposed to this repo |
| Auditable here | Yes — every use is an audit event | No |
| Policy-gated here | Yes | Not by this policy engine |

## 2. What is deliberately excluded

This repository does not contain, reproduce, or infer:

- raw internal system prompts or instruction text of any agent platform,
- actual agent memory contents or memory-store internals,
- closed or proprietary tool internals, private API shapes, or undocumented endpoints,
- secrets, tokens, cookies, session material, or private email addresses beyond the one allowlisted
  operator account,
- real user data of any kind — all fixtures are synthetic.

## 3. The boundary rule

> If a capability cannot be named as a `Capability` row with a permission verb, a least-privilege
> scope, an approval gate and a rollback, it is **not** a runtime capability of this fleet, and this
> fleet must not depend on it.

Consequences:

- A platform feature that "might" exist is treated as absent. Unknown capabilities are rejected at
  plan time (`proposal.rejected_unknown_capability`).
- Availability is expressed honestly: `available | partial | planned | unavailable`. Anything not
  proven at runtime stays `planned`/`partial`.
- Host-platform connectors may expose *less* than a provider's full API. Gmail is the canonical
  example: this repo never claims all Gmail operations are reachable.

## 4. Interface contract with a host platform

When this fleet runs inside a larger agent platform, the only supported interaction is:

1. The platform hands over **already-fetched metadata** or invokes the CLI/API.
2. The fleet returns **proposals, decisions and audit references** — never raw user content.
3. Execution, if ever enabled, happens through a declared connector capability with an approval
   token, and the platform's own internal abilities remain outside the policy engine's claims.

## 5. Memory boundary

The fleet keeps three durable artifacts only: audit chains, plans, inventories. It stores no
conversational memory, no user profile, and no embeddings. Any future memory feature must be added as
a declared capability with its own retention, redaction and deletion runbook — not as an implicit
side effect.

## 6. Reviewer checklist

- [ ] No secrets, tokens, cookies or private addresses (beyond the allowlisted operator account).
- [ ] No raw system prompts or memory contents.
- [ ] No proprietary tool internals.
- [ ] Every claimed capability has key, permission, scope, gate, rollback, availability.
- [ ] Nothing asserts a capability that has not been revalidated at runtime.
