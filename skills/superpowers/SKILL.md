# Skill: Superpowers — Structured Software Development Framework

**Skill Name:** `superpowers`
**Version:** 1.0.0
**Date:** 2026-07-07
**Status:** Active
**Category:** Developer Workflow
**LLM:** Claude (all tiers — Haiku, Sonnet, Opus)
**Type:** Composable — load individual modules or the full suite
**Persona:** 🦸 Superpowers
**Source:** [Claude Plugins — Superpowers](https://claude.com/plugins/superpowers)

---

## Purpose

**Superpowers** is a composable skills framework that teaches Claude structured software development methodologies. It enforces disciplined practices at every stage of the development cycle:

- **Pre-coding** — Socratic `/brainstorming` sessions that lock requirements before a line of code is written
- **Implementation** — red-green-refactor TDD cycles where tests *must* fail before implementation begins
- **Debugging** — four-phase systematic methodology; architectural review auto-triggers after three failed fix attempts
- **Review** — subagent-driven development with a built-in `code-reviewer` agent that evaluates against the original plan, coding standards, and architectural principles
- **Skill authoring** — `writing-skills` module that applies TDD principles to documentation

Load any combination of modules; each module is independently useful and composes with the others.

---

## What This Skill Does

| Module | Slash Command | Description |
|---|---|---|
| **Brainstorming** | `/brainstorming` | Socratic requirements refinement before any implementation begins |
| **TDD** | `/tdd` | Red-green-refactor cycle — tests must fail first, then pass, then refactor |
| **Debug** | `/debug` | Four-phase systematic debugging: root cause → pattern → hypothesis → fix |
| **Execute Plan** | `/execute-plan` | Batched implementation plans with code-reviewer checkpoints |
| **Writing Skills** | `/writing-skills` | Author and test new skills using TDD principles applied to documentation |

---

## Trigger Keywords

```text
superpowers, /brainstorming, /tdd, /execute-plan, /debug superpowers,
/writing-skills, red-green-refactor, structured tdd, four-phase debug,
subagent code review, composable skill framework, claude superpowers plugin
```

---

## Module Reference

### `/brainstorming` — Socratic Requirements Refinement

**When to use:** At the very start of any new feature, product, or system design.

**Rules:**
1. Do NOT write any code or implementation plans until the brainstorming session ends with an explicit sign-off.
2. Ask one probing question at a time.
3. Explore: Who is affected? What are the constraints? What does success look like? What could go wrong?
4. Produce a structured requirements summary before exiting the session.

**Exit condition:** User says "done brainstorming" or "proceed to implementation."

**Output format:**
```markdown
## Requirements Summary
- Functional: [list]
- Non-functional: [list]
- Constraints: [list]
- Acceptance criteria: [list]
```

---

### `/tdd` — Red-Green-Refactor TDD

**When to use:** Any time you are writing new logic, a new feature, or fixing a bug.

**Mandatory pipeline:**

```text
RED   → Write tests that describe the desired behaviour.
        Tests MUST fail at this stage. If they pass, stop and fix the tests.
GREEN → Write the minimum implementation to make all tests pass.
        No gold-plating; smallest change that makes tests green.
REFACTOR → Clean up code without changing behaviour.
           All tests MUST remain green after refactoring.
```

**Rules:**
- Never skip the RED phase. A test that passes before implementation is not a valid test.
- Commit each phase separately: `test: red — <description>`, `feat: green — <description>`, `refactor: clean — <description>`.
- If a test is hard to write, that is a design signal — refactor the design before writing the test.

---

### `/debug` — Four-Phase Systematic Debugging

**When to use:** Any time a bug, failure, or unexpected behaviour is reported.

**Phase 1 — Root Cause Investigation**
- Reproduce the issue with a minimal reproducible example.
- Read logs, stack traces, and error messages in full before guessing.
- State the root cause hypothesis before touching any code.

**Phase 2 — Pattern Analysis**
- Has this pattern occurred before? Search the codebase and issue history.
- Classify: logic error, type mismatch, race condition, state corruption, external API, config, etc.

**Phase 3 — Hypothesis Testing**
- Write a failing test that reproduces the bug before applying the fix.
- Apply one fix at a time; do not bundle multiple speculative fixes.

**Phase 4 — Implementation**
- Apply the minimal fix.
- Confirm the failing test now passes.
- Run the full test suite to check for regressions.

**Escalation rule:** After three failed fix attempts, stop and trigger architectural review. Do not keep guessing. Open a `[ARCH-REVIEW]` issue documenting all three hypotheses and why they failed.

---

### `/execute-plan` — Batched Implementation with Review Checkpoints

**When to use:** Any implementation task with ≥ 3 steps or multiple files.

**Pipeline:**
1. Write the full implementation plan before writing any code.
2. Get explicit approval on the plan (or auto-proceed if plan was generated from a `/brainstorming` session summary).
3. Implement in batches; each batch ends with a `code-reviewer` checkpoint.
4. The `code-reviewer` agent evaluates: plan adherence, coding standards, architectural principles.
5. Address all `code-reviewer` findings before proceeding to the next batch.

**Batch format:**
```markdown
## Batch N — [Batch Title]
### Files changed: [list]
### What changed and why: [description]
### code-reviewer checkpoint: PASS / CHANGES NEEDED
```

---

### `/writing-skills` — TDD for Documentation and Skill Authoring

**When to use:** When authoring a new skill, writing a standard, or producing any documentation that will be used as an agent instruction.

**Pipeline (mirrors TDD):**
```text
RED   → Define what the skill/doc must make an agent do or not do.
        Write 3+ assertion statements that the finished doc must satisfy.
        Example: "An agent reading this MUST refuse to skip the RED phase."
GREEN → Write the minimal skill/doc that satisfies all assertions.
REFACTOR → Tighten language; remove ambiguity; add examples.
```

**Assertions are mandatory.** Every new skill must ship with ≥ 3 assertions in a `tests/` block at the bottom of the SKILL.md.

---

## code-reviewer Agent

The `code-reviewer` is a subagent spawned by `/execute-plan` at each batch checkpoint.

**Evaluation criteria:**
1. **Plan adherence** — Does the implementation match the approved plan?
2. **Coding standards** — Does it follow the repo's `standards/` docs?
3. **Architectural principles** — Does it respect existing patterns (no new frameworks, no global state leaks)?
4. **Test coverage** — Are new code paths covered by tests?
5. **Security** — Any injections, exposed secrets, or auth bypasses?

**Output format:**
```text
✅ PASS — [summary of what's good]
🟡 CHANGES NEEDED — [numbered list of required changes]
🔴 BLOCKED — [reason; must escalate before proceeding]
```

---

## Composability Matrix

| If you are... | Load these modules |
|---|---|
| Starting a new feature | `/brainstorming` → `/tdd` → `/execute-plan` |
| Fixing a bug | `/debug` → `/tdd` (for the regression test) |
| Building a new skill or doc | `/brainstorming` → `/writing-skills` |
| Reviewing an implementation | `code-reviewer` (via `/execute-plan`) |
| Full disciplined session | All modules |

---

## Agent Instructions (System Prompt)

```text
You have the Superpowers skills framework loaded. This framework enforces
structured software development discipline. You MUST follow these rules:

1. NEVER write code before a /brainstorming session when a new feature is
   requested. Ask to run /brainstorming first unless already completed.

2. NEVER skip the TDD RED phase. Tests must fail before implementation.
   If a test passes before you write any implementation code, the test
   is wrong — fix it.

3. NEVER apply a bug fix without first reproducing the bug in a test.
   The fix is not done until the reproduction test passes.

4. ALWAYS trigger architectural review after three failed fix attempts.
   Stop guessing. Open a [ARCH-REVIEW] issue.

5. ALWAYS use /execute-plan for tasks with 3 or more steps.
   End each batch with a code-reviewer checkpoint.

6. You may load individual modules: /brainstorming, /tdd, /debug,
   /execute-plan, /writing-skills. They are independently useful.

Sign your messages with 🦸 when operating in Superpowers mode.
```

---

## Skill Assertions (Tests)

An agent reading this skill MUST:

1. Refuse to generate implementation code when asked to start a new feature without first completing a `/brainstorming` session or a requirements summary.
2. Refuse to mark a TDD cycle complete if the test passed before the implementation was written (RED phase violation).
3. Stop attempting to fix a bug after three failed attempts and instead open an `[ARCH-REVIEW]` escalation issue.
4. Spawn the `code-reviewer` subagent at the end of each `/execute-plan` batch before proceeding to the next batch.
5. Require ≥ 3 assertion statements when authoring a new skill via `/writing-skills`.

---

## Related Skills

- **brainstorming** — Existing Revvel brainstorming skill; Superpowers `/brainstorming` extends it with enforced exit conditions and a structured requirements summary output
- **code-review** — Existing Revvel code review skill; Superpowers `code-reviewer` uses it as a subagent within `/execute-plan`
- **testing** — Existing Revvel testing skill; Superpowers `/tdd` enforces the red-green-refactor contract on top of it
- **skill-forge** — Use with `/writing-skills` to author new skills end-to-end
- **ralph-loop** — Self-healing error recovery; complements `/debug` Phase 4 escalation
