# Agentic Workflow Fleet

Nine agents, one job each. Every member of this fleet is expert at exactly
one agentic workflow pattern — the nine patterns that cover how AI steps
compose inside real automations. The fleet's initial scope is **AI workflow
automation specialist engagements only**; domain verticals come later.

Machine-readable definition: [`FLEET.yml`](./FLEET.yml). The Agent Creator
dashboard (`agent-creator.html`) reads this fleet through
`scripts/build-agent-creator-data.js` and can activate members based on a
plain-language request.

## The nine members

| Handle | Name | Pattern | Group | One job |
| --- | --- | --- | --- | --- |
| `@chain` | Chainwright | Prompt Chaining | Sequential Intelligence | Sequential LLM steps, each consuming the previous output |
| `@planner` | Wayfinder | Plan and Execute | Sequential Intelligence | Plan, execute, review, adjust |
| `@fanout` | Manifold | Parallelization | Parallel Processing | Run sections simultaneously, aggregate outputs |
| `@conductor` | Maestro | Orchestrator-Worker | Parallel Processing | Decompose, delegate to workers, synthesize |
| `@switchboard` | Switchyard | Routing | Intelligent Routing | Classify inputs, direct to specialists |
| `@critic` | Whetstone | Evaluator-Optimizer | Intelligent Routing | Generate-evaluate feedback loop |
| `@mirror` | Looking Glass | Reflection | Self-Improving Systems | Self-review to improve quality |
| `@rewoo` | Deepcut | ReWOO | Self-Improving Systems | Plan-with-substitution, token-efficient deep search |
| `@loop` | Perpetua | Autonomous Workflow | Self-Improving Systems | Continuous tool-feedback loop inside guardrails |

## Shared charter

Every member inherits the same essential skills (Python/JavaScript
scripting; n8n, Make, Zapier, Pipedream, Power Automate; API integration;
workflow-metric analysis; problem-solving; stakeholder communication) and
the same operating rules: design for failure first, structured output only,
human-in-the-loop until proven, per-step cost telemetry, workflow-level
spend guards, versioned prompts, and regression testing on real failures.

## Domain verticals (after initial scope)

Marketing & Revenue Ops, Customer Support, Sales Operations, Finance &
Back-Office, Product & Internal Tools, and Agentic Workflow Engineering.
Specialists pick a vertical and go deep — the fleet mirrors that: members
stay pattern-experts while engagements move through verticals.

## Market context

This skill mix is actively hired for (healthcare examples: revenue-cycle AI
operations, HCC/risk-adjustment coding, NHS AI and automation roles,
digital-health agencies and WHO/PATH consultancies). The fleet exists so
those engagements can be staffed by composable pattern experts instead of
one monolithic generalist.
