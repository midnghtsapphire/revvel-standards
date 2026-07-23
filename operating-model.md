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

Work requests are filed through one of two issue templates. Both apply the `work-request` and `weekly-research` labels so the auto-classifier and downstream automation (`wr-pr-creation.yml`, `jules-invoke.yml`, the Project v2 board sync) treat them identically. Downstream automation also accepts the `[WR]` title prefix and the BASIC WR issue type as WR signals so GitHub UI label drift cannot strand the request.

### Two templates: when to use which

The New Issue chooser shows two cards, sorted by filename:

1. **[`Work Request`](../.github/ISSUE_TEMPLATE/00-work-request.yml)** (`00-work-request.yml`) — the **primary human form**. Anti-under-scoping fields are still present (Summary, Objective, Required Bundle, Definition of Done, Do Not Under-Scope, Delivery Shape, Blocker Rule), but they are now optional so you can file quickly and let research/triage backfill detail from your prose when needed.

2. **[`OpenHands System WR (Quick / Internal)`](../.github/ISSUE_TEMPLATE/10-OpenHands-system-wr.yml)** (`10-OpenHands-system-wr.yml`) — the **lightweight system form**. Output Type is the only required field; every other routing dropdown defaults to `auto-classify` and is filled in from your description by the [auto-classifier workflow](../.github/workflows/wr-auto-classify.yml). Use this for low-risk, internal, or agent-driven work where the heavy bundle contract would be overkill (small follow-up fixes, internal scripts, agent-routed automation).

The lightweight form additionally applies the `quick` and `OpenHands` labels so workflows can distinguish lightweight WRs from the primary heavy ones if needed.

### Required fields

**Heavy form (`00-work-request.yml`)** — only one field is required now:

- **Output Type** — the hard constraint on the deliverable (production-app, cli-product, api-product, sellable-pdf, etc.)

Optional in the heavy form (recommended when you already know them):

- PDF pipeline batch
- Research Mode, Delivery Mode, Lifecycle Mode, Commercial Mode
- Summary, Objective, Required Bundle, Definition of Done, Do Not Under-Scope, Explicit Exclusions
- Delivery Shape, Sellable Artifact Bundle, Purchase Validation, Expected Scope, Validation Expectations, Blocker Rule

**Lightweight form (`10-OpenHands-system-wr.yml`)** — only two are required:

- **Output Type** — same options as the heavy form
- **High-Level Goal** — prose description of what you're trying to achieve

Optional in the lightweight form (auto-classifier fills any left on `auto-classify`):

- Research Mode, Delivery Mode, Iteration Mode, Lifecycle Mode, Commercial Mode, Deployment Target, Launch Priority
- Problem to Solve, Success Definition, Constraints and must-haves, Existing assets / repos / links, Cutting-edge notes

### Picking the right mode

The **Output Type** dropdown at the top of either form is the routing decision that controls the entire flow:

- `production-app` / `desktop-tool` — build an app or tool
- `cli-product` / `mcp-product` / `api-product` — code-facing product
- `sellable-pdf` / `technical-documentation` — documents, briefs, and PDFs
- `project-management-doc` — process and planning
- `client-code-task` — small client-scoped work
- `internal-script-automation` — internal tooling, no external surface
- `invention-flow` — invention evaluation, not a build

Everything else the auto-classifier needs (research depth, lifecycle, commercial mode, deployment target, priority) is derived from your prose by the [auto-classifier workflow](../.github/workflows/wr-auto-classify.yml) when those fields are left on `auto-classify` or omitted entirely. The classifier respects user choices and only fills fields left on `auto-classify`.

Field semantics:

- **Research Mode** controls research depth only. It does not change the deliverable.
- **Output Type** is the hard constraint on the final deliverable.
- **Delivery Mode** controls whether OpenHands proposes first or builds immediately.
- **Iteration Mode = single-pass** means do not expand into multi-stage roadmaps unless blocked.
- **Lifecycle Mode = refresh-existing** means audit first before proposing rebuilds.

### Heavy-form fields the classifier does not auto-fill

The heavy form intentionally captures bundled-scope expectations (`Summary`, `Objective`, `Required Bundle`, `Definition of Done`, `Do Not Under-Scope`, `Explicit Exclusions`, `Expected Scope`, `Validation Expectations`, `Blocker Rule`, `Acknowledgements`) as free-text in the issue body when you provide them. These are read by the implementer (and downstream review automation) but are NOT mapped to Project v2 fields today. A future WR will map a subset of them (Summary -> "Owner Notes", Required Bundle -> a new "Required Bundle" text field, Definition of Done -> a new "Definition of Done" text field) once the Project v2 schema is updated.

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

