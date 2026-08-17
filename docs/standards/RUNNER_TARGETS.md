# Standard: Runner Targets & Procurement BOM Rule

> Status: **MANDATORY**
> Owners: Execution OS / Runner Orchestrator

## Purpose

Define the closed set of execution surfaces ("runner targets") that Revvel engines may dispatch to, and the **Procurement BOM rule** that prevents vague failures.

## Approved Runner Targets

| Target     | Purpose                                | Typical Artifact            |
|------------|----------------------------------------|-----------------------------|
| `github`   | Repos, PRs, Issues, Actions, Releases  | commit SHA, PR URL          |
| `vercel`   | Web deploys, edge functions            | deployment URL              |
| `supabase` | Postgres, auth, storage, edge fns      | project ref, table name     |
| `zapier`   | Cross-SaaS automation                  | Zap URL, run ID             |
| `make`     | Visual workflow automation             | scenario URL                |
| `n8n`      | Self-hosted workflow automation        | workflow ID                 |
| `gumloop`  | AI workflow automation                 | flow URL                    |
| `polar`    | GitHub funding / monetization          | product URL, checkout URL   |
| `cli`      | Local shell execution                  | exit code, stdout           |
| `browser`  | Headless/manual browser ops            | screenshot, URL             |

Any dispatch to a target outside this list MUST be rejected by the orchestrator.

### Already-Paid Runner Capacity

Some runner targets are **already-paid capacity**: the operator maintains an
active paid subscription, so the engine should treat them as available execution
surface and dispatch to them **before** recommending any new spend.

| Target     | `already_paid_runner_capacity` | Notes                                                              |
|------------|--------------------------------|--------------------------------------------------------------------|
| `n8n`      | `true`                         | Covered under the operator's ~$60/mo n8n + Gumloop subscriptions.  |
| `gumloop`  | `true`                         | Covered under the operator's ~$60/mo n8n + Gumloop subscriptions.  |

- The operator currently pays **~$60/month total** for **n8n** and **Gumloop**.
  Engines MUST design workflows and BOMs assuming this capacity already exists
  and incurs **no incremental cost** to use within the existing plan limits.
- Treat n8n and Gumloop as the **default automation runners** for new workflow
  designs unless a documented capability gap requires another target.
- Using already-paid capacity is **never** a `needs_procurement` event by itself.
  A BOM is only emitted when the existing plan's limits, capabilities, or
  credentials are genuinely insufficient (see Procurement Policy below).

## Procurement Policy — Existing Capacity First

> The operator can buy APIs or raise subscription tiers when warranted, but
> **agents MUST justify spend through a BOM / procurement recommendation and
> MUST NOT assume or execute spend without explicit human approval.**

1. **Prefer existing paid capacity first.** If n8n or Gumloop (or any other
   already-provisioned target) can do the job within current plan limits, use it.
   Do not recommend new spend to replicate capability you already pay for.
2. **Prefer free tiers, trials, and token-limited plans next.** Most tools and
   APIs offer a free tier with token/usage limits or a time-limited trial. When
   no already-paid capacity fits, agents MUST check for and prefer these
   no-cost options first when practical, and **record their limits in the BOM**
   (free-tier quotas, token/credit caps, trial expiry). Operating within a free
   tier or trial is **never** a `needs_procurement` event by itself.
3. **Recommend a paid upgrade only when:**
   - **expected usage exceeds** the free-tier / trial / token-or-credit limits, or
   - it provides a **unique capability** not available on existing or free capacity, or
   - it **saves meaningful time** versus the already-paid or free path, or
   - **reliability, quality, or compliance** materially requires it, or
   - **project goals** (e.g. a revenue-phase target) justify the spend.
4. **Always produce a BOM** for any recommended spend, and **require explicit
   human approval before any spend.** Agents never authenticate live paid
   services, purchase, raise a subscription tier, or change secrets on their own
   authority — those are **advisory recommendations** until a human approves.

## Procurement BOM Rule (MANDATORY)

When a runner cannot execute because it lacks credentials, API access, an account, infrastructure, data, or a human-in-the-loop action, it **MUST**:

1. Set step status to `needs_procurement`.
2. Emit a `BOM.md` at `docs/projects/<project>/BOM.md` using `BOM_TEMPLATE.md`.
3. Populate the `bom` field in `state.json` (see `schemas/state.schema.json`).
4. Halt the orchestrator until procurement is resolved.

### What a BOM Must Contain

Each line item:
- **Name** — exact thing needed (e.g., "Twilio API key", "LLC EIN", "$50 Meta Ads credit").
- **Category** — `credential | api | account | infra | data | service | human`.
- **Cost (USD)** — one-time or monthly; `0` if free.
- **Source** — vendor URL or supplier.
- **Acquisition** — exact steps to acquire (links, form names, who signs).
- **Blocking** — `true` if execution cannot continue without it.

## Forbidden

