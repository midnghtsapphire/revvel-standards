# Revvel Operating Model

The Revvel operating model is a trusted, GitHub-centered system for research, viability scoring, routing, delivery, marketing automation, legacy product refresh, and invention flow.

The system does **not** auto-build every idea. It researches first, scores it, and only builds when it passes the gate.

---

## 0. Principles

1. GitHub is the source of truth for execution, intake, routing, scoring, status, and audit trail.
2. Notion is the connected knowledge layer for docs, invention notes, SOPs, research summaries, and context.
3. Deepresearch means aggressive current-state research; it does **not** mean automatic build approval.
4. Every request must pass through:
   - intake
   - viability gate
   - routing
   - delivery mode decision
   - deployment / launch gating
5. The system must be able to reject, hold, or archive ideas that are not worth building.
6. The system supports these output types:
   - production-app
   - desktop-tool
   - sellable-pdf
   - technical-documentation
   - client-code-task
   - project-management-doc
   - internal-script-automation
   - cli-product
   - mcp-product
   - api-product
   - invention-flow

---

## 1. Intake

Work requests for the operating model are filed through the [`Devin Work Request`](../.github/ISSUE_TEMPLATE/devin-work-request.yml) issue form. The legacy [`Issue (Jules / triage)`](../.github/ISSUE_TEMPLATE/issue.yml) form is retained for the existing Jules deep-research path; both share the `[WR]` title prefix so downstream automation (`wr-pr-creation.yml`, `jules-invoke.yml`) handles either source.

Required fields (intake will reject the form if any are blank):

- OUTPUT_TYPE
- RESEARCH_MODE
- DELIVERY_MODE
- ITERATION_MODE
- LIFECYCLE_MODE
- COMMERCIAL_MODE
- DEPLOYMENT_TARGET
- Launch Priority
- High-level goal
- Problem to solve
- Success definition

Optional fields:

- Constraints and must-haves
- Existing assets / repos / links
- Cutting-edge notes

Field semantics:

- **RESEARCH_MODE** controls research depth only. It does not change the deliverable.
- **OUTPUT_TYPE** is the hard constraint on the final deliverable.
- **DELIVERY_MODE** controls whether Devin proposes first or builds immediately.
- **ITERATION_MODE = single-pass** means do not expand into multi-stage roadmaps unless blocked.
- **LIFECYCLE_MODE = refresh-existing** means audit first before proposing rebuilds.

---

## 2. Viability Gate

Before any implementation begins, every request goes through a viability scoring pass using [`templates/viability-gate-template.md`](../templates/viability-gate-template.md).

Research:

- current market
- competitors
- substitutes
- existing tooling
- latest APIs / agents / automation options
- monetization paths
- implementation effort
- strategic relevance to the broader ecosystem

Score 1–5 on:

- Problem Pain
- Market Value
- Differentiation
- Build Leverage
- Monetization Fit
- Strategic Fit

Decision thresholds:

| Total score | Decision                       |
| ----------- | ------------------------------ |
| 24–30       | BUILD                          |
| 16–23       | HOLD / NEEDS SHARPENING        |
| Below 16    | ARCHIVE / DO NOT BUILD         |

Rules:

- If `HOLD` or `ARCHIVE`, do not build unless explicitly instructed.
- If `RESEARCH_MODE = deepresearch`, include latest relevant tools, APIs, and workflows available today.
- Output a concise rationale explaining why the project should or should not move forward.

---

## 3. GitHub Project

