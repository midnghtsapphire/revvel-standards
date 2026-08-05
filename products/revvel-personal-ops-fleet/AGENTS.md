# AGENTS.md — Operating protocol

Read this before making any change in this repository. It applies to human and agent contributors
equally.

## 1. Prime directives

1. **Propose, never execute.** Skills emit `ActionProposal` objects. No skill, connector, or script
   may perform an external mutation. `apply()` stays unimplemented until an ADR says otherwise.
2. **No secrets, ever.** No tokens, keys, cookies, session material, private email addresses (beyond
   the allowlisted operator account), real message contents, agent memory contents, raw internal
   system prompts, or proprietary tool internals — not in code, docs, fixtures, tests, or commits.
3. **Reversible first.** Prefer label > archive > trash > permanent (never). Prefer staging over local
   delete, draft over send. If you cannot state the rollback in one sentence, do not build the action.
4. **Fail closed.** Unknown capability, unknown identity, missing rollback, expired approval →
   deny or require approval. Never default to permissive.
5. **Everything is audited.** Any new decision point appends an event to the chain before acting.
6. **Statuses are hints.** Connector state recorded anywhere here is a labeled sample and must be
   revalidated at runtime. Never auto-retrigger an authorization the operator dismissed.

## 2. Workflow for any change

1. State the intent and the affected safety property.
2. If it changes policy, scopes, autonomy behavior, or the audit format → write an ADR in
   `docs/adr/` first.
3. Write a failing test, then the code.
4. Run `make test` and `make demo`. Both must pass offline.
5. If a persisted object changed → `make schemas` and bump `schema_version`.
6. Update the relevant doc(s) and `CHANGELOG.md` in the same commit.

## 3. Definition of done

- [ ] Tests pass (`make test`), demo runs (`make demo`), chain verifies (`revvel-ops verify-audit`).
- [ ] No network call added anywhere in `src/`.
- [ ] New capability declares key, permission verb, least-privilege scopes, risk tier, reversibility,
      external visibility, approval gate, rollback, availability.
- [ ] New mutating path has a rollback documented in `docs/runbooks/rollback.md`.
- [ ] Docs, schemas, changelog and ownership updated.
- [ ] No secret-like string, no real user data, no proprietary internals.

## 4. Boundaries you must not cross

- Do not create or modify cloud repositories, or mutate any external service.
- Do not add a capability that reads an entire mailbox, an entire drive, or an entire device.
- Do not remove a capability from `deny_capabilities` without an ADR.
- Do not lower `allow_min_confidence` below 90 without an ADR.
- Do not widen the local companion allowlist to a profile or system root.
- Do not claim a capability exists before it has been revalidated at runtime.
- Do not send unredacted personal content to any third-party model.

## 5. Evidence discipline

Every proposal carries evidence: connector, opaque `source_ref`, signal name, SHA-256 digest, short
note (≤280 chars). Evidence must justify the summary. Never paste content into evidence, logs, issues,
or postmortems — reference `evidence_id` / `event_id` instead.

## 6. Escalating autonomy

Only via the ladder in `docs/OPERATIONS.md` §4: prove in `review_everything`, then allowlist one
reversible internal-only capability into `safe_automation`, measure, then consider thresholds. Delete,
unsubscribe, send, share and PR creation are never automated.

## 7. Where to look

`docs/ARCHITECTURE.md` (how it fits together) · `docs/POLICY.md` (rules R000-R100) ·
`docs/SECURITY.md` (threat model) · `docs/CONNECTORS.md` (capability contracts) ·
`docs/INTERNAL_CAPABILITIES_BOUNDARY.md` (what is deliberately out of scope) ·
`docs/runbooks/` (procedures) · `docs/IMPLEMENTATION_BACKLOG.md` (what is next and what is missing).
