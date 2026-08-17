# S.H.I.F.T. Testing & Self-Healing Monitor Standard

**Date:** April 1, 2026
**Framework:** S.H.I.F.T. (Self-Healing Intent-Focused Tasks)
**Target:** GrowlingEyes (and all future Revvel applications)

## 1. Core Philosophy: Humanistic Testing & Behavioral Validation

Traditional E2E testing focuses purely on code execution (e.g., "Did the button click?"). The S.H.I.F.T. framework moves away from binary "pass/fail" unit tests and mandates **Behavioral Validation**. This ensures that the system or agent doesn't just hit zero code errors, but actually solves the problem in a way that respects neurodivergent needs. [14, 15]

For an AI agent (like the "Scarecrow" persona) or an application like GrowlingEyes, this means testing not just that an action occurred, but that the *intent* behind the action is clear, predictable, and doesn't cause cognitive overload. [1, 2, 3]

### The Five Dimensions of Self-Healing Validation
To ensure the agents and systems "self-heal" for the next run, evaluate every core test on these five dimensions: [1]

1. **Memory:** Did it remember critical context from past interactions or integrations (e.g., remembering a past-due bill from a Plaid sync)? [4]
2. **Reflection:** Did the agent realize the true priority? (e.g., recognizing that a past-due utility bill is a higher priority than a work sandbox setup). Does the system provide clear, calm feedback?
3. **Planning:** Are multi-step workflows broken down logically? Is a proposed schedule actually achievable with ADHD?
4. **Action:** Was the action executed according to the user's actual intent without hidden side effects? Was the reminder sent to the preferred channel (e.g., Discord Nitro or Google Notes)? [11]
5. **System Reliability:** Did the agent handle external API data correctly without "hallucinating" different values? [3, 12] How does the UI degrade when external APIs fail?

## 2. Humanistic Acceptance Test: The "Conflict Resolution" Scenario

To validate the S.H.I.F.T. principles, we use Humanistic Acceptance Tests. The biggest "failure" for a solo project manager is often an agent ignoring a personal crisis to meet a work deadline. This test pattern uses actual external data (e.g., Plaid) and work deadlines to verify the agent's intent. [4, 5]

### Example User Story
"As a project manager with ADHD, I need the Scarecrow to alert me if a high-priority work deadline is at risk because of a past-due personal bill, so I don't hyperfocus on work while my power is at risk of being cut off."

### Acceptance Criteria (Behavioral Bounds)

* **Contextual Awareness (Given):** The agent has access to Plaid data showing a utility bill (e.g., Black Hills Energy, $61.15) was due 8 days ago, and a work deadline (e.g., Stripe sandbox setup) is approaching. [4, 5]
* **Intent Validation (When):** The user asks the agent to "plan my next 48 hours for the project."
* **Functional Success (Then):**
    1. The agent MUST NOT simply generate a work plan.
    2. The agent MUST surface the past-due utility bill as a "Critical Dependency" *before* the work task.
    3. The agent MUST suggest a "10-3 Rule" break or a "Brain Dump Tornado" session if it detects the schedule is too densely packed.
* **Graceful Failure:** If the bank balance (via Plaid) is too low to cover the bill, the agent must propose an "Emerald City" strategy (e.g., calling the provider for an extension) rather than just stating "insufficient funds". [2, 6, 7]

## 3. Implementing the "Wizard of Oz" (WoZ) Method

For solo developers on a budget, it is critical to use the Wizard of Oz method to test agent behavior *before* writing code. [8]

1. **Roleplay the Agent:** Manually type out how you wish the agent (e.g., the Scarecrow) would respond to the conflict scenario.
2. **Analyze the "Human" Response:** Did your manual response feel supportive or stressful? Which part of the interaction feels most helpful for ADHD?
3. **Refine the Prompt:** Use your "Wizard" manual responses as "Few-Shot" examples in the agent's system prompt to guide its behavior. [9, 10]

## 4. End-to-End Testing with Playwright MCP

All E2E testing must be automated using Playwright, guided by the S.H.I.F.T. principles.

### Neuro-Inclusive UI Validation Rules
When writing Playwright tests, assert the following neuro-inclusive design principles: [8, 9]
* **Predictability:** Navigation elements must remain in fixed DOM locations.
* **Sensory Control:** If animations exist, there must be a tested toggle to disable them.
* **Contrast & Halation:** Verify that critical text does not use pure black (`#000000`) on pure white (`#FFFFFF`).
* **Calm Microcopy:** Error states must be tested for reassuring language (e.g., "We couldn't reach the server right now, but you can try again later" instead of "FATAL ERROR 500"). [10, 11, 12, 13]

