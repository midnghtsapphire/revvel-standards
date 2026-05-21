---
project: <project-slug>
intake_id: <intake-id>
revenue_target_monthly_usd: 0
goal_phase: 1
generated_by: <engine-or-runner-id>
generated_at: <ISO-8601>
status: open # open | in_procurement | resolved
---

# Bill of Materials — <Project Title>

> Procurement BOM emitted under the rule in `docs/standards/RUNNER_TARGETS.md`.
> The orchestrator is **halted** until every `blocking: true` item is resolved.

## Summary

- **Blocks step:** `<step_id>`
- **Runner target:** `<github|vercel|supabase|zapier|make|n8n|gumloop|polar|cli|browser>`
- **Total one-time cost (USD):** $0
- **Total monthly cost (USD):** $0
- **Revenue unblocked (USD/mo):** $0

## Line Items

| # | Name | Category | Cost (USD) | Source | Acquisition | Blocking |
|---|------|----------|------------|--------|-------------|----------|
| 1 |      | credential / api / account / infra / data / service / human |  |  |  | true / false |

## Acquisition Playbook

For each blocking item, list:

### 1. <Item Name>
- **Why needed:** <what it unblocks>
- **Where to get it:** <URL>
- **Plan / SKU:** <exact tier>
- **Cost:** <one-time | monthly>
- **Steps:**
  1. ...
  2. ...
- **Owner:** <person>
- **ETA:** <date>
- **Stored at:** <secret manager path / file>

## Next Engine After Resolution

Once all blocking items resolve, route to: `<engine-id>`
