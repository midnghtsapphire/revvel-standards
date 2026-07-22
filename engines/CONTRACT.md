# Engine Contract — Revvel Execution OS

> PRIME DIRECTIVE: $10k/month → $10M in 3 years.
> Every Orchestrator, Engine, and Runner exists to ship artifacts that move revenue toward this goal.

## Three-Layer Architecture

```text
┌────────────────────────────────────────────────┐
│  ORCHESTRATOR  (routes intake → engines)       │
│   - Owns state.json                            │
│   - Preserves revenue goal across all steps    │
│   - Dispatches to engines, never to runners    │
├────────────────────────────────────────────────┤
│  ENGINES  (evaluate + prepare requirements)    │
│   - Read intake / state                        │
│   - Produce artifacts OR call runners          │
│   - MUST NOT produce descriptive-only output   │
├────────────────────────────────────────────────┤
│  RUNNERS  (execute on external platforms)      │
│   - GitHub, Vercel, Supabase, Zapier, Make,    │
│     n8n, Gumloop, CLI, browser                 │
│   - On missing access → emit Procurement BOM   │
└────────────────────────────────────────────────┘
```

## Hard Rules

1. **No descriptive-only output.** An engine either produces an artifact (file, deploy, API call, ticket) or it routes to a runner.
2. **Procurement BOM rule.** If a runner cannot execute due to missing credentials, APIs, accounts, or infrastructure, it MUST emit a `BOM.md` (Bill of Materials) listing exactly what is needed, with cost, source, and acquisition steps. Vague failures are forbidden. See `docs/standards/RUNNER_TARGETS.md` for the full rule and service schema.
   - **Already-paid capacity first.** `n8n` and `gumloop` are already-paid runner capacity (operator pays ~$60/mo total). Engines MUST prefer them for automation work and MUST NOT recommend new spend to replicate capability already paid for.
   - **Free tiers / trials / token-limited plans next.** When no already-paid capacity fits, engines MUST prefer free tiers, trials, or token-limited plans and record their limits (`free_tier_limits`, `token_or_credit_limit`, `expected_usage`, `overage_risk`) in the BOM before recommending any paid upgrade (see `docs/standards/RUNNER_TARGETS.md`).
   - **Subscription gaps are recommendations, not silent failures.** When a service is missing or its current subscription/plan is insufficient, the runner MUST surface a `subscription_upgrade_recommendation` in the procurement BOM (`upgrade_or_purchase_needed` ≠ `none`, `approval_required: true`). Agents MUST NOT silently fail, assume spend, purchase, raise a tier, or change secrets — spend always requires explicit human approval.
3. **State integrity.** All state writes MUST validate against `schemas/state.schema.json`.
4. **Revenue preservation.** Every step in `state.json` must carry the `revenue_target_monthly_usd` and `goal_phase` fields from intake. The orchestrator MUST refuse work that does not declare a revenue target.
5. **Idempotency.** Engines and runners must be safe to re-run; side effects must be guarded by step IDs.

## Engine Interface

```text
Input:  { intake_id, state, env }
Output: { artifacts[], next_engine?, runner_calls[], bom?, status }
```

- `artifacts[]` — list of paths/URLs/IDs of shipped things.
- `next_engine` — engine to invoke next (set by the engine, executed by the orchestrator).
- `runner_calls[]` — runner invocations with target + payload.
- `bom` — set if procurement is required; halts the step.
- `status` — `ok | needs_procurement | failed | done`.

## Runner Interface

```text
Input:  { target, payload, credentials_ref }
Output: { result | bom, status, evidence[] }
```

- `evidence[]` — URLs, commit SHAs, run IDs proving execution.
- `bom` — required when `status = needs_procurement`.

## Forbidden Patterns

- Engines that return prose without artifacts.
- Runners that fail silently or with "please configure X" — must emit a BOM.
- State mutations that bypass the schema.
- Steps without a revenue target.
