# Requirements, evidence and integration acceptance

## Upstream and existing-code observations

| Source | Verified observation | Boundary |
| --- | --- | --- |
| [octopusreview/octopus](https://github.com/octopusreview/octopus) | Default branch `master`; inspected commit `a8ad321ffd29fbe55dee89caeda0bd32c937bf59` | Pin native source, do not claim a different closed-source vendor's code is available |
| [Pinned license](https://github.com/octopusreview/octopus/blob/a8ad321ffd29fbe55dee89caeda0bd32c937bf59/LICENSE.md) | Modified MIT; preserve copyright/permission; derivatives above 10,000 MAU **or** USD 100,000 monthly revenue must prominently display **Octopus Code Review** | Not plain MIT; native UI attribution retained; monitor threshold as a DB assertion |
| [Pinned self-host compose](https://github.com/octopusreview/octopus/blob/a8ad321ffd29fbe55dee89caeda0bd32c937bf59/docker-compose.selfhost.yml) | PostgreSQL 17 and Qdrant 1.17.0 services | Review/search domains only; build native services from pinned source on owned infrastructure, do not depend on GHCR |
| Separate `revvel-skill-runner` at `4fa601c471116814f2396ff9bcec7d19dc5af54c` | Drizzle MySQL, skills/schedules/runs/error tables | Read-only investigation; no edits, no wholesale app migration |
| `scripts/local_llm.py` | Existing LM Studio/Ollama/OpenRouter cascade and exact environment cloud opt-in | Workers reuse inference clients with a stricter DB dispatch/egress gate |
| `engines/runner-orchestrator/orchestrate.js` | `buildState`, `validateState`, injectable registry, delivery channel/runner mapping | Keep existing goal/revenue contract; workers adapt owned execution rather than implement another planner |
| `products/merge-prosecutor/action/run-prosecutor.mjs` | Existing paginated GitHub API and deterministic prosecution | Reuse actual functions; API projection optional, no hosted Actions execution dependency |
| `data/subscriptions.yml`, skill/connection/label inventories | Existing sources are source assertions, not live enabled inventory | Import idempotently with source hashes; verify dated prices/entitlements before use |

Exact upstream license and compose source receipts are retained under `receipts/`.
Source hashes are computed locally; no runtime state or credentials are embedded.

## Owner-scope traceability

| Owner requirement | Contract / implementation lane | Executable or integration check |
| --- | --- | --- |
| Rich reviews, adversarial prosecution, graph/tree/map, WR/PR | Artifact/Receipt, review lane; native Octopus + Merge Prosecutor adapters | Receipt provenance and digests; lane measures actual review output and licenses |
| Preserve original work | Restricted overlay, patch-only apply, server baseline, `validate_patch` | Reject delete/wholesale replacement/path escape/strict-JSON comments; retention metadata tests |
| Governance before effectful access | Active hash/version + ack + admission + grants | Reject missing/stale ack, expired/revoked admission, tenant mismatch |
| Dynamic 0/1 switches and manual labels | `oe_resources`, routes, labels/transitions, audit/outbox | Disabled provider blocks next selection; SQL CHECK rejects 2; control tests drain/revoke races and manual release |
| One DB inventory/new agent by registration | MySQL `oe_*`, import links, relational capabilities/routes | DDL/FKs/checks plus idempotent source imports; no per-agent files |
| Offline LM Studio, CPU functional/CUDA optional | Worker ProviderAdapter; unpaid/local eligibility, no required GPU import | Pure routing negative tests; workers must exercise actual offline LM Studio with cloud blocked |
| No GitHub Actions/artifacts/GHCR/scheduler dependency | Owned HTTP/CLI/MCP, worker claims, owned artifact URIs/outbox | Integration acceptance runs with GitHub API unavailable; git publication blocks honestly |
| Paid-tool value/FOSS comparison | `oe_tool_evaluations`, value lane sourced assertions, alternatives or explicit gap | SQL rejects missing gap/alternative and undated price; no fabricated price/parity |
| Favorite integrations | Value import retains CircleCI, Jules, cubic, Bito, Cursor, RecurseML and Octopus identities/assertions | Code availability, claims, measured results and sourced prices distinguished |
| “prosection” / “deconstruct” | Prosection means adversarial prosecution; deconstruct remains an unresolved identity until source evidence | Do not invent a vendor, silently omit it, or claim execution support |
| Tenant SaaS and 200 workers | Capacity, leases/fences, composite tenant/workspace FKs, scoped grants | Tenant negative tests; actual load/chaos/security measurements needed before capacity claim |
| Permissioned desktop/phone | Workers-only paired outbound connector, owner + device approval | Reject missing confirmation/revocation/scope; lane verifies real device only with permission |
| Provenance and actual costs | proposed/executed IDs, route/model, duration/score/evidence, costs + source | Reject mismatched fence/worker/provider and evidence-free success; unknown cost stays unknown |
| Legacy BNAT integrity | Preserve static feed + epsilon, new independent DB admission | Report known=false/imprinted=false separately from consistency energy 0 |

## Production release conditions owned by integrator

Contract passing is not deployment evidence. Before enabling a tenant, control must
exercise authenticated HTTP/CLI/MCP against real MySQL with active governance,
claim/switch races, lease recovery, scoped grants and destructive patch denials.
Workers must demonstrate offline inference, bounded retries and paid egress denial
at network boundary; review must produce real native UI/graph/WR artifacts; value
must preserve canonical inventory with sourced gaps/alternatives. Device tests
need explicit owner pairing. Never replace these checks with an instruction-only
acknowledgment or in-memory success harness. No UI/browser testing is authorized
by this specialist task. Root indexes/changelog/learnings remain integrator-owned.
