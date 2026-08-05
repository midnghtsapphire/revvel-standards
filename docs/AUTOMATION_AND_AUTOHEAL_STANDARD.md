# Automation & Autoheal Standard

**Version:** 1.0.0  
**Status:** Active  
**Owner:** @midnghtsapphire  
**Last Updated:** 2026-06-14

---

## Purpose

This repository must not depend on a single human remembering recurring bugs,
workflow drift, malformed artifacts, or systemic automation failures later.
Operational memory belongs to the system.

This standard defines:

- who is allowed to detect and report systemic failures,
- what must happen when a recurring or compounding bug is noticed,
- how fix-first remediation takes priority over downstream content work,
- why history must be preserved instead of silently deleted,
- how long-running research hands off without a hard time cap, and
- why recursion is deferred until stronger safeguards exist.

---

## Authorized Detection Sources

A recurring or compounding failure may be detected by any of the following:

- Audrey
- Goap, acting as Audrey's operational proxy
- n8n workflows
- Gumloop workflows
- GitHub Actions workflows
- repo scripts, validators, and linters
- review agents
- audit and recovery monitors

Detection by any authorized source is a valid system event and must be treated
as durable operational memory.

---

## Detect → Record → Fix-First PR Rule

When any authorized detection source notices a recurring or compounding bug,
automation must do the following whenever safe and feasible:

1. Record the incident in audit logs.
2. Classify the failure type.
3. Create or update a root-cause issue when needed.
4. Create a **fix-first PR** immediately.
5. Quarantine affected PRs or items when the bug can spread, compound, or
   produce misleading review states.
6. Add or update versioned policy comments in the controlling workflow, script,
   or template.
7. Avoid human assignment by default unless automation has failed safely.

If a bug appears while implementing a process fix, that bug is in scope for the
same self-heal lane.

---

## Fix-First Priority Rule

If the same failure class appears repeatedly or can contaminate multiple PRs,
issues, or generated artifacts, the process-fix PR takes priority over
additional downstream content PRs.

Examples include:

- raw WR template placeholders leaking into committed artifacts,
- malformed intermediate WR documents reaching PR state transitions,
- assignment workflows escalating humans instead of triggering repair,
- review or approval labels drifting ahead of actual artifact validity,
- repeated lint failure classes across multiple PRs,
- bad merges or corrupt structured data.

---

## Human Assignment Rule

No workflow may auto-assign Audrey, Copilot, oAudrey, or any other human/user
by default for systemic failures.

Use the following, in this order, before any human escalation:

- labels,
- comments,
- audit records,
- deterministic repair scripts,
- autoheal routing,
- fix-first PR creation.

Human escalation is allowed only after:

1. autoheal has failed safely, and
2. the item is explicitly marked as requiring a human decision, such as
   `decision:unsafe-autofix` or `decision:merge-strategy-needed`.

---

## Preserve-Do-Not-Delete Rule

Business-critical logic, standards text, workflow reasoning, and historical
remediation paths must not be silently deleted.

When replacing or retiring meaningful logic:

- preserve history with comments, deprecation notes, or superseded blocks where
  practical,
- include the date and reason for the change,
- reference the incident, issue, or PR that caused the change,
- point to the replacement logic.

This rule is especially important for:

- revenue and product qualification logic,
- candidate-comparison and scoring systems,
- workflow safety gates,
- audit and self-heal behavior,
- routing and assignment behavior.

---

## Research Continuation Rule

Research must not be cut off solely because an arbitrary time threshold has
been reached.

If research grows too broad, too deep, or too long for a safe single pass, the
system must:

1. write a structured handoff,
2. record what was completed,
3. note unresolved questions or next tasks,
4. call another approved agent, lane, or workflow to continue.

The goal is continuation with preserved context, not premature truncation.

---

## Recursion Deferral Rule

Recursive or self-retriggering repair flows are deferred for now.

Do not introduce recursive repair behavior by default until all of the
following exist:

- deterministic guards,
- loop-prevention,
- attempt limits,
- audit visibility,
- safe degradation to quarantine or handoff.

Until then, use:

- single-pass autoheal,
- fix-first PR creation,
- continuation handoffs to another agent or lane.

---

## Versioned Policy Comment Rule

When an incident causes a workflow, script, or template to change, add a short
versioned policy comment where practical containing:

- policy name,
- version,
- date,
- incident reference,
- summary of the rule or behavior.

These comments create durable local memory at the point of execution.

---

## Incident Classes Always In Scope Once Detected

The following are always in scope for the self-heal lane once detected:

- raw WR template placeholders,
- missing WR permission or backing issue failures,
- premature PR status progression,
- bad merges,
- corrupt JSON, YAML, Markdown, or other structured data,
- repeated lint failure classes,
- research-review gate drift,
- human auto-assignment drift,
- audit gaps for systemic automation failures.

---

## Cross-References

- `docs/AUTOMATION_EXECUTION_STANDARD.md`
- `docs/AGENT_SPECIALTY_SKILLS_STANDARD.md`
- `docs/HIGH_VALUE_OPPORTUNITY_SELECTION_STANDARD.md`
- `docs/DOCS_FRESHNESS_STANDARD.md`
- `docs/WEEKLY_RESEARCH_PROCESS.md`
- `docs/process/SYSTEM_MAP.md`