- "Configure your environment variables." → **Reject.** Emit a BOM line per missing var.
- "Set up the database." → **Reject.** Emit BOM with provider, plan, cost, and SQL bootstrap path.
- "You'll need an API key." → **Reject.** Name the vendor, plan, URL, cost.

### Procurement BOM — Service Schema (Subscriptions & APIs)

For procurement decisions about paid services, APIs, and subscription tiers,
each BOM service entry uses the following fields. This is **advisory data for a
human approver**; emitting it never triggers spend.

| Field                         | Meaning                                                                 |
|-------------------------------|-------------------------------------------------------------------------|
| `service`                     | The service / API / subscription (e.g. `n8n`, `gumloop`, `twilio`).     |
| `current_status`              | `already_paid` \| `free_tier` \| `trial` \| `not_subscribed` \| `unknown`. |
| `current_monthly_cost_if_known` | Known monthly spend in USD, or `unknown`.                             |
| `free_tier_available`         | `true` \| `false` \| `unknown` — does the service offer a free tier?    |
| `free_tier_limits`            | The free-tier quotas/limits (requests, rows, seats, etc.), or `unknown`. |
| `trial_available`             | `true` \| `false` \| `unknown` — is a time-limited free trial offered?  |
| `expected_usage`              | Projected usage for `needed_for` (volume/tokens/runs), to compare against limits. |
| `upgrade_trigger`             | What would force a paid upgrade: `usage_exceeds_limits` \| `capability_gap` \| `reliability` \| `compliance` \| `goal_justified` \| `none`. |
| `token_or_credit_limit`       | Free-tier/trial token or credit cap (e.g. `200k tokens/mo`), or `none`/`unknown`. |
| `overage_risk`                | `low` \| `medium` \| `high` — likelihood expected usage breaches the free/trial limit. |
| `needed_for`                  | The step / capability / revenue target this unblocks.                   |
| `upgrade_or_purchase_needed`  | `none` \| `new_subscription` \| `tier_upgrade` \| `api_purchase`.       |
| `reason`                      | Why spend is justified: unique capability / time saved / reliability / compliance / revenue. |
| `expected_benefit`            | Concrete expected outcome (time saved, reliability gain, revenue unblocked). |
| `approval_required`           | Always `true` for any non-zero or tier-changing spend.                  |
| `credential_store`            | Where the credential would live once approved (secret manager path). Never a literal secret. |

Example (advisory only — no spend executed):

```yaml
procurement_bom:
  - service: n8n
    current_status: already_paid
    current_monthly_cost_if_known: "~$30 (part of ~$60/mo n8n+Gumloop)"
    needed_for: "lead-intake workflow dispatch"
    upgrade_or_purchase_needed: none
    reason: "Existing paid capacity covers this workflow within plan limits."
    expected_benefit: "No incremental cost; reuses already-paid runner."
    approval_required: false
    credential_store: "secrets://n8n/api_key"
  - service: some_ai_api
    current_status: free_tier
    current_monthly_cost_if_known: "$0 (free tier)"
    free_tier_available: true
    free_tier_limits: "200k tokens/mo, 60 req/min"
    trial_available: false
    expected_usage: "~120k tokens/mo for enrichment step"
    upgrade_trigger: none
    token_or_credit_limit: "200k tokens/mo"
    overage_risk: low
    needed_for: "lead enrichment summaries"
    upgrade_or_purchase_needed: none
    reason: "Free tier covers projected usage within token limit; no spend needed."
    expected_benefit: "Capability at $0 within free-tier limits."
    approval_required: false
    credential_store: "secrets://some_ai_api/key"
  - service: gumloop
    current_status: already_paid
    current_monthly_cost_if_known: "~$30 (part of ~$60/mo n8n+Gumloop)"
    free_tier_available: false
    free_tier_limits: "n/a (already on paid plan)"
    trial_available: false
    expected_usage: "projected volume exceeds current tier run quota"
    upgrade_trigger: usage_exceeds_limits
    token_or_credit_limit: none
    overage_risk: high
    needed_for: "AI enrichment step"
    upgrade_or_purchase_needed: tier_upgrade
    reason: "Current tier's monthly run quota is insufficient for projected volume; upgrade improves reliability at scale."
    expected_benefit: "Removes run-quota throttling that would stall the revenue loop."
    approval_required: true
    credential_store: "secrets://gumloop/api_key"
```

When `upgrade_or_purchase_needed` is anything other than `none`, the entry is a
`subscription_upgrade_recommendation` requiring human approval — it is **never**
executed automatically and **never** a silent failure.

## Enforcement

- CI MUST validate that any step with status `needs_procurement` has a non-null `bom_ref` pointing to a file matching `BOM_TEMPLATE.md` structure.
- PRs that introduce engines or runners without honoring this rule MUST be blocked.
- Recommendations that involve spend MUST carry `approval_required: true` and MUST NOT be acted on by an agent without a human approval.

## Revenue Anchor

Every BOM MUST cite the `revenue_target_monthly_usd` it unblocks. Procurement that does not move us toward **$10k → $30k → $100k → $10M** is deferred.
