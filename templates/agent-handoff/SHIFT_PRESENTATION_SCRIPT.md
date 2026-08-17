# S.H.I.F.T. AI-Only Test Plan — Presentation Script

**Title:** S.H.I.F.T.: A Behavioral Testing Framework for Autonomous AI Agents
**Audience:** Technical leads, AI developers, product owners
**Duration:** ~15–20 minutes
**Format:** 8 slides + Q&A

---

## Slide 1 — Title Slide

**Slide Heading:** S.H.I.F.T.: Testing AI Agents on Intent, Not Just Execution

**Speaker Script:**

"Good morning. Today I want to talk about a problem that every team building with autonomous AI agents runs into — and most teams don't realize they have it until something ships broken.

The problem is this: your agent runs. No errors. Clean logs. The CI pipeline is green. And then a real user touches it, and it does completely the wrong thing.

That is not a code problem. That is a testing problem. And the framework we use today — unit tests, integration tests, pass/fail — was never designed for agents that make decisions. It was designed for deterministic software that does the same thing every time.

S.H.I.F.T. is our answer to that. It stands for Self-Healing Intent-Focused Tasks. And it is the mandatory testing standard for every AI agent we build."

---

## Slide 2 — The Problem: Zero Errors Is Not a Passing Grade

**Slide Heading:** An Agent Can Hit Zero Errors and Still Completely Fail Its User

**Speaker Script:**

"Let me make this concrete. Imagine you have an agent that is supposed to prioritize a user's tasks. You give it a work deadline and a past-due utility bill. The agent runs. No exceptions thrown. No API errors. The code is clean.

But the agent generates a work plan and completely ignores the utility bill.

By every traditional testing metric, that agent passed. Zero errors. But it failed the user. It failed the intent.

This is the core gap in how we test AI today. Traditional software is deterministic — the same input always produces the same output. You can write a test that says 'given this input, expect this output' and it will be valid forever.

Agents are not deterministic. They reason. They prioritize. They make judgment calls. And a judgment call cannot be validated with a simple assertion.

The industry calls this the difference between execution testing and behavioral validation. We are moving to behavioral validation."

---

## Slide 3 — The S.H.I.F.T. Framework Overview

**Slide Heading:** S.H.I.F.T. Replaces Binary Pass/Fail with Five Dimensions of Agent Quality

**Speaker Script:**

"S.H.I.F.T. is built around five pillars. Think of them as the five questions you ask after every agent run — not 'did it crash?' but 'did it actually work?'

The five letters stand for: Spec-First, Handoff Contracts, Intent Validation, Feedback Loop, and Tiered Oversight.

But the framework is evaluated across five dimensions of agent behavior, which I will walk through on the next slide. These dimensions come directly from the Galileo AI Behavioral Validation Playbook and represent the current state of the art in agent evaluation.

The key mindset shift is this: we are not testing software. We are evaluating an agent's decision-making quality. That requires a different kind of test."

| Pillar | What It Means |
|---|---|
| **S — Spec-First** | Every task starts with a Technical Design Spec the agent writes first |
| **H — Handoff Contracts** | Every boundary between agents is treated as a rigid API contract |
| **I — Intent Validation** | Test what the user wanted, not just what the code did |
| **F — Feedback Loop** | When an agent fails, it must reflect and update its own instructions |
| **T — Tiered Oversight** | Humans stay in the loop for high-stakes decisions; automation handles the rest |

---

## Slide 4 — The Five Dimensions of Agent Evaluation

**Slide Heading:** Every Agent Must Pass Five Dimensions Before It Is Considered Done

**Speaker Script:**

"Here are the five dimensions we evaluate every agent against. These are not optional. An agent that fails any one of these is not done — regardless of whether the code runs clean.

**Memory.** Does the agent accurately retain and retrieve information from its context? If you told it something three messages ago, does it still know? If an API returned a specific value, does it use that exact value or does it hallucinate a different one?

**Reflection.** Can the agent recognize when it is failing? Can it detect when two tasks are in conflict and surface that conflict rather than silently choosing one? This is where most agents fail — they do not know what they do not know.

**Planning.** Are the agent's proposed strategies logically sequenced and actually feasible? An agent that generates a 48-hour plan that requires 72 hours of work has failed the Planning dimension, even if every individual step is correct.

**Action.** Do the agent's outputs — the tool calls, the generated files, the API requests — align exactly with the user's intent and the defined spec? This is where the Handoff Contract matters most. If the agent passes data to the next step in the wrong format, the whole chain breaks.

**System Reliability.** How does the agent handle the unexpected? API timeouts, missing data, edge cases — does it fail gracefully with a clear message, or does it hallucinate data to fill the gap? Hallucination under pressure is one of the most dangerous failure modes in production agents."

---

## Slide 5 — Wizard of Oz Prompt Engineering

**Slide Heading:** The Best System Prompts Are Written by Humans Roleplaying the Agent First

**Speaker Script:**

"Before we write a single line of code for a new agent workflow, we use a technique called the Wizard of Oz method. The name comes from UX research — the idea that you can simulate a system's behavior manually before building it, to validate that the behavior is actually what you want.

Here is how it works in practice.

First, you write out the exact input a user would give the agent. Be specific. Use real data. Do not use placeholder text.

Second, you manually type out the ideal response. Not what you think the agent will do — what you want it to do. Walk through every step. Every tool call. Every piece of reasoning. Write it out as if you are the agent.

Third, you take that manual response and inject it directly into the agent's system prompt as a few-shot example. The agent now has a concrete demonstration of the intent and tone you expect — written in your own words, not generated from generic training data.

