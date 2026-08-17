---
# Extended Revvel intake template (additive sibling of TEMPLATE.md).
# TEMPLATE.md remains the canonical minimal intake; this adds the full
# project-shape frontmatter the engine spine can route on. Preserve goals exactly.
intake_id:
received_at:
source:
status: new # new | triaged | routed | archived
priority: P2 # P0 | P1 | P2 | P3

# --- Goals / revenue (orchestrator-owned; never overwrite real goal values) ---
revenue_target_monthly_usd: 0
goal_phase: 1 # 1=$10k, 2=$30k, 3=$100k, 4=$10M
goals: [] # additive references only, e.g. ["GOAL.md#phase-1"]

# --- Project shape ---
project_class: product # product | automation | job_task | research | internal-tool
output_type: # sellable-pdf | production-app | api-product | cli-product | mcp-product | technical-documentation | internal-script-automation
delivery_mode: ship-to-market # ship-to-market | internal | client-handoff
lifecycle_mode: build # build | maintain | iterate | archive
visibility: private # private | public | unlisted

# --- Resourcing ---
budget:
  one_time_usd: 0
  monthly_usd: 0
tools: [] # e.g. [openrouter, supabase, vercel, zapier]
compliance: [] # e.g. [tcpa, gdpr, ccpa, e-sign]
deployment: # github | vercel | supabase | firebase | cli | browser
  runner_target:
  url:

owner:
route_to_engine:
---

# Intake: <title>

## Problem / Opportunity
<one paragraph>

## Hypothesis
<measurable claim>

## Desired Outcome
- Revenue impact (USD/month):
- Time-to-ship target:
- Success metric:

## Constraints / Known Gaps
- Credentials missing:
- APIs missing:
- Infra missing:

## Routing Hint
Suggested engine: <engine-id>
Suggested runner target: <github|vercel|supabase|firebase|zapier|make|n8n|gumloop|cli|browser>

## Notes
<freeform>
