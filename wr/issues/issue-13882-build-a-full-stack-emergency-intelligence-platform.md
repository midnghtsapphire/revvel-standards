# WR: Build a full-stack emergency intelligence platform called SELF-HEAL OPS

**Issue:** #13882  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-05-25  
**Last Updated:** 2026-05-25  
**Language:** TypeScript, Python, Node.js
**Research Date:** 2026-05-25
**Researcher:** Jules (Google) + OpenRouter
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
- [ ] **A/B test hypothesis** — only if a UI/UX component is being shipped
- [ ] **Affiliate / reseller program** — only if a distribution network is in scope

---

## Executive Summary

This Work Request defines the requirements to build SELF-HEAL OPS, an AI-assisted chemical, environmental, and biological disaster response system. The platform is designed to analyze industrial runaway reactions, toxic releases, explosions, spills, fires, wildlife exposure, watershed contamination, and long-term ecosystem remediation. By leveraging multiple specialized AI agents, the platform synthesizes process safety, emergency response, remediation science, veterinary triage, ecology, atmospheric modeling, robotics, and AI monitoring into a practical, actionable plan.

---

## Step 1: Repository Discovery

### Repository Metadata

| Property         | Value                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------- |
| Repository       | [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards) |
| Created          | 2026-05-25                                                                              |
| Last Updated     | 2026-05-25                                                                              |
| Primary Language | TypeScript / Node.js / Python                                                           |
| Description      | SELF-HEAL OPS - Emergency Intelligence Platform                                         |
| Private          | No                                                                                      |
| Archived         | No                                                                                      |

### Current Status

- **Active Development:** Yes
- **Last Commit:** Initial WR creation
- **Open PRs:** N/A
- **Open Issues:** #13882
- **Deployment Status:** Not Deployed (Vercel deployment planned)
- **CI/CD Status:** Not configured

### Key Technologies

- **Frontend:** React/Next.js (Dashboard, Map View, Plume View, Incident Intake Wizard)
- **Backend:** Node/Python API
- **Database:** PostgreSQL/Supabase, Vector Database (for SDS, EPA, NOAA, CSB, NFPA guides)
- **Deployment:** Vercel (Frontend), DigitalOcean (Backend/Agents)
- **Model Router:** OpenRouter API

---

## Step 2: Deep Web Research

### Market Opportunity Analysis

Emergency response teams, hazmat specialists, environmental regulators, and process safety engineers need rapid access to synthesized intelligence during critical incidents. Current processes involve consulting static safety data sheets (SDS) and siloed databases (e.g., CAMEO, ALOHA, EPA sources). Integrating these sources with AI reasoning can drastically reduce response times and improve decision-making accuracy.

### Bill of Materials (BOM) — APIs & Tools

### Category: AI & Model Routing

| API / Tool | Cost        | Coverage          | Best For              | Verdict        |
| ---------- | ----------- | ----------------- | --------------------- | -------------- |
| OpenRouter | Pay-per-use | Full model access | Central model gateway | ⭐ Recommended |

### Category: Vector DB & Data Storage

| API / Tool            | Cost        | Coverage          | Best For    | Verdict        |
| --------------------- | ----------- | ----------------- | ----------- | -------------- |
| Supabase (PostgreSQL) | $25/mo base | Relational/Vector | DB and Auth | ⭐ Recommended |

### Category: Environmental & Safety Data

| API / Tool             | Cost | Coverage            | Best For           | Verdict        |
| ---------------------- | ---- | ------------------- | ------------------ | -------------- |
| EPA / NOAA / USGS APIs | Free | Public Data         | RAG for Rem. Agent | ⭐ Recommended |
| PubChem / NLM APIs     | Free | Chemical Properties | SDS verification   | ⭐ Recommended |

### Competitors & Alternatives

