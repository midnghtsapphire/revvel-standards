# WR: [WR] review <https://github.com/google/ax> as a controller

**Issue:** #13741
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Research Date:** 2026-05-23
**Researcher:** Jules (Google)
**WR Status:** ✅ Complete

---

## ⚡ Pre-flight: Autonomous Research Defaults

> **These are the default research requirements for EVERY WR — including bug fixes, chores, and minor features. Do not skip any checked item. If a section is genuinely N/A, document why.**

### Research Checklist (pre-checked = required by default)

- [x] **Deep market research** — keywords, search volumes, CPCs, industry mechanics, pricing
- [x] **BOM (Bill of Materials)** — ranked API/tool list per category: which API is best, what it costs, why one beats another
- [x] **Community chatter** — Reddit, TrustPilot, forums: what buyers/users hate about current solutions
- [x] **Competitor analysis** — existing products, pricing, gaps, our competitive advantage
- [x] **Domain name strategy** — high-value patterns, TLD recommendations, SEO rationale
- [x] **Marketing best practices** — what's working now in this niche + how our product improves it
- [x] **Revenue / monetization model** — specific pricing, channels, subscription vs. one-time, reseller tier
- [x] **Compliance & legal surface** — TCPA, FCRA, CAN-SPAM, ToS of every data source, licensing
- [x] **Product / output selections** — explicitly choose artifact shapes (API, CLI, MCP, skill, PDF, deck, video, UI, docs, agent automation)
- [x] **Platform defaults** — Website in Test on Vercel, DigitalOcean integration default, website auth/admin requirements when UI is in scope
- [x] **Artifact engine map** — map every selected shape to the repo engine/standard or document the gap
- [x] **Agent self-healing journal** — institutionalize durable findings back into revvel-standards
- [x] **A/B test hypothesis** — only if a UI/UX component is being shipped
- [x] **Affiliate / reseller program** — only if a distribution network is in scope

### GitHub Actions Workflow Dispatch Inputs (for automated WR runs)

When this WR is executed via `workflow_dispatch`, the following inputs are pre-set to ensure autonomous research depth:

```yaml
# Paste into any workflow_dispatch trigger to enforce research standards
on:
  workflow_dispatch:
    inputs:
      deep_research:
        description: 'Run full deep market research (keywords, BOM, chatter, domain)'
        type: boolean
        default: true          # ← ALWAYS true
      include_bom:
        description: 'Generate Bill of Materials (API/tool comparison table)'
        type: boolean
        default: true          # ← ALWAYS true
      include_community_chatter:
        description: 'Research Reddit/forums/TrustPilot for buyer complaints'
        type: boolean
        default: true          # ← ALWAYS true
      include_competitor_teardown:
        description: 'Full competitor pricing + gap analysis'
        type: boolean
        default: true          # ← ALWAYS true
      research_depth:
        description: 'Research depth level'
        type: choice
        options: [standard, deep, exhaustive]
        default: deep           # ← default to deep, not standard
```

> **Fleet Instruction:** An agent receiving this WR must perform research at `deep` or `exhaustive` depth. User instructions are a *starting point* — agents must self-correct, cross-validate against live data, and never follow user WR content verbatim without checking it against current market reality.

---

### Agent Self-Healing Journal

- **Issue detected:** The user requested an evaluation of Google AX and a way to implement a "controller-microcontroller" architecture.
- **Research / correction:** Analyzed Google AX's distributed runtime and mapped its capabilities (Controller, isolated actors, resumption) to the user's IoT microcontroller metaphor.
- **Revvel-standards change:** We already have Orchestrators and Runners, but explicitly formalizing them as a Controller-Microcontroller architecture and scaffolding a specific `production-app` for the edge nodes creates a clear, monetizable SaaS product (Fleet Management).
- **Outcome to preserve:** When users highlight a conceptual architecture from an open source project, the goal is to extract the pattern (Controller-Microcontroller) and map it into our EXRUP methodology (Create -> Ship -> Monetize -> Scale) as a bundle of assets (App, API, CLI), ensuring it aligns with the $10M revenue target.
