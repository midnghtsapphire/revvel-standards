# [WR] Review-tool cost consolidation — keep the best, cut the rest

## Output Type

project-management-doc

## Objective

The code-review fleet is excellent but several members are PAID external
apps (Octopus Review — currently quota-dead, Bito, RecurseML, CodeRabbit,
Mabl — paused). Consolidate:

1. Inventory every review tool: cost/month, what it uniquely catches
   (sample last 50 PRs), overlap with the others and with our own `review`
   profile lane (Opus 4.7 / DeepSeek via OpenRouter — ~API cost only).
2. Score per tool: unique catches per dollar. The scorecard machinery
   (scripts/agent-scorecard/) already exists — extend it to reviewers.
3. Recommend keep/cut/replace; where "replace," the self-hosted fallback
   lane (pending WR 07) or Qodo PR-Agent on OpenRouter takes over.
4. Update docs/TOOL_COST_INDEX.md and the ADHD rule: one bill, one place —
   prefer tools that ride the OpenRouter key.

## Definition of Done

- Cost/catch table for all reviewers over a 50-PR sample
- Owner decision recorded per tool (keep/cut/replace) in DECISIONS.md
- TOOL_COST_INDEX.md updated; cancelled tools' workflows disabled cleanly
