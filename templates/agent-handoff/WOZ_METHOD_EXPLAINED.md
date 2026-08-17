# The Wizard of Oz Method for Writing a System Prompt

## The Core Idea

The name comes from the 1939 film. Behind the curtain, a very ordinary man was manually operating levers and pulling strings to make the Great and Powerful Oz appear to function. The audience believed they were interacting with a magical autonomous system. They were not. A human was doing the work in real time.

In AI development, the Wizard of Oz method means **you manually play the role of the AI before you build the AI.** You become the wizard behind the curtain. You respond to real inputs by hand, exactly as you want the finished agent to respond. You do this repeatedly, across many different scenarios, until you have a collection of high-quality input/output pairs. Those pairs then become the foundation of your system prompt — specifically the few-shot examples section.

The result is a system prompt that teaches the agent your intent in your own words, not in generic training language.

---

## Why Generic System Prompts Fail

Most developers write system prompts like this:

> *"You are a helpful assistant. Be concise, accurate, and professional. Do not make things up."*

This tells the agent nothing about the specific situation it will face. It has no examples of what "good" looks like in your context. The agent will default to its training data — which is averaged across millions of conversations from millions of people — none of whom are you, your users, or your domain.

The Wizard of Oz method solves this by replacing vague instructions with **demonstrated behavior.** You show the agent what you mean instead of telling it.

---

## The Four-Step Process

### Step 1 — Define the Scenario

Write down the exact situation the agent will face. Be specific. Do not describe the agent's job in general terms. Describe the hardest, most ambiguous case it will encounter.

For the GrowlingEyes Scarecrow agent, the scenario was:

> *A user has a past-due bill notification AND a work deadline on the same day. Both are urgent. The agent must help them decide what to handle first without causing anxiety or making the decision feel impossible.*

This is the "conflict scenario" — the edge case where a generic agent would either freeze, give a useless both-sides answer, or make the user feel worse.

---

### Step 2 — Roleplay the Response Manually

You sit down and write the response yourself. No AI. No template. Just you, thinking through what the ideal response actually looks like.

You ask yourself: *If I were the most calm, competent, and caring version of this agent, what would I say right now?*

For the Scarecrow scenario, a manual roleplay response might look like this:

> *"You have two things competing for your attention right now, and that is genuinely hard. Here is what I see: the past-due bill has a fixed consequence — a late fee or a service interruption — that gets worse the longer it waits. The work deadline has a human on the other end who can, in most cases, receive a short message from you. My suggestion: spend 4 minutes right now paying the bill or setting up a payment arrangement. Then send your colleague a one-sentence heads-up. You have not failed either obligation. You have just sequenced them."*

Notice what this response does. It does not say "both are important." It does not ask the user to make a choice without help. It sequences the decision, explains the reasoning, and ends with reassurance. That is the behavior you want the agent to replicate.

---

### Step 3 — Extract the Pattern

After you have written 3 to 5 manual responses across different scenarios, you read them back and look for the pattern in your own behavior. You will find that you consistently do certain things:

- You name the tension explicitly before resolving it
- You give a concrete first action, not a list of options
- You explain *why* one thing comes before the other
- You end with a statement that reduces guilt or anxiety

Those patterns become your **persona guardrails** in the system prompt. They are not rules you invented abstractly — they are rules you discovered by observing yourself.

---

### Step 4 — Inject as Few-Shot Examples

You take your manual roleplay pairs (the input scenario + your handwritten response) and place them directly in the system prompt as examples. The format looks like this:

```text
<example>
User: I have a past-due bill and a work deadline today. I don't know what to handle first.

Scarecrow: You have two things competing for your attention right now, and that is genuinely hard.
Here is what I see: the past-due bill has a fixed consequence that gets worse the longer it waits.
The work deadline has a human on the other end who can receive a short message from you.
My suggestion: spend 4 minutes paying the bill or setting up a payment arrangement.
Then send your colleague a one-sentence heads-up.
You have not failed either obligation. You have just sequenced them.
</example>
```

The agent now has a concrete demonstration of exactly what "good" looks like. It does not have to infer your intent from abstract instructions. It has seen your intent in action.

---

## What a Complete System Prompt Looks Like After WoZ

A system prompt built using the Wizard of Oz method has four distinct sections:

```text
[1. IDENTITY]
You are Scarecrow, a calm and structured decision-support agent for GrowlingEyes users.
Your job is to help users prioritize competing obligations without increasing their anxiety.

[2. PERSONA GUARDRAILS — discovered from the roleplay patterns]
- Always name the tension before resolving it
- Always give one concrete first action, never a list of options
- Always explain why one thing comes before the other
- Always end with a reassurance that the user has not failed
- Never use the phrase "it depends" without immediately following it with a specific answer

[3. FEW-SHOT EXAMPLES — your actual manual roleplay pairs]
<example>
User: I have a past-due bill and a work deadline today...
Scarecrow: You have two things competing...
</example>

<example>
User: My kid is sick and I have a presentation in two hours...
Scarecrow: [your handwritten response]
</example>

[4. CONSTRAINTS]
- Do not diagnose, prescribe, or give legal advice
- Do not make the user feel judged for their situation
- If you do not know something, say so clearly and offer a next step
```

This structure is why WoZ-built agents feel different from generic ones. The identity tells the agent who it is. The guardrails tell it how it behaves. The examples show it what that behavior looks like in practice. The constraints tell it where the edges are.

---

## The Key Insight

The Wizard of Oz method works because **you already know how to do the job.** You know what a good response to a stressed user looks like. You know what tone feels right. You know when to be direct and when to be gentle. The agent does not know any of that — until you show it.

The few-shot examples are not training data in the technical sense. They are a mirror. You hold up your own best behavior and say: *be like this.* The agent learns your intent from your own words, not from averaged-out patterns across the internet.

That is the difference between a system prompt that was written and a system prompt that was earned.

---

## When to Use WoZ vs. When to Skip It

| Situation | Use WoZ? |
|---|---|
| Agent handles emotionally sensitive decisions | **Yes — always** |
| Agent must match a specific brand voice or tone | **Yes** |
| Agent handles ambiguous, multi-factor inputs | **Yes** |
| Agent does a simple, well-defined task (e.g., format a date) | No — standard instructions are fine |
| You are prototyping quickly and will iterate | Yes — even 2 examples are better than none |
| You have no idea what the agent should say | **Yes — this is exactly when WoZ is most valuable** |

---

## The GrowlingEyes Application

For GrowlingEyes specifically, the WoZ method applies to every agent persona in the system:

| Agent | Conflict Scenario to Roleplay |
|---|---|
| **Scarecrow** (decision support) | Competing urgent obligations |
| **Tin Man** (emotional check-in) | User is overwhelmed by threat data |
| **Dorothy** (navigation guide) | User does not know which domain to look at first |
| **Toto** (anomaly detector) | Data looks wrong but is not definitively wrong |

For each one: write the scenario, roleplay the response by hand, extract the pattern, inject as few-shot examples. The agent will behave like you — because it learned from you.
