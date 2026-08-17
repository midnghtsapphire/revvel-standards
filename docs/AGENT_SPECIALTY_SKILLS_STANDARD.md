# Agent Specialty Skills Standard

**Version:** 1.0.0  
**Status:** Active  
**Owner:** @midnghtsapphire  
**Last Updated:** 2026-06-14

---

## Purpose

Generic reasoning is not sufficient for all repo-critical decisions. High-impact
automation must declare the specialty skill or review mode it is operating
under so standards, gates, and accountability remain clear.

---

## Rule

Agents operating in this repository must declare and follow a specialty mode
when handling high-impact workflow, review, or content decisions.

No agent may mark a WR, PR, or generated artifact as complete, reviewed, or
ready-to-merge using only generic reasoning when one of the specialty domains
below applies.

---

## Required Specialty Skills

### 1. WR Schema Review

Purpose:

- detect raw placeholders,
- detect scaffolding leakage,
- detect malformed WR structure,
- detect false checklist completion,
- decide whether a WR is raw, draft, intermediate, or valid.

Back this skill with deterministic WR linting and normalization scripts.

### 2. Research Review

Purpose:

- verify that issue intent is actually covered,
- check whether research is complete or still thin,
- distinguish sourced facts from assumptions,
- evaluate citation and evidence quality,
- ensure business and opportunity framing is present when required.

### 3. PR State Integrity

Purpose:

- compare labels and status to actual artifact validity,
- prevent `approved` or `ready-to-merge` drift,
- stop workflow state from outrunning content truth.

### 4. Merge/Corruption Review

Purpose:

- inspect current versus incoming versus both,
- detect bad merges,
- detect malformed JSON, YAML, Markdown, and other structured data,
- recommend a safe merge strategy.

Back this skill with deterministic parsers and validators where possible.

### 5. Autoheal Triage

Purpose:

- classify incident type,
- determine safe fix versus unsafe fix,
- choose quarantine, autoheal, or handoff,
- determine when a fix-first PR is required.

### 6. Automation Architecture Selection

Purpose:

- decide whether a task belongs in n8n, Gumloop, Cursor, a repo script,
  GitHub-native automation, a runner, or a semantic agent,
- reduce tool-choice drift across models and lanes.

---

## Optional Extended Skills

Additional specialty skills may be added over time, including:

- audit forensics,
- root-cause memory preservation,
- platform routing,
- revenue qualification review,
- copyright research continuation.

---

## Display and Review Guidance

Where practical, reviews and comments should identify the active specialty mode,
for example:

- `Review mode: WR Schema Review`
- `Review mode: Research Review`
- `Review mode: Merge/Corruption Review`
- `Review mode: Autoheal Triage`

This makes the active reasoning contract visible to humans and other agents.

---

## Deterministic Pairing Rule

If a specialty domain can be partially or fully expressed in deterministic
logic, pair the specialty skill with a script or workflow gate.

Examples:

- WR Schema Review → `wr/scripts/wr-lint.mjs`
- Merge/Corruption Review → JSON/YAML/Markdown validators
- PR State Integrity → workflow checks against blocking labels

Agents provide interpretation and synthesis; scripts and workflows provide hard
enforcement.

---

## Cross-References

- `docs/AUTOMATION_AND_AUTOHEAL_STANDARD.md`
- `docs/AUTOMATION_EXECUTION_STANDARD.md`
- `docs/WEEKLY_RESEARCH_PROCESS.md`
- `docs/process/SYSTEM_MAP.md`