A single GitHub Project (<https://github.com/users/midnghtsapphire/projects/5>) tracks every work request. The full field schema and lifecycle are documented in [`docs/github-project-schema.md`](./github-project-schema.md).

**Live board:** [https://github.com/users/midnghtsapphire/projects/5](https://github.com/users/midnghtsapphire/projects/5) — `Revvel-Standards`

Status lifecycle:

```text
Inbox → Researching → Scored → { Hold | Archived | Approved → In Build → In Review → Ready to Launch → Launched → Measuring }
```

### Day in the life: WR → Project → PR → merge

The expected end-to-end flow once the operating model is wired:

1. **File a WR.** Open a new issue using either the heavy [`Work Request`](../.github/ISSUE_TEMPLATE/00-work-request.yml) form (the first card; required for anything that bundles docs/discoverability/REMINDERS scaffolding) or the lightweight [`OpenHands System WR`](../.github/ISSUE_TEMPLATE/10-OpenHands-system-wr.yml) form (second card; for low-risk internal/agent-driven work). Both apply the `work-request` and `weekly-research` labels so [`wr-auto-classify.yml`](../.github/workflows/wr-auto-classify.yml) and WR PR creation fire on either; the lightweight form additionally applies `quick` + `OpenHands`.
2. **Default-fields workflow fires.** The `issues.opened` event triggers [`.github/workflows/default-project-v2-fields-pat.yml`](../.github/workflows/default-project-v2-fields-pat.yml). The preflight job checks for `PROJECTS_PAT`; the main job adds the issue to the Project board and writes three default fields: `Priority = medium`, `Status = Inbox`, `Research Mode = standard`. The companion App workflow ([`set-default-project-v2-fields.yml`](../.github/workflows/set-default-project-v2-fields.yml)) detects no App credentials and skips cleanly.
3. **Researcher / scorer picks it up.** Whoever owns scoring transitions `Status` → `Researching`, runs [`templates/viability-gate-template.md`](../templates/viability-gate-template.md), populates the six 1–5 number fields and the `Viability Score` total, then sets `Status` → `Scored` and `Decision` ∈ {`BUILD`, `HOLD`, `ARCHIVE`}.
4. **Builder picks up `BUILD` items.** `Decision = BUILD` advances `Status` → `Approved` → `In Build`. Implementation begins per the routing rules in [`promptforproject.md`](../promptforproject.md) Step 0 (`Output Type` is the hard constraint on the deliverable).
5. **PR opens against `main`.** The PR follows [`.github/pull_request_template.md`](../.github/pull_request_template.md) and references the WR with `Closes #N`. CI runs against the PR.
6. **Review → Ready to Launch.** When the PR squash-merges under the `Protect main` ruleset, the WR auto-closes. Reviewer transitions `Status` → `In Review` → `Ready to Launch` once the deliverable is verified.
7. **Launched.** When the deliverable ships (deployed, published, distributed), `Status` → `Launched`. If `Marketing Ready = Yes` and `Launch Channel ≠ None`, the marketing automation layer (Section 8) takes over.
8. **Measuring.** Once metrics start arriving, `Status` → `Measuring`. The portfolio review loop (Stage F) re-evaluates measuring items monthly.

The operator-facing setup walkthrough — auth path, repo variable wiring, ID discovery, validation evidence — lives in [`docs/github-project-v2-workflows.md`](./github-project-v2-workflows.md).

*Note: The auto-classifier also adds an `output-type:<type>` label so automation workflows can adapt to the requested deliverable (e.g., `wr-pr-creation.yml` skips deployment scaffolding when creating the WR document if the output type is PDF/documentation).*

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
| [`.github/ISSUE_TEMPLATE/00-work-request.yml`](../.github/ISSUE_TEMPLATE/00-work-request.yml)                | Primary human Work Request form (anti-under-scoping)   |
| [`.github/ISSUE_TEMPLATE/10-OpenHands-system-wr.yml`](../.github/ISSUE_TEMPLATE/10-OpenHands-system-wr.yml)          | Lightweight WR for internal/agent-driven work          |
| [`templates/viability-gate-template.md`](../templates/viability-gate-template.md)       | Viability scoring rubric                               |
| [`templates/invention-flow-template.md`](../templates/invention-flow-template.md)       | Invention evaluation flow                              |
| [`templates/legacy-refresh-checklist.md`](../templates/legacy-refresh-checklist.md)     | Refresh-existing audit checklist                       |
| [`docs/github-project-schema.md`](./github-project-schema.md)                           | GitHub Project field schema and status lifecycle       |
| [`docs/notion-structure.md`](./notion-structure.md)                                     | Notion database structure for the knowledge layer      |
| [`promptforproject.md`](../promptforproject.md)                                         | Step 0 router that runs before any implementation work |
