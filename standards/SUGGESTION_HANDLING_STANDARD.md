# Suggestion Handling Standard

**Version:** 1.0.0  
**Status:** Active  
**Owner:** @midnghtsapphire  
**Last Updated:** 2026-05-17

---

## Core Rule

> **All suggestions — from @midnghtsapphire, Jules, any agent, any review, any comment — are unresearched hearsay until independently verified. They must never block or stop automation.**

---

## Definitions

| Term | Meaning |
|------|---------|
| **Suggestion** | Any instruction, hint, comment, or idea from a human, agent, or automated review that is not backed by a cited, researched source |
| **Blocking** | Any action that halts, pauses, fails, or gates a workflow, PR, or automation run |
| **Hearsay** | Unverified input that may be directionally useful but is not authoritative |

---

## Rules

### 1. Suggestions Are Never Blocking

No suggestion from any source — including the repository owner — may cause a workflow, CI check, PR merge gate, or automation pipeline to fail, halt, or pause.

- `fail_on` settings in agent review actions must be set to `never`
- Review comments posted by Jules, Copilot, Bito, or any other AI reviewer are **informational only**
- A suggestion that cannot be actioned must be logged and skipped — not used as a blocker

### 2. Suggestions Are Research Starting Points

Every instruction or hint received is a hypothesis, not a directive:

- Research it before acting on it
- Verify it against documentation, live code, or external sources
- Self-correct immediately if it turns out to be wrong, incomplete, or inapplicable
- Never fail because an instruction was ambiguous or imprecise

### 3. Agent Self-Correction Is Mandatory

When a suggestion leads to a dead end or an error:

1. Try an alternative path immediately — do not wait for the suggestion author to clarify
2. Document what was tried and why it did not work
3. Continue automation without pausing for human input

### 4. Jules Review Is Advisory

Jules (Google Gemini) PR reviews and issue comments are advisory:

- They are informational — not required approvals
- They do not constitute a merge gate
- `jules-pr-reviewer.yml` must run with `fail_on: never`
- Any Jules suggestion that conflicts with working, tested code is ignored in favor of the code

### 5. Owner Suggestions Follow the Same Rule

Suggestions from @midnghtsapphire are valuable directional inputs but carry the same hearsay status:

- They are not pre-researched unless explicitly tagged with a citation
- Agents must validate them before acting
- If validation fails, agents self-correct and continue — they do not escalate back for permission

---

## Enforcement

| Component | Required Setting |
|-----------|-----------------|
| `jules-pr-reviewer.yml` | `fail_on: never` |
| Any AI reviewer action | `fail_on: never` or equivalent |
| Triage / classification agents | Must continue on ambiguous input |
| All workflow `on_error` handlers | Must attempt alternatives before creating human-escalation issues |

---

## References

- [`docs/AGENTS.md`](../docs/AGENTS.md) — Suggestion Handling section under Obsessive Autonomy
- [`docs/AGENTS.md`](../docs/AGENTS.md) — The Autonomy Mandate, rule 1: "Never stop at blockers"
- [`standards/ZERO_HUMAN_FRAMEWORK.md`](./ZERO_HUMAN_FRAMEWORK.md)
- [`standards/SELF_HEALING_STANDARDS.md`](./SELF_HEALING_STANDARDS.md)
