# S.H.I.F.T. Testing Skill

Evaluate AI agent behavior using the S.H.I.F.T. methodology (Self-Healing Intent-Focused Tasks) with five dimensions of quality.

## Core Philosophy

Traditional testing: "Did the button click?" (binary pass/fail)
S.H.I.F.T. testing: "Did the agent actually solve the user's problem in the intended way?"

S.H.I.F.T. validates **behavioral intent**, not just code execution — especially critical for neurodivergent users where cognitive overload is a real failure mode.

## The Five Dimensions of Self-Healing Validation

Evaluate every core agent/system test on these five dimensions:

| Dimension | Question |
|---|---|
| **Memory** | Did it remember critical context from past interactions? |
| **Reflection** | Did the agent identify the true priority (not just the obvious task)? |
| **Planning** | Are multi-step workflows broken down logically and achievably? |
| **Action** | Was the action executed per the user's actual intent, without hidden side effects? |
| **System Reliability** | Did the agent handle external API data correctly without hallucinating values? |

## Humanistic Acceptance Tests

Use actual external data and real priorities to validate agent intent.

### Example Structure
```text
Given: [Real context data — e.g., Plaid shows $61.15 bill overdue 8 days + work deadline approaching]
When: [User asks agent to plan next 48 hours]
Then:
  1. Agent MUST surface the critical personal dependency BEFORE the work task
  2. Agent MUST suggest a "brain dump" or break if schedule is too dense
  3. If insufficient funds: agent proposes extension strategy, not just "insufficient funds"
```

## Wizard of Oz (WoZ) Pre-Implementation Testing

For solo developers before writing code:
1. **Roleplay the Agent** — manually type how you wish the agent would respond
2. **Analyze** — does the response feel supportive or stressful? What's most helpful?
3. **Refine Prompt** — use your manual responses as few-shot examples in the agent's system prompt

## Playwright E2E Testing Rules

### Neuro-Inclusive UI Validation
Every Playwright test must assert:
- **Predictability**: Navigation elements remain in fixed DOM locations
- **Sensory Control**: If animations exist, there must be a tested toggle to disable them
- **Contrast**: Critical text does not use pure `#000000` on pure `#FFFFFF`
- **Calm Microcopy**: Error states use reassuring language ("We couldn't reach the server right now, try again later" — not "FATAL ERROR 500")

### "Bad Day" Simulation Tests
```ts
// Block external APIs to test graceful degradation
await page.route('**/api/plaid/**', route => route.abort());

// Throttle network to test loading states
// Use Playwright's network conditions API

// Navigate away mid-task to verify progress is saved
```

## Self-Healing Monitor Loop

1. **Monitor** — cron/synthetic Playwright test runs every 10 minutes
2. **Evaluate** — if test fails, capture DOM state, console logs, network requests
3. **Diagnose (Agentic)** — LLM analyzes: did UI change? API format change?
4. **Heal**:
   - *Soft failures*: auto-flip feature flag to hide broken component with calm placeholder
   - *Hard failures*: auto-generate a persona-driven bug report with exact reproduction steps

## Required Files (Every New Revvel App)

- `playwright.config.ts` at repo root
- `tests/e2e/` with at least one **Happy Path** test and one **Bad Day** simulation test
- `.github/workflows/monitor.yml` — scheduled test run + self-healing alert on failure

## Session Checklist

- [ ] Happy path E2E test passes
- [ ] Bad day simulation test passes (API blocked → graceful degradation)
- [ ] All five S.H.I.F.T. dimensions evaluated for new agent behaviors
- [ ] Error states use calm, reassuring language
- [ ] Navigation elements are predictable (fixed DOM positions)