A single GitHub Project (https://github.com/users/midnghtsapphire/projects/5) tracks every work request. The full field schema and lifecycle are documented in [`docs/github-project-schema.md`](./github-project-schema.md).

Status lifecycle:

```
Inbox → Researching → Scored → { Hold | Archived | Approved → In Build → In Review → Ready to Launch → Launched → Measuring }
```

---

## 4. Router Logic

Routing decisions live in [`promptforproject.md`](../promptforproject.md) **Step 0** — every request is routed before any work begins.

The full ruleset is documented there. Summary:

- `RESEARCH_MODE` never overrides `OUTPUT_TYPE`.
- `OUTPUT_TYPE = cli-product` does **not** become a web app.
- `OUTPUT_TYPE = mcp-product` optimizes for tool definitions, schema quality, packaging, docs, and selective tool exposure.
- `OUTPUT_TYPE = api-product` optimizes for endpoints, auth, schemas, pricing, docs, SDK readiness, and hosting.
- `OUTPUT_TYPE = sellable-pdf` optimizes for document quality, clarity, conversion, and monetizable packaging — no app unless explicitly requested.
- `OUTPUT_TYPE = invention-flow` does not jump to build; follow [`templates/invention-flow-template.md`](../templates/invention-flow-template.md) first.
- `LIFECYCLE_MODE = refresh-existing` runs the [`legacy refresh checklist`](../templates/legacy-refresh-checklist.md) before proposing rebuilds.
- `DELIVERY_MODE = proposal-first` stops after proposal.
- `DELIVERY_MODE = build-with-brief-options` provides 1–2 concise options then implements.
- `DELIVERY_MODE = build-direct` implements immediately after viability passes.

---

## 5. Invention Flow

When `OUTPUT_TYPE = invention-flow`, follow [`templates/invention-flow-template.md`](../templates/invention-flow-template.md):

1. Problem framing
2. Novelty / prior-art-adjacent scan
3. Market viability
4. Protection strategy discussion
5. Prototype recommendation
6. Commercialization path recommendation
7. Build recommendation only after the above

Possible prototype outcomes: sellable PDF, mockup, landing page, API, CLI, MCP, internal research brief, patent / provisional support doc, desktop tool concept.

Rules:

- Do not treat inventions as generic app ideas.
- Call out public-disclosure risk when appropriate.
- Highlight whether trade secret, licensing, or productization is the better path.

---

## 6. Legacy Product Refresh Flow

For `LIFECYCLE_MODE = refresh-existing`, follow [`templates/legacy-refresh-checklist.md`](../templates/legacy-refresh-checklist.md):

1. Audit current state of repo / package / docs / market relevance
2. Identify outdated dependencies, assumptions, positioning, and missing features
3. Re-run the viability gate under current market conditions
4. Decide: refresh and relaunch / narrow and reposition / archive
5. If refreshing: update docs, packaging, pricing / offer structure, distribution plan, and launch content

Apply this especially to: old MCPs, old APIs, old CLIs, invention concepts older than 3–6 months.

---

## 7. Notion Knowledge Layer

Notion is the connected documentation system for the operating model. The full database structure is documented in [`docs/notion-structure.md`](./notion-structure.md).

GitHub remains the source of truth for build-state. Notion remains the source of truth for connected knowledge and context.

---

## 8. Marketing Automation Layer

The PR-to-social marketing pipeline triggers **only after launch gating** is in place. Marketing automation triggers when:

- `Decision` = `BUILD`
- `Status` ∈ { `Ready to Launch`, `Launched` }
- `Marketing Ready` = `Yes`
- `Launch Channel` ≠ `None`
- Approver is assigned

Launch qualification rules: strategic relevance, commercial relevance, audience relevance, readiness of message.

Recommended stack:

- Make.com as primary orchestrator
- OpenAI for text and image generation
- Airtable or Google Sheets for approval staging
- Slack for approvals
- Cloudinary or S3 for hosted images
- LinkedIn / Instagram native-compatible flow where available
- X via direct API or intermediary depending on budget
- Looker Studio, Airtable interfaces, or a dashboard app for reporting

---

## 9. Deployment Order (Stages)

Execute in this order:

### Stage A — Control plane

- Implement issue form
- Implement project fields
- Implement viability gate
- Implement prompt router

### Stage B — Work routing

- Add workflow handling for: app, desktop, PDF, docs, CLI, MCP, API, invention, client work

### Stage C — Knowledge layer

- Build Notion databases and linking conventions
- Document SOPs and decision records

### Stage D — Legacy refresh

- Select 3 existing MCP / API / CLI assets
- Run the refresh-existing flow
- Score and route each one

### Stage E — Marketing activation

- Activate launch gating
- Implement PR-to-social automation
- Add approval and analytics loop

### Stage F — Portfolio review loop

- Monthly review of: scored-but-held items, archived ideas worth revisiting, launched items and performance, inventions needing next-step decision

---

## 10. Naming

`gatekeeper-cli` is a credentials/secrets management tool and the name is reserved for that domain. The broader operating-model components have their own names:

- `secrets-cli` / `credential-gateway` — credentials, tokens, Doppler, GitHub secret sync
- `project-router` — output-type and delivery routing
- `viability-gate` — build / hold / archive scoring
- `launch-ops` — marketing automation and launch workflow
- `invention-lab` — invention evaluation flow

The existing `gatekeeper-cli` package is **not** renamed by this document. Naming separation applies to new components built on top of the operating model.

---

## 11. Hard Constraints

- Do not build simply because an idea exists.
- Do not let `deepresearch` automatically become a build trigger.
- Do not convert CLI / MCP / API / doc / PDF requests into web apps unless explicitly requested.
- Do not skip viability scoring.
- Do not launch items to marketing without launch qualification.
- Preserve GitHub as the trusted execution and audit layer.
- Preserve Notion as the connected knowledge layer.

---

## 12. Success Condition

The operating model is successful when:

- Ideas are researched before built.
- Weak ideas are rejected early.
- Old assets can be refreshed intelligently.
- Invention work follows its own process.
- GitHub is trusted as the project-management and execution system.
- Notion preserves context and knowledge.
- Marketing automation activates only for launch-ready work.
- Agents stop overbuilding because routing is explicit.

---

## File Index

| Asset                                                                                  | Purpose                                                |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [`.github/ISSUE_TEMPLATE/devin-work-request.yml`](../.github/ISSUE_TEMPLATE/devin-work-request.yml) | Intake form for every work request                     |
| [`templates/viability-gate-template.md`](../templates/viability-gate-template.md)       | Viability scoring rubric                               |
| [`templates/invention-flow-template.md`](../templates/invention-flow-template.md)       | Invention evaluation flow                              |
| [`templates/legacy-refresh-checklist.md`](../templates/legacy-refresh-checklist.md)     | Refresh-existing audit checklist                       |
| [`docs/github-project-schema.md`](./github-project-schema.md)                           | GitHub Project field schema and status lifecycle       |
| [`docs/notion-structure.md`](./notion-structure.md)                                     | Notion database structure for the knowledge layer      |
| [`promptforproject.md`](../promptforproject.md)                                         | Step 0 router that runs before any implementation work |
