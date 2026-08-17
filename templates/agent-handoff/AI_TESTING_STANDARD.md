# AI Agent Behavioral Testing Standard (S.H.I.F.T.)

**Date:** April 1, 2026
**Target:** All Autonomous AI Agents in Revvel Applications

## 1. Core Philosophy: Beyond Zero Errors

Traditional software testing focuses on binary pass/fail outcomes (e.g., "Did the code execute without throwing a 500 error?"). For autonomous AI agents, "zero code errors" does not guarantee functional success. An agent can execute flawlessly but still fail to solve the user's actual problem or violate the user's intent. [1, 2]

To solve this, Revvel applications mandate **Behavioral Validation** using the **S.H.I.F.T.** (Self-Healing Intent-Focused Tasks) framework. We test *intent*, not just execution.

## 2. The Five Dimensions of Agent Evaluation

Every AI agent must be evaluated across these five dimensions to ensure it is actually functioning as intended: [1, 3]

1. **Memory:** Does the agent accurately retain and retrieve information from past interactions or provided context (e.g., remembering a specific API response or user preference)?
2. **Reflection:** Can the agent correctly interpret its own progress and recognize when a task is failing or when priorities conflict?
3. **Planning:** Are the agent's generated strategies logically sound, sequenced correctly, and feasible given the constraints?
4. **Action:** Do the agent's outputs (tool calls, generated files, API requests) align exactly with the user's intent and the defined spec?
5. **System Reliability:** Does the agent handle external factors (like API timeouts, missing data, or edge cases) gracefully without hallucinating data or crashing?

## 3. Automated "Wizard of Oz" (WoZ) Prompt Engineering

Before writing code for a new agent workflow, developers must define the agent's behavior using the Wizard of Oz method to create high-quality "Few-Shot" examples for the system prompt. [4, 5]

1. **Simulate the Scenario:** The developer manually writes out the exact input a user would give.
2. **Roleplay the Agent:** The developer manually types out the *ideal* response, tool call sequence, and reasoning process the agent should follow.
3. **Inject as Few-Shot Data:** These manually crafted, ideal interactions are injected directly into the agent's system prompt as few-shot examples. This ensures the agent learns the *intent* and *tone* directly from the developer's manual roleplay.

## 4. Agent Persona Guardrails

Agents must have explicitly defined identities and strict behavioral guardrails to prevent erratic behavior or assumptions. [6]

* **Define the Identity:** State the role clearly in the prompt (e.g., "You are an Executive Function routing agent responsible for parsing incoming webhooks and categorizing them by priority").
* **Reasoning Loops:** Force the agent to output its reasoning *before* taking action. (e.g., Prompt the agent to output `<thought>...</thought>` blocks before executing a tool call).
* **Explicit Forbiddances:** Define what the agent *cannot* do (e.g., "You MUST NOT generate a response without first verifying the data via the Search tool").

## 5. Self-Healing and Evaluator Agents

If an agent task fails functionally (even if the code ran without errors), the system must attempt to self-heal. [7]

* **Evaluator Agent Pattern:** Implement a secondary "Evaluator" prompt or lightweight agent that reviews the primary agent's output against the success criteria.
* **Feedback Loop:** If the Evaluator scores the output poorly, it generates a specific critique (e.g., "You missed step 3 of the instructions"). This critique is fed back to the primary agent to retry the task.

---
### References
[1] Galileo AI: The AI Agent Behavioral Validation Testing Playbook - <https://www.galileo.ai/learn/ai-observability/ai-agent-testing-behavioral-validation>
[2] LinkedIn: Writing Acceptance Criteria for AI Products - <https://www.linkedin.com/pulse/writing-acceptance-criteria-ai-products-product-managers-aruna-singh-iw7uc>
[3] Leantime: Adapting Project Management Techniques - <https://leantime.io/adhd-and-project-management-techniques-for-focus-and-organization/>
[4] IxDF: Wizard of Oz Prototyping - <https://www.interaction-design.org/literature/topics/wizard-of-oz-prototypes>
[5] Reddit: Acceptance Criteria for Gen AI features - <https://www.reddit.com/r/ProductManagement/comments/1egz6bg/acceptance_criteria_for_gen_ai_features/>
[6] Optimizely: Designing for Neurodiversity - <https://www.optimizely.com/insights/blog/designing-for-neurodiversity/>
[7] Product School: How to Create an AI Agent - <https://productschool.com/blog/product-management-2/how-to-build-ai-agent>