This is the single most effective technique for closing the gap between 'zero errors' and 'actually works.' The agent learns your intent from your own manual roleplay. That is far more precise than any unit test."

---

## Slide 6 — Agent Persona Guardrails

**Slide Heading:** Agents Without Explicit Identity Constraints Will Make Dangerous Assumptions

**Speaker Script:**

"One of the most common failure modes in production agents is what I call assumption drift. The agent is not given a clear identity or clear constraints, so it fills in the gaps with its own assumptions. Those assumptions are often wrong.

We prevent this with three mandatory guardrails on every agent.

The first is Identity Definition. Every agent must have a clearly stated role in its system prompt. Not a vague description — a precise, functional definition. For example: 'You are an Executive Function routing agent responsible for parsing incoming webhooks and categorizing them by priority. You are not a general assistant.'

The second is Reasoning Loops. We require every agent to output its reasoning before taking action. In practice, this means prompting the agent to produce a thought block — a structured internal monologue — before it executes any tool call. This makes the agent's decision-making auditable. You can read the thought block and see exactly why the agent did what it did.

The third is Explicit Forbiddances. We define not just what the agent should do, but what it must never do. For example: 'You must not generate a response without first verifying the data via the Search tool.' Negative constraints are as important as positive ones. Agents will find the path of least resistance — explicit forbiddances close those paths."

---

## Slide 7 — The Self-Healing Evaluator Pattern

**Slide Heading:** A Second Agent Scoring the First Is the Most Reliable Self-Healing Mechanism

**Speaker Script:**

"The final piece of the S.H.I.F.T. framework is the Evaluator Agent pattern. This is how we make agents self-healing.

The concept is simple. After the primary agent completes a task, a secondary Evaluator agent reviews the output against the success criteria. The Evaluator is not the same agent — it is a separate prompt, often a lighter-weight model, with a single job: score the output and explain why.

If the Evaluator scores the output above the threshold, the task is marked complete. If it scores below the threshold, the Evaluator generates a specific, actionable critique. Not a generic error message — a targeted explanation of exactly what was missed. For example: 'You completed steps 1, 2, and 4 but skipped step 3. The output is missing the required validation check.'

That critique is then fed back to the primary agent as a new instruction, and the agent retries the task with the critique as additional context.

This loop runs until the output passes the Evaluator's threshold or until a maximum retry count is reached, at which point a human escalation is triggered.

The key insight here is that the Evaluator does not need to be a large, expensive model. It just needs to be precise. A small model with a well-crafted evaluation prompt can catch the majority of functional failures that a unit test would completely miss."

---

## Slide 8 — Implementation Checklist and Call to Action

**Slide Heading:** Every New Agent Build Starts with S.H.I.F.T. — No Exceptions

**Speaker Script:**

"To close, here is the mandatory checklist that every agent build in our ecosystem must complete before it is considered production-ready.

Before writing code: write the Wizard of Oz few-shot examples. Define the agent's identity, reasoning loop format, and explicit forbiddances. Write the acceptance criteria for all five dimensions.

During development: implement the Evaluator agent pattern alongside the primary agent. Do not treat it as an afterthought — it is part of the architecture from day one.

Before shipping: run the agent against all five dimensions. Memory, Reflection, Planning, Action, System Reliability. Document the results. If any dimension fails, the agent does not ship.

After shipping: the self-healing monitor runs on a scheduled interval, re-evaluating the agent's behavior against the same five dimensions in production. If a dimension degrades over time — which happens as the data environment changes — the monitor flags it and triggers a review.

The goal is not to eliminate failure. The goal is to make failure visible, recoverable, and instructive. That is what S.H.I.F.T. is designed to do.

Thank you. I am happy to take questions."

---

## Q&A Preparation Notes

The following questions are likely to arise and should be prepared for:

| Likely Question | Prepared Answer |
|---|---|
| How is this different from prompt engineering? | Prompt engineering is how you write the instructions. S.H.I.F.T. is how you test whether those instructions produced the right behavior. They are complementary, not the same. |
| What model do you use for the Evaluator agent? | Any model with strong instruction-following works. We use lightweight models to keep cost low — the Evaluator prompt does the heavy lifting, not the model size. |
| How do you handle non-determinism in the tests? | We run each test scenario multiple times and evaluate the distribution of outputs, not a single output. A pass requires consistent behavior across runs, not just one correct response. |
| Does this work for multi-agent pipelines? | Yes — the Handoff Contract pillar is specifically designed for multi-agent chains. Each handoff point gets its own contract and its own Evaluator check. |
| How long does this add to the development cycle? | The WoZ roleplay and guardrail definition typically adds two to four hours per agent. The Evaluator pattern adds one to two days. The time saved in debugging and rework is significantly higher than the upfront cost. |

---

### References

[1] Galileo AI: The AI Agent Behavioral Validation Testing Playbook — <https://galileo.ai/learn/ai-observability/ai-agent-testing-behavioral-validation>
[2] LinkedIn: Writing Acceptance Criteria for AI Products — <https://www.linkedin.com/pulse/writing-acceptance-criteria-ai-products-product-managers-aruna-singh-iw7uc>
[3] IxDF: Wizard of Oz Prototyping — <https://www.interaction-design.org/literature/topics/wizard-of-oz-prototypes>
[4] Reddit: Acceptance Criteria for Gen AI Features — <https://www.reddit.com/r/ProductManagement/comments/1egz6bg/acceptance_criteria_for_gen_ai_features/>
[5] Product School: How to Create an AI Agent — <https://productschool.com/blog/product-management-2/how-to-build-ai-agent>
