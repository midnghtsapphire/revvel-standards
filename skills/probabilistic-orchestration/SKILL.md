# Skill: Probabilistic Orchestration

**Skill Name:** `probabilistic-orchestration`
**Version:** 1.0.0
**Date:** 2026-08-05
**Status:** Active
**Category:** Fleet Operations / Agent Guardrails
**LLM:** Any
**Type:** Background (always active when processing AI output)
**Persona:** 🕵️ DRAGNET (PROBABILISTIC MODE)

---

## Purpose

When you transition from traditional programming (where a database query always returns the exact same format) to AI-driven pipelines, your biggest enemy is unpredictability. The AI might hallucinate a fact, ignore formatting instructions, or completely change the structure of its response.

To make these systems enterprise-ready, you have to build defensive "guardrails." Here is how you architect validation layers for probabilistic systems:

1. **The Prompt Validation Layer (Defensive Prompting)**
   Before writing a single line of code, you build boundaries directly into the prompt. You must anticipate how the model might fail and forbid it.
   Explicit Constraints: Instead of saying "Extract the dates," say, "Extract the dates. Format them strictly as YYYY-MM-DD. If no date is found in the provided text, output 'NULL'. Do not explain your answer."
   Grounding Rules: Explicitly tell the model: "Only use the provided context to answer. If the context does not contain the answer, say 'INSUFFICIENT_DATA'." This prevents hallucinations when a live web search comes back empty.

2. **The Structural Validation Layer (Code-Level)**
   You cannot trust an LLM to reliably generate raw text that your application can use. You must force the AI to return data in a structured format (usually JSON) and validate it programmatically.
   JSON Schema Enforcement: Use APIs that support "Structured Outputs" or function calling, forcing the AI to conform to a specific JSON structure.
   Schema Validators: Pass the AI's response through a validation library like Pydantic (for Python) or Zod (for TypeScript).
   Example: If your system expects {"price": 45.99, "in_stock": true}, and the AI returns {"price": "forty-five dollars", "in_stock": "yes"}, Pydantic will instantly throw a validation error because it expects a float and a boolean.

3. **The Self-Correction Loop (Agentic Retry)**
   In a traditional API, an error means the request failed. In an AI pipeline, an error is just feedback for the model.
   When your Pydantic/Zod validator catches a structural error, you don't crash the app. Instead, you write a loop that automatically sends the error message back to the AI.
   Prompt to the AI: "You generated an invalid response. Error: 'price must be a valid number'. Please correct your previous output and return valid JSON."
   Most models will instantly realize their mistake and fix it on the second try. (Usually, you cap this at 2 or 3 retries to save money and latency).

4. **The Factuality / Heuristic Layer**
   Just because the JSON is formatted correctly doesn't mean the data is true. You need programmatic sanity checks.
   Cross-referencing: If the AI search pipeline pulls a stock price, write code that checks if the returned number is within 10% of yesterday's closing price. If it says Apple is trading at $5,000, trigger a fallback.
   Confidence Scoring: Some pipelines ask the AI to self-rate its confidence or use a smaller, secondary LLM as a "Judge" to read the first model's output and score it for accuracy against the raw search data.

5. **Graceful Degradation (The Fallback)**
   If all retries fail, or the data doesn't pass the sanity checks, the system must fail gracefully.
   Instead of displaying a broken output to the user, default to a safe state: "We couldn't verify this information in real-time. Please check [Source Website] directly."

Mastering this architecture—where you treat the AI not as a magic 8-ball, but as an unreliable reasoning engine wrapped in strict programmatic constraints—is the definitive skill for building modern AI applications.

---

## Trigger Keywords

This skill activates when dealing with AI pipelines or parsing LLM outputs, especially:

```text
/probabilistic
/orchestration
/ai-validation
/dragnet (when context is AI response checking)
probabilistic-orchestration
```