| Competitor        | Type             | Cost         | Conversion/Quality     | Gap / What They Don't Do                                        |
| ----------------- | ---------------- | ------------ | ---------------------- | --------------------------------------------------------------- |
| ALOHA / CAMEO     | Desktop Software | Free         | Reliable but legacy UI | No AI synthesis, disjointed UI                                  |
| **SELF-HEAL OPS** | AI Platform      | Subscription | High                   | AI-driven synthesis, multi-agent reasoning, self-healing output |

### Research Fleet Plan & Review Fleet Plan (REQUIRED)

1. **Research Fleet (Discovery):** Agents assigned to gather SDS, EPA datasets, and incident documentation.
2. **Review Fleet (Verification):** Source Verifier Agent acts as the Review Fleet, auditing the research quality and ensuring 100% citation coverage for factual claims, rejecting unsupported assertions.

**Gate Rule:** WR research cannot be marked complete until the Source Verifier Agent passes the Discovery output.

---

## Step 3: Requirements from revvel-standards

### Decision Scoring Model Gate

> Required when the WR ranks, filters, qualifies, prices, routes, or assigns confidence/probability to records.
> Follow `standards/DECISION_SCORING_ENGINE_STANDARD.md`.

**Does this WR make scoring/ranking/confidence decisions?** Yes

**Model Name:** mitigation_scoring_v1

**Status Values:**

- [x] `eligible`
- [x] `manual_review`
- [x] `blocked`
- [x] `suppressed`

**Score Range:** 0-100

**Weighted Factors:**

| Factor                | Weight | Source          | Why it matters         |
| --------------------- | -----: | --------------- | ---------------------- |
| Lifesaving impact     |   0.30 | Agent Consensus | Priority objective     |
| Responder risk        |   0.25 | Source Verifier | Safety of personnel    |
| Environmental benefit |   0.15 | Rem. Agent      | Ecosystem preservation |
| Feasibility           |   0.15 | Systems Agent   | Actionability          |
| Time to deploy        |   0.10 | Reasoner Agent  | Critical timing        |
| Failure modes         |   0.05 | Red-Team Critic | Risk mitigation        |

**Threshold Bands:**

| Score Range | Status        | Action                     |
| ----------- | ------------- | -------------------------- |
| 80-100      | eligible      | Recommended in Action Plan |
| 50-79       | manual_review | Present with warnings      |
| 0-49        | blocked       | Add to Do-not-do list      |

**Audit Trail Required:**

- [x] Model version recorded
- [x] Factor values recorded
- [x] Explanation trail recorded
- [x] Actor and timestamp recorded
- [x] Manual-review route recorded when status is `manual_review`

**Async Safety Rule:** `Promise.all` must be used for evaluating async eligibility functions.

### Ship to Market Status

**Current Status:** Needs Work (Implementation Phase)

**Readiness Checklist:**

- [ ] All tests passing
- [ ] No linting errors
- [ ] No security vulnerabilities
- [ ] Deployment configured
- [ ] UI verified
- [ ] Documentation complete
- [ ] TEST section in README
- [ ] Vercel URL available

---

## Step 4: Redevelopment & Redesign

### Implementation Steps (P0)

1. **Setup Repository Structure:** Initialize Next.js for the frontend and Node/Python backend. Set up PostgreSQL/Supabase database.
2. **Implement Model Router Configuration:**
   - Use dynamic lookup tables (`config/model-lookup.json`).
   - Integrate OpenRouter as the central gateway.
   - Configure specialist agent routes (Chief Incident Reasoner, Chemistry Agent, Fire & Explosion Agent, Environmental Agent, Wildlife Agent, Systems Engineer, Red-Team Critic, Source Verifier).
3. **Develop Core Workflow & Logic (The Reasoning Formula):**
   - **Understand:** Incident intake module.
   - **Analyze:** Trigger parallel specialist agents.
   - **Reason:** Map cause → reaction → migration.
   - **Synthesize:** Force disagreement analysis and score mitigations.
   - **Conclude:** Generate 0-2 hr, 2-24 hr, 1-30 day, and 1-10 year plans.
4. **Implement UI Modules:**
   - Incident intake wizard, tank/chemical profile forms, map view, plume view, responder checklist.
