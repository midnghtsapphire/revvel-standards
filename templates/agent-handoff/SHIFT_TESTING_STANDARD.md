# S.H.I.F.T. Testing & Self-Healing Monitor Standard

**Date:** April 1, 2026
**Framework:** S.H.I.F.T. (Self-Healing Intent-Focused Tasks)
**Target:** GrowlingEyes (and all future Revvel applications)

## 1. Core Philosophy: Humanistic Testing

Traditional E2E testing focuses purely on code execution (e.g., "Did the button click?"). The S.H.I.F.T. framework mandates **Humanistic Testing**—validating how the system behaves under real-world, high-stress, or neurodivergent conditions. [14, 15]

For GrowlingEyes, this means testing not just that an OSINT feed loaded, but that the resulting alert is clear, predictable, and doesn't cause cognitive overload.

### The Five Dimensions of Validation
Every core user flow must be tested against:
1. **Memory:** Does the app remember user preferences (e.g., sensory toggles, saved filters) across sessions?
2. **Reflection:** Does the system provide clear, calm feedback when an action is taken or fails?
3. **Planning:** Are multi-step workflows (like configuring a complex OSINT alert) broken down logically?
4. **Action:** Does the system execute the user's actual intent without hidden side effects?
5. **System Reliability:** How does the UI degrade when external APIs (like GDELT or CISA) fail?

## 2. End-to-End Testing with Playwright MCP

All E2E testing must be automated using Playwright, but guided by the S.H.I.F.T. principles.

### Neuro-Inclusive UI Validation Rules
When writing Playwright tests, assert the following neuro-inclusive design principles: [8, 9]
* **Predictability:** Navigation elements must remain in fixed DOM locations.
* **Sensory Control:** If animations exist, there must be a tested toggle to disable them.
* **Contrast & Halation:** Verify that critical text does not use pure black (`#000000`) on pure white (`#FFFFFF`).
* **Calm Microcopy:** Error states must be tested for reassuring language (e.g., "We couldn't reach the server right now, but you can try again later" instead of "FATAL ERROR 500"). [10, 11, 12, 13]

### Simulation-Based "Bad Day" Testing
Use the Playwright MCP to simulate degraded states:
* Block network requests to external OSINT feeds to ensure the UI handles the failure gracefully.
* Throttle network speed to test loading states and prevent user anxiety during long waits.
* Simulate a user navigating away mid-task to ensure progress is saved.

## 3. Continuous Self-Healing Monitor

A system that only reports errors is incomplete. The system must "Self-Heal" by adjusting its behavior based on failures. [1, 18, 19]

### The Self-Healing Loop
1. **Monitor:** A cron job or external monitor (e.g., a Playwright synthetic test) runs every 10 minutes.
2. **Evaluate:** If a test fails, the monitor captures the DOM state, console logs (via Jam MCP if applicable), and network requests.
3. **Diagnose (Agentic):** An LLM agent analyzes the failure context. Did the UI change? Did an API format change?
4. **Heal (Automated or Proposed):** 
    * *Soft Failures:* If an external API is down, the monitor automatically flips a feature flag to gracefully hide the broken component in the UI, replacing it with a calm placeholder.
    * *Hard Failures:* The monitor automatically generates a highly specific, persona-driven bug report (acting as the "Scarecrow" persona) with exact steps to reproduce, preventing the human developer from having to decipher the issue from scratch. [3, 4, 5, 6, 7]

## 4. Implementation Guide for New Apps

Every new Revvel application must include:
1. A `playwright.config.ts` file at the root.
2. A `tests/e2e/` directory containing at least one "Happy Path" test and one "Bad Day" simulation test.
3. A GitHub Action workflow (`.github/workflows/monitor.yml`) that runs the tests on a schedule and triggers the Self-Healing alert system on failure.

---
### References
[1] Product School: How to Build an AI Agent
[2] APIX Drive: Plaid API Integration
[3] Optimizely: How to Write AI Instructions
[4] Reddit: AI Persona Prompts
[5] Webex: Guidelines for Automating with AI Agents
[6] OpenAI: Practical Guide to Building AI Agents
[7] Hatchworks: AI Agent Design Best Practices
[8] Medium: Designing for Neurodiversity in Digital Products
[9] Medium: Designing for Neurodiversity: Inclusive UX Strategies
[10] Reddit: Tips for Designing UI/UX
[11] Dev.to: Building Inclusive UI for Neurodivergent Users
[12] Dool Agency: Designing UX for Neurodiverse Users
[13] accessiBe: How to Design Digital Environments for People with Neuro-Divergency
[14] Galileo AI: AI Agent Testing & Behavioral Validation
[15] Toloka: AI Agent Evaluation Methodologies
[16] SFU Summit: Thesis on related topic
[17] Plaid: AI Development Toolkit
[18] Galileo AI: Test AI Agents
[19] ValidMind: The Need for New Approaches to Agentic AI
