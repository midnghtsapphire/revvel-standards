# Implementation Backlog

Ordered. Each item has an exit criterion. Nothing moves forward until the previous safety property
holds. Estimates are relative sizes (S/M/L), not dates.

## Phase 0 — shipped in this MVP

| # | Item | Exit criterion |
| --- | --- | --- |
| 0.1 | Domain models + JSON Schemas | `make schemas` reproduces `schemas/*.json`; models tested |
| 0.2 | Policy engine with 0-100 scoring and 4 dispositions | Rule table R000-R100 implemented and unit-tested |
| 0.3 | Append-only SHA-256 hash-chained audit log | `verify_chain` passes; tamper demo flips to `False` |
| 0.4 | Email cleanup skill (categorize/label/archive/unsubscribe/trash) | 23 proposals from 10 fixtures, all with evidence |
| 0.5 | CLI (`doctor`, `identities`, `connectors`, `inventory`, `plan`, `dry-run`, `verify-audit`, `apply`-blocked) | `make demo` runs offline |
| 0.6 | Ten connector skeletons with scopes/gates/rollback | Registry test asserts contract completeness |
| 0.7 | Identity allowlist with separated permission verbs | Non-allowlisted identity denied end-to-end |
| 0.8 | Docs, ADRs, runbooks, handbook PDF | Present and consistent with code |

## Phase 1 — read-only reality (M)

| # | Item | Exit criterion |
| --- | --- | --- |
| 1.1 | Runtime revalidation probe per connector | One cheap read proves each scope; result recorded as an audit event |
| 1.2 | Gmail metadata ingestion replacing fixtures | Plans built from live metadata with content never loaded |
| 1.3 | Drive read under a non-empty folder allowlist | Metadata list succeeds within allowlist; nothing outside is visible |
| 1.4 | Secret handling via OS keychain references | No secret material in files or logs; `.env` holds references only |
| 1.5 | Approval queue persistence + expiry sweep | Expired decisions are re-scored, never revived |

## Phase 2 — first reversible automation (M)

| # | Item | Exit criterion |
| --- | --- | --- |
| 2.1 | `gmail.labels.apply` live adapter + rollback | Label snapshot captured before write; rollback restores exactly |
| 2.2 | Promote label-apply to `safe_automation` | Two weeks of clean `review_everything` history first; ADR filed |
| 2.3 | Per-run batch caps and rate limiting | A single run cannot exceed configured item/rate caps |
| 2.4 | Archive adapter (`gmail.threads.archive`) | Rollback re-adds `INBOX`; verified on a test thread |

## Phase 3 — companions (L)

| # | Item | Exit criterion |
| --- | --- | --- |
| 3.1 | Windows companion: enrollment + outbound channel | Pairing code flow; token in DPAPI; no inbound listener |
| 3.2 | Folder allowlist enforcement + forbidden roots | Companion refuses to start on system/profile roots |
| 3.3 | Metadata indexing + staging move with local approval prompt | Toast/tray confirm required per write; move is reversible |
| 3.4 | Mobile companion: enrollment + approval responses | Biometric per approval; no device data pulled |

## Phase 4 — integration breadth (M)

| # | Item | Exit criterion |
| --- | --- | --- |
| 4.1 | n8n workflow registry + dry-run trigger | Only allowlisted, side-effect-free workflows triggerable |
| 4.2 | OpenRouter redacted reasoning with spend cap | Redaction profile enforced; monthly cap honored; raw-content path still denied |
| 4.3 | GitHub read + issue drafting | Proposals only; no repository is created or modified |
| 4.4 | Dropbox dedupe proposals | Hash-based duplicates surfaced with rollback paths |

## Phase 5 — assurance hardening (M)

| # | Item | Exit criterion |
| --- | --- | --- |
| 5.1 | External signer over `event_hash` | `signature`/`signer_key_id` populated; verifier checks signatures |
| 5.2 | Offsite append-only audit replication | Whole-file deletion is detectable |
| 5.3 | API authentication + localhost binding enforcement | No unauthenticated route beyond `/healthz` |
| 5.4 | Multi-approver policy + approval delegation | Two-person rule available for critical capabilities |
| 5.5 | Property-based tests over the policy engine | No generated proposal reaches `allow` while high-risk/external/irreversible |

## Known limitations of this MVP

1. `apply` is not implemented anywhere; the fleet cannot execute a single external action.
2. All connectors are skeletons — no client libraries, no auth flows, no retry/rate-limit logic.
3. Signing is not implemented; integrity rests on SHA-256 chaining plus filesystem controls.
4. The approval queue is a JSON file reviewed by hand; there is no UI and no notification path.
5. Companion apps (Windows, mobile) are designs and contracts only — no binaries exist.
6. The API has no authentication; it must stay bound to localhost.
7. Categorization is deliberately rule-based, so nuanced misclassification is expected; it is
   reproducible and auditable rather than clever.
8. Connector statuses recorded in docs/fixtures are samples requiring runtime revalidation.
9. Retention/rotation of `var/` is manual.
10. Single-operator assumption throughout.