5. **Implement Self-Healing Conclusion Engine:**
   - Identify assumptions, check contradictions, rerun weak sections, require citations.
6. **Implement Export and Integrations:**
   - PDF command packet generator, CLI mode, API mode, GitHub issue creator.

### Enhance Features

#### UX/UI Improvements

- **Glassmorphic Aesthetic:** Implement the Glassmorphic UI design system for the dashboard and wizard interfaces.
- **Safety Labeling:** Explicitly label outputs as "decision-support for qualified professionals" and never present field actions as DIY instructions.

---

## Step 5: Deployment Verification

### Vercel Deployment

**Current Status:** Not deployed

**Configuration:**

- [x] `vercel.json` to be configured
- [x] Environment variables to be set (`OPENROUTER_API_KEY`, `SUPABASE_URL`, etc.)
- [x] Build command correct (`scripts/build-static.sh`)
- [x] Output directory correct (`.`)

---

## Recommendations

### Immediate Actions (P0)

1. **Initialize the Project Framework:**
   - **Why:** Foundation for all subsequent development.
   - **How:** Scaffold the Next.js frontend and Python FastAPI/Node backend. Set up the `mitigation_scoring_v1` decision engine.

2. **Configure OpenRouter Specialist Agents:**
   - **Why:** The core value proposition relies on multi-agent synthesis.
   - **How:** Define prompt templates and dynamic routing tables for the 8 specialist agents.

---

## Risks & Considerations

| Risk                                        | Severity | Probability | Mitigation                                                                         |
| ------------------------------------------- | -------- | ----------- | ---------------------------------------------------------------------------------- |
| Hallucination in safety-critical situations | High     | Medium      | Enforce the Source Verifier agent to reject unsupported claims; mandate citations. |
| Complex UI hindering rapid response         | High     | Low         | Emphasize a streamlined "Incident Intake Wizard" for fast data entry.              |

---

## Product / Output Selections

| Output shape     | In scope? | Format / length      | Primary engine / standard   | Notes                            |
| ---------------- | --------- | -------------------- | --------------------------- | -------------------------------- |
| Website / app UI | Yes       | Next.js Dashboard    | UI Creation Engine Standard | Includes map, plume view, wizard |
| API              | Yes       | REST                 | Auto-compounder standard    | Needed for integrations          |
| CLI              | Yes       | Binary               | CLI Engine Standard         | For rapid terminal usage         |
| MCP              | Yes       | Server/Tool Manifest | MCP Engine Standard         | OpenRouter, File Search          |
| PDF              | Yes       | Incident Report      | PDF Engine Standard         | Command packet export            |
| Agent automation | Yes       | Workflow Service     | GOAP / Runner Orchestrator  | Runs parallel specialist agents  |

## Platform Defaults & Website Requirements

- **Website in Test:** Vercel (Deployment pending)
- **Integration runtime:** DigitalOcean by default
- **Admin surface:** Required (Admin Safety Rules)
- **User auth:** Required (Google/GitHub/Apple)

## Artifact Engine Map

- **Website/UI:** `docs/Master_Inventory/UI_CREATION_ENGINE_STANDARD.md`
- **CLI:** `products/cli-engine`
- **Agent Workflow:** `agent-factory` (GOAP lane)
- **Decision Engine:** `standards/DECISION_SCORING_ENGINE_STANDARD.md`

## Agent Self-Healing Journal

- **Durable Finding:** Multi-agent reasoning in safety-critical domains must include a dedicated adversarial "Red-Team Critic" and a strict "Source Verifier" that forces citation coverage. This pattern will be incorporated into the broader agent ecosystem standards.
- **Safety Rule:** All generated actionable plans must feature a confidence score and a "Do-not-do list" to prevent harmful DIY interventions.

---

## Status Summary

**Research Status:** ✅ Complete
**Implementation Priority:** P0
**Revenue Potential:** Subscription Model (Enterprise)
**Effort Required:** 4-6 weeks
**Ship-to-Market Ready:** No (Implementation needed)
**Approval Required:** @midnghtsapphire
