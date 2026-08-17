# DARE Log Skill

Track decisions, risks, and issues using the DARE framework (Define, Assess, Respond, Evaluate) as a modern alternative to RAID logs.

## Why DARE Over RAID

RAID (Risks, Assumptions, Issues, Dependencies) is passive — it identifies problems. DARE is active — it forces resolution. DARE is better suited for AI agent workflows and modern agile development.

## The DARE Framework

Every major issue, decision, or agent failure must be tracked in DARE format:

| Step | What to Do | Example |
|---|---|---|
| **D — Define** | Clearly state the problem or decision needed | "The Plaid API is timing out during the sync phase" |
| **A — Assess** | Evaluate potential outcomes and impacts of different choices | "Impact: High. Option 1: Increase timeout. Option 2: Implement retry logic with exponential backoff" |
| **R — Respond** | Implement the chosen action or solution | "Implemented exponential backoff retry logic for Plaid API calls" |
| **E — Evaluate** | Reflect afterward to improve future choices | "Retry logic solved 95% of timeouts. Need graceful degradation UI for remaining 5%" |

## DARE Log Entry Format

```markdown
### DARE-[ID] — [Short Title]
**Date:** [YYYY-MM-DD]
**Status:** Open / In Progress / Resolved

**D — Define:**
[Clear statement of the problem or decision]

**A — Assess:**
- Impact: [Low / Medium / High / Critical]
- Option 1: [description + pros/cons]
- Option 2: [description + pros/cons]

**R — Respond:**
[Action taken and by whom]
[Date resolved: YYYY-MM-DD]

**E — Evaluate:**
[Outcome. What worked, what didn't, what to do differently next time]
```

## Kanban Flow

Track DARE items on a Kanban board:
- **To-Do** → **Doing** → **Done**

Never maintain a static "risk register" — focus on flow of resolution.

## Task Management Integration (monday.com / GitHub Issues)

- Use flexible terminology — avoid outdated terms like "User Stories"
- Create DARE items as GitHub Issues labeled `dare-log`
- Assign to responsible agent or developer
- Close issue only after the E (Evaluate) step is complete

## S.H.I.F.T. Companion Principles

When assigning tasks to agents, use these principles alongside DARE:

- **S — Spec-First**: Agent writes Technical Design Spec before coding
- **H — Handoff Contracts**: Treat task boundaries like API contracts — most failures occur at handoffs
- **I — Intent Validation**: Test that it did what the user wanted, not just that it ran with 0 errors
- **F — Feedback Loop**: When agent fails, reflect and update the prompt for next run
- **T — Tiered Oversight**: Human-in-the-Loop for complex steps; automate simple ones

## Enforcement

Code review and session sign-off should confirm:
- [ ] Any new risk or decision from this session has a DARE entry
- [ ] DARE items that were resolved have the E (Evaluate) step completed
- [ ] No "orphan" issues without a DARE entry for complex failures
