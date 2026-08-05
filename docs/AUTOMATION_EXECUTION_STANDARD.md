# Automation Execution Standard

**Version:** 1.0.0  
**Status:** Active  
**Owner:** @midnghtsapphire  
**Last Updated:** 2026-06-14

---

## Purpose

Different automation surfaces solve different classes of problems. This
standard defines when to use n8n, Gumloop, Cursor, repo scripts, GitHub-native
automation, runners, and agents so decisions do not drift by model preference
or convenience.

---

## Selection Rule

Choose the simplest execution surface that satisfies the task while preserving:

- determinism where determinism is required,
- semantic depth where judgment is required,
- auditability,
- low operator memory burden,
- compatibility with fix-first remediation.

When a task spans multiple surfaces, separate the work by responsibility rather
than forcing one tool to do everything.

---

## n8n

Use **n8n** for process orchestration across systems.

Typical uses:

- multi-step stateful workflows,
- retries and queues,
- database writes and audit routing,
- cross-system label/comment/update coordination,
- autoheal dispatch after a repo event has been classified.

Use n8n when the problem is primarily **orchestration**.

---

## Gumloop

Use **Gumloop** for AI-heavy, visual, no-code or low-code workflows that benefit
from semantic classification, enrichment, or content routing.

Typical uses:

- semantic incident classification,
- research enrichment,
- AI review comment drafting,
- anomaly summaries,
- pattern recognition across inputs before handing off to another lane.

Do not use Gumloop as the sole deterministic enforcement layer for merge gates,
schema validity, or audit truth.

---

## Cursor

Use **Cursor** as an approved industry-recognized coding and review lane.

Typical uses:

- fallback coding lane,
- review and implementation assistance,
- GitHub-integrated background agent or app workflows where available,
- external-facing trust and authority signaling,
- cutover or continuity when another provider is unavailable.

Do not rely on Cursor alone for deterministic enforcement of:

- merge blocking,
- WR schema validity,
- corrupt-data detection,
- audit source-of-truth behavior.

---

## Repo Scripts

Use **repo scripts** for deterministic, testable logic that should live with the
codebase.

Typical uses:

- file validation,
- normalization,
- Markdown/JSON/YAML parsing,
- WR linting,
- structured-data validation,
- merge/corruption detection,
- repeatable transformations that must run locally and in CI.

If the logic must be **deterministic**, it should generally exist as a script.

---

## GitHub-Native Automation

Use **GitHub Actions and repo-native automation** for repository event triggers,
merge enforcement, required checks, labels, comments, and dispatch.

Typical uses:

- PR open/sync/review workflows,
- merge-blocking checks,
- status transitions,
- invoking scripts,
- routing to n8n, Gumloop, Cursor, or another system.

If the task is **repo enforcement or event handling**, GitHub-native automation
is usually the right home.

---

## Runners

Use **runners** when hosted GitHub runners are insufficient.

Typical uses:

- private network access,
- specialized binaries or browsers,
- heavy compute or long-running jobs,
- GPUs or stateful services,
- environments requiring custom persistence or infrastructure.

Choose runners only when the workload truly requires a special execution
environment.

---

## Agents

Use **agents** for judgment-heavy, ambiguous, or semantic tasks.

Typical uses:

- research synthesis,
- review explanations,
- merge strategy recommendations,
- root-cause narratives,
- prioritization support,
- high-level reasoning over multiple candidate approaches.

Agents must not be the sole deterministic gate where a rule can be expressed in
a script or workflow check.

---

## Combined Patterns

Recommended combined patterns in this repository:

1. **GitHub Action + Script**
   - event trigger + deterministic enforcement.
2. **GitHub Action + n8n**
   - repo event + cross-system orchestration.
3. **Script + Gumloop or Agent**
   - deterministic validation + semantic explanation.
4. **Cursor + GitHub-native automation**
   - implementation/review lane + repo enforcement.
5. **Handoff chain for long research**
   - one agent/lane writes a handoff and another continues.

---

## Research Continuation Policy

Do not hard-cap research because of elapsed time alone.

When research becomes too large for one pass:

- preserve findings in a handoff,
- transfer the unresolved work to another agent or lane,
- keep the context durable,
- continue rather than truncate.

This rule matters especially for broad systems research, including future
copyright-system work and other long-range engine investigations.

---

## Anti-Patterns

Avoid the following:

- using a semantic agent as the only merge gate when a deterministic script is
  possible,
- encoding business-critical repo logic only inside an external orchestration
  flow,
- using a runner when a normal GitHub Action is sufficient,
- auto-assigning humans instead of routing to labels, audit, and autoheal,
- collapsing multiple distinct responsibilities into one vendor-specific tool.

---

## Cross-References

- `docs/AUTOMATION_AND_AUTOHEAL_STANDARD.md`
- `docs/AGENT_SPECIALTY_SKILLS_STANDARD.md`
- `docs/HIGH_VALUE_OPPORTUNITY_SELECTION_STANDARD.md`
- `docs/AGENT_FALLBACK_PROCESS.md`
- `docs/process/SYSTEM_MAP.md`
