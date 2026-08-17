# Revvel Research Engine Standard

**Status:** Active  
**Owner:** MIDNGHTSAPPHIRE / Revvel Standards  
**Runtime:** `scripts/research-engine.js`  
**Workflow:** `.github/workflows/research-engine.yml`

---

## Purpose

Every WR must answer the commercial research questions before code is built:

- What market and audience are we targeting?
- Why is that audience worth pursuing?
- What SEO demand exists?
- Who are the competitors, including GitHub projects and star momentum?
- What public chatter proves pain and buying intent?
- Which claims are factual, sourced, and safe to reuse?
- What should code-review agents inspect before implementation?

The Research Engine turns a WR, issue, or PR into a durable research packet with lane-specific findings, checklists, labels, and a code-review handoff.

---

## Trigger Labels

The workflow runs on new or labeled issues when any of these labels or signals appear:

- `research-engine`
- `weekly-research`
- `deep-research`
- `marketing`
- `seo`
- `competitor-research`
- `audience-research`
- `chatter-research`
- `wr:research`
- Issue title begins with `[WR]`

Manual runs use `workflow_dispatch` with `issue_number`, `pr_number`, `research_query`, and `research_depth`.

---

## Engine Layers

### 1. Research Orchestrator

The orchestrator:

1. Reads the issue or direct query.
2. Applies research lifecycle labels.
3. Splits work into named research lanes.
4. Runs each lane through OpenRouter.
5. Synthesizes one WR-ready packet.
6. Writes the packet to `docs/research-engine/`.
7. Requests code-review-agent review.

### 2. Lane Agents

| Lane | Agent | Label | Output |
|---|---|---|---|
| Market Positioning | Echo | `research:marketing` | Audience, hooks, channels, offer |
| SEO Demand | Noimos | `research:seo` | Keyword clusters, intent, landing-page requirements |
| Competitor Intelligence | Iris | `research:competitors` | Competitors, GitHub stars, pricing, moat gaps |
| Audience and Chatter | Scout | `research:chatter` | Social/forum pain, exact phrases, objections |
| Factual Validation | Mirror | `research:facts` | Supported claims, weak claims, evidence gaps |
| Technical Delivery | Forge | `research:technical` | Files, workflows, tests, integration risks |
| Revenue Mechanics | Ledger | `research:revenue` | Sellable shape, pricing, funnel, metrics |
| Research Review and Auto-Fix | Aria | `research:reviewer` | Review comments and fix-ready commit plan |

### 3. OpenRouter Triangulation

Default depth is `triangulated`, which runs each lane through three models:

- `anthropic/claude-sonnet-4`
- `google/gemini-2.5-pro`
- `openai/gpt-4.1`

`standard` depth uses a single model for lower-cost runs. `swarm` is accepted as an engine mode and uses the same three-model lane fanout unless a downstream MAS provider is wired by environment.

### 4. Synthesis

The synthesizer uses `RESEARCH_SYNTHESIS_MODEL`, defaulting to `anthropic/claude-opus-4`, and produces these sections:

1. Executive Decision
2. Audience We Are Going After and Why
3. Marketing and SEO Plan
4. Competitor and GitHub Star Intelligence
5. Chatter and Demand Signals
6. Factual Validation and Evidence Gaps
7. Build Requirements and Acceptance Gates
8. Code Review Agent Packet
9. Automatic Fix and Commit Queue
10. Labels to Apply

---

## Master Checklist

- [ ] Scope the WR and extract the commercial question being answered.
- [ ] Split research into independent specialist lanes with named agents.
- [ ] Run each lane through OpenRouter model triangulation or a configured MAS provider.
- [ ] Require evidence, citations, confidence, and explicit unknowns from every lane.
- [ ] **If Output Type is visual / branded / merchandise / asset-artifact** — run the three **preemptive input packs** under [`templates/research-preemptive-inputs/`](../templates/research-preemptive-inputs/) so the human owner doesn't have to add regional motifs, color palettes, or generation prompts as PR comments later. See PR [#14085](https://github.com/midnghtsapphire/revvel-standards/pull/14085) for the originating case.
- [ ] Synthesize marketing, SEO, competitors, audience, chatter, factual validation, delivery, and revenue into one packet.
- [ ] Create a code-review packet that asks review agents for comments and automatic-fix commits.
- [ ] Apply research lifecycle labels so stuck items are visible.
- [ ] Write a durable Markdown artifact and link it back to the WR or PR.

---

## Code Review Requirements

Research is not complete until review agents can act on it.

Every generated packet includes a Code Review Handoff requiring:

- Bito AI or equivalent persistent-memory review.
- OpenRouter review of factual validation, gaps, and implementation risk.
- Coderabbit or line-level review for any PR created from the packet.
- Automatic-fix plans for every blocking finding.
- A proposed commit message for each safe fix.
- Ralph Loop readiness for `changes-requested` recovery.

The workflow applies:

- `research:review-needed`
- `bito-ai`
- `awaiting-review`

When a PR number is provided, the engine dispatches `bito-ai.yml` for that PR and posts a review request comment.

---

## Missing Secret Behavior

If `OPENROUTER_API_KEY` is absent, the engine writes a visible blocked packet instead of silently failing. It applies:

- `openrouter:needs-key`
- `research:blocked`
- `needs-human`

This is an infrastructure blocker because the code is present but the required runtime secret is missing.

---

## Local Usage

```bash
OPENROUTER_API_KEY=sk-or-... \
RESEARCH_QUERY="Build a research engine for WRs" \
OUTPUT_FILE="docs/research-engine/local-run.md" \
node scripts/research-engine.js
```

Lower-cost run:

```bash
OPENROUTER_API_KEY=sk-or-... \
RESEARCH_DEPTH=standard \
RESEARCH_QUERY="Evaluate competitor demand for an OSINT CLI" \
node scripts/research-engine.js
```

Offline validation without model calls:

```bash
node tests/research-engine.test.js
```

---

## Acceptance Gates

- `node tests/research-engine.test.js`
- `npm run workflows:validate`
- `npm test`
- Packet written to `docs/research-engine/`
- Issue or PR receives research lifecycle labels
- Code-review handoff comment is posted