### Simulation-Based "Bad Day" Testing
Use the Playwright MCP to simulate degraded states:
* Block network requests to external APIs to ensure the UI handles the failure gracefully.
* Throttle network speed to test loading states and prevent user anxiety during long waits.
* Simulate a user navigating away mid-task to ensure progress is saved.

## 5. Continuous Self-Healing Monitor

A system that only reports errors is incomplete. The system must "Self-Heal" by adjusting its behavior based on failures. [1, 18, 19]

### The Self-Healing Loop
1. **Monitor:** A cron job or external monitor (e.g., a Playwright synthetic test) runs every 10 minutes.
2. **Evaluate:** If a test fails, the monitor captures the DOM state, console logs, and network requests.
3. **Diagnose (Agentic):** An LLM agent analyzes the failure context. Did the UI change? Did an API format change?
4. **Heal (Automated or Proposed):** 
    * *Soft Failures:* If an external API is down, the monitor automatically flips a feature flag to gracefully hide the broken component in the UI, replacing it with a calm placeholder.
    * *Hard Failures:* The monitor automatically generates a highly specific, persona-driven bug report (acting as the "Scarecrow" persona) with exact steps to reproduce. [3, 4, 5, 6, 7]

## 6. Implementation Guide for New Apps

Every new Revvel application must include:
1. A `playwright.config.ts` file at the root.
2. A `tests/e2e/` directory containing at least one "Happy Path" test and one "Bad Day" simulation test.
3. A GitHub Action workflow (`.github/workflows/monitor.yml`) that runs the tests on a schedule and triggers the Self-Healing alert system on failure.

---
### References
[1] Galileo AI: AI Agent Testing & Behavioral Validation - <https://galileo.ai/learn/ai-observability/ai-agent-testing-behavioral-validation>
[2] LinkedIn: Writing Acceptance Criteria for AI Products - <https://www.linkedin.com/pulse/writing-acceptance-criteria-ai-products-product-managers-aruna-singh-iw7uc>
[3] Leantime: ADHD and Project Management Techniques - <https://leantime.io/adhd-and-project-management-techniques-for-focus-and-organization/>
[4] Google Mail: AI Persona Prompts Context 1 - <https://mail.google.com/mail/?extsrc=sync&client=h&plid=ACUX6DOd_INzwQmMqFUqactZ-iDD-Sq0CsgwA_Y>
[5] Google Mail: AI Persona Prompts Context 2 - <https://mail.google.com/mail/?extsrc=sync&client=h&plid=ACUX6DPVQOS0ip2RFXYi1LCZDQLTICtWPdgWiA0>
[6] Reddit: ADHD and Project Management - <https://www.reddit.com/r/projectmanagement/comments/1n0j00d/adhd_and_project_management/>
[7] LinkedIn: Evaluating AI Activity - <https://www.linkedin.com/posts/tyllenbicakcic_heres-a-test-for-any-bank-evaluating-ai-activity-7431382283112103936-J9lf>
[8] Interaction Design Foundation: Wizard of Oz Prototypes - <https://ixdf.org/literature/topics/wizard-of-oz-prototypes>
[9] Reddit: Acceptance Criteria for Gen AI Features - <https://www.reddit.com/r/ProductManagement/comments/1egz6bg/acceptance_criteria_for_gen_ai_features/>
[10] Nielsen Norman Group: Wizard of Oz - <https://www.nngroup.com/articles/wizard-of-oz/>
[11] Google Mail: Preferred Channel Context - <https://mail.google.com/mail/?extsrc=sync&client=h&plid=ACUX6DMqryl8NatiKHnhFs3Q0_oUEz6m03mmKJU>
[12] Plaid: AI Enhanced Transaction Categorization - <https://plaid.com/blog/ai-enhanced-transaction-categorization/>
[13] accessiBe: How to Design Digital Environments for People with Neuro-Divergency
[14] Galileo AI: AI Agent Testing & Behavioral Validation
[15] Toloka: AI Agent Evaluation Methodologies
[16] SFU Summit: Thesis on related topic
[17] Plaid: AI Development Toolkit
[18] Galileo AI: Test AI Agents
[19] ValidMind: The Need for New Approaches to Agentic AI
