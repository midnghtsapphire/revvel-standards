---
template: work/planner-pmo
version: 1
fleet: research → planner → owner-approval → coder → reviewer
requires-owner-approval-before-coding: true
requires-owner-approval-before-shipping: true
scaffolding-allowed: false
labels-to-apply:
  - wr:plan
  - work-request
  - status:awaiting-research
---
<!--
  wr/templates/work/planner-pmo.md
  Use this when you have an idea and want it turned into a testable spec
  BEFORE a single line of code is written. It forces you to do 30 minutes of
  your own thinking first (where you catch things the LLMs miss), then hands
  a structured brief to the research + planner fleet.

  Copy this file to wr/issues/issue-{N}-{slug}.md, fill it in, file a GitHub
  issue with the title `[WR-PLAN] {TITLE}`, and let the automation pick it up.

  This template implements DECISIONS.md D019 (planner-first workflow) once
  D019 is recorded.
-->
# [PLAN] {TITLE — one sentence, no jargon}

## Problem statement (in your own words)

<!--
One paragraph. What is actually wrong, or what opportunity are you chasing?
If you can't say it in one paragraph, you don't know it well enough yet —
stop, think, come back. Vagueness here poisons everything downstream.
-->

{PROBLEM_STATEMENT}

## Who is this for

- **Primary user:** <!-- a specific person or role, not "everyone" -->
- **How often will they use it:** <!-- daily / weekly / one-time -->
- **What do they currently do instead:** <!-- manual process / competitor / nothing -->
- **What does it cost them today:** <!-- money, time, missed opportunity -->

## Your own research (do this BEFORE the fleet helps)

The whole point of this template is that you catch things LLMs don't. Fill
this section by hand from your Notion, ChatGPT threads, Perplexity searches,
Grok conversations — wherever you've been thinking about it.

- **Sources you already checked:**
  - [ ] NotebookLM notebook: <!-- link, or "none" -->
  - [ ] Perplexity threads: <!-- 1-2 sentence summary of findings -->
  - [ ] ChatGPT / Grok threads: <!-- 1-2 sentence summary -->
  - [ ] Existing repos / tools you found: <!-- links -->
  - [ ] Reddit / Discord / X posts that shaped your thinking: <!-- links -->
- **What surprised you** (things you found that the LLMs missed or glossed over):

  {WHAT_SURPRISED_YOU}

- **What you couldn't answer alone** (where the research fleet comes in):

  {OPEN_QUESTIONS}

## Additional research (assigned to research fleet)

- [ ] **Market** — is anyone else already doing this? Who? What is their pricing? What is their user complaint pattern?
- [ ] **Technical** — is the API / framework / tool we would use stable? Deprecation warnings? Is the maintainer active?
- [ ] **Legal** — any licensing / TOS issues with data sources, dependencies, or scraping paths?
- [ ] **Cost at scale** — what does this actually cost to run per month at 10 / 100 / 1000 users?
- [ ] **Compliance** — any privacy / data-retention / regulatory constraints (GDPR, CCPA, SOC2, HIPAA)?

## Success looks like (be specific — these become tests)

- [ ] {MEASURABLE_OUTCOME_1 — a test that would fail today and pass after the fix}
- [ ] {MEASURABLE_OUTCOME_2}
- [ ] {MEASURABLE_OUTCOME_3}

## Non-negotiables (things any implementation MUST include)

- [ ] Data stays under my control — no third-party sees customer data unless explicitly approved
- [ ] Free-tier viable — I can demo the whole flow without paying vendors
- [ ] Kid-testable — my kids can use it end-to-end without me hand-holding
- [ ] Ships as: <!-- PDF / CLI / API / skill / MCP / web app / mobile app / admin panel / browser extension -->
- [ ] Fits the Prime Directive — has a defensible path to revenue

## Autonomy — what I approve, what the fleet ships

<!--
Uncheck any box the fleet is NOT allowed to auto-merge for this project.
The auto-merge workflow reads these boxes.
-->

- [ ] I want to see and approve the **plan** before any code is written
- [ ] I want to see a **preview URL** before it goes to production
- [ ] I want to **test it myself** before it lists on Gumroad / any marketplace
- [ ] Post-launch **bug fixes** may auto-merge
- [ ] Post-launch **content edits** (copy, images, prices under $X) may auto-merge

## Prioritization — RICE

<!--
Fill in your best guess. The fleet will refine after research and update
the row in this file. Score is auto-calculated by the WR field filler:
  Score = (Reach × Impact × Confidence) / Effort
-->

- **Reach** (people served per month): <!-- number -->
- **Impact** (0.25 minimal / 0.5 low / 1 medium / 2 high / 3 massive): <!-- number -->
- **Confidence** (0 to 1, how sure am I this is right?): <!-- number -->
- **Effort** (person-weeks): <!-- number -->
- **Score** (auto-filled by fleet): <!-- leave blank -->

## Notes / stream-of-consciousness

<!--
Drop anything else here — Grok chat quotes, half-thoughts, screenshots,
links, questions you don't have answers to yet. The planner agent will
structure it into the actionable brief. Don't self-censor. Don't try to
sound polished. The template will polish it.
-->

{NOTES}

---

## Learnings — What & Why

<!--
The planner agent completes this once the WR closes. Capture what was
learned and *why* it matters, not just what shipped.
-->

{LEARNINGS}

<!-- ─────────────────── DO NOT EDIT BELOW THIS LINE ───────────────────
     Signals the WR pipeline reads to route this brief through the fleet.
     Removing these breaks the automation. -->

## Fleet routing

- **Trigger:** GitHub issue titled `[WR-PLAN] {TITLE}` with label `wr:plan`
- **Research fleet:** Perplexity + OpenRouter (research profile) will fill the
  "Additional research" section as sub-agents complete each item.
- **Planner fleet:** Jules will restructure the completed research into an
  implementation plan, posted as a PR review comment on this WR's issue.
- **Owner gate:** No coding begins until the owner comments `/plan approved`
  or applies the `plan:approved` label. This gate is intentional — this
  template exists specifically to prevent chaotic dumps from becoming code.
- **Handoff to coder:** Once approved, `wr-pr-creation.yml` picks up the WR
  and hands the approved plan to the coder lane. RICE score is inherited
  onto every downstream sub-WR so the fleet knows priority without asking.
