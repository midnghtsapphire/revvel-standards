# WR: Provenance-ledger automation — record observable agent provenance per action

**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Created:** 2026-06-28
**Last Updated:** 2026-06-28
**Language:** Markdown / JS (workflow + script)
**WR Status:** 📝 Draft — pending human filing

> NOTE: This is a DRAFT WR file authored during a review session. It is not yet a
> filed GitHub issue. The repo owner (or `/dragnet`) must open the actual issue;
> a committed `.md` file does not create the issue. Rename with the real issue
> number when filed.

---

## Executive Summary

`AGENTS.md:52-54` mandates a provenance ledger ("who proposed the idea, who
executed, which model/route was used, how long it took, how it scored"). **Most of
this already exists** and was verified during the PR #14772 review session — see
"Prior Art" below. This WR is therefore NOT a greenfield build; it is a targeted
**extension** of the existing `.github/workflows/agent-audit-logger.yml` to close
three specific gaps, addressing the owner's request to "know where they're getting
their resources and have all that information in a file."

**Scope boundary (important):** this captures OBSERVABLE provenance only — which
model/route ran, which tools/sources it used, what it changed, with citations. It
does NOT capture hidden chain-of-thought / internal reasoning, which model
providers (OpenAI, Anthropic, Google, etc.) do not expose. Do not promise or build
a "complete AI thinking dump" — it cannot be truthfully produced.

---

## Prior Art (verified — do NOT rebuild)

- `.github/workflows/agent-audit-logger.yml:117-139` already logs every agent
  action to `logs/agent-audit/audit.jsonl`: timestamp, event_type, actor,
  agent_type (bot/human), resource, workflow_name, labels, assignees.
- `.github/workflows/agent-audit-logger.yml:101-136` already provides tamper-evident
  chain integrity via `prev_hash` + SHA-256 `entry_hash`.
- `wr/memory/decisions.jsonl` is the separate append-only "locked decisions" ledger
  (`VISITING_AGENTS.md:53-66`, `wr/specs/03-principal-authority.md:10`).
- Behavior is covered by `tests/workflow-yaml-validation.test.js:287-288`, and a
  trigger mistake there once caused 100% failure (`docs/github-project-v2-workflows.md:228`)
  — so changes here are HIGH blast radius and require care + tests.

## Problem (the actual remaining gaps)

1. The audit entry schema (`.github/workflows/agent-audit-logger.yml:118-132`) has
   **no `model` / `route` / `sources_cited` fields** — so "where did the resources
   come from" is not captured. This is the core gap.
2. **No head-SHA pinning** on entries → no stale-detection. Reviewer/tool outputs go
   stale (verified on PR #14772: `octopus-review` judged an old commit; a DeepWiki
   snapshot misread `scripts/openrouter-routing.js:40-51`).
3. The entry is **not persisted to the repo** — it is written to the job summary and
   a 90-day artifact only (`.github/workflows/agent-audit-logger.yml:142-175`),
   because committing to `main` previously caused failures
   (`docs/github-project-v2-workflows.md:228`). So there is no durable in-repo file
   to read long-term.
- Manual stopgaps now exist: `docs/PROVENANCE_SESSION_LOG.md` (observable trail) and
  `templates/provenance/SESSION_LOG_TEMPLATE.md` (reusable block), but they require a
  human to fill them in.

## Proposed Solution (extension, not rebuild)

1. Add `model`, `route`, and `sources_cited` fields to the existing entry builder at
   `.github/workflows/agent-audit-logger.yml:118-132` (tools named per
   `docs/PROVENANCE_STANDARD.md`). Preserve the existing hash-chain logic untouched.
2. Add a `target_sha` field (the head commit the action was made against) so a later
   step can flag a verdict STALE if head has advanced — the SHA-pinned re-validation
   the Ralph Loop does not do today (`.github/workflows/ralph-loop.yml:62-90`).
3. Decide durability deliberately: either keep the artifact-only model and render a
   periodic human-readable digest into `docs/PROVENANCE_SESSION_LOG.md`, OR commit to
   a non-`main` branch — must NOT reintroduce the main-push failure that
   `docs/github-project-v2-workflows.md:228` documents.

## Requirements

- Root cause / source must be identified per record — no anonymous actions.
- Must NOT claim to capture internal reasoning; only observable provenance.
- Must name every tool per `docs/PROVENANCE_STANDARD.md:15-35`.
- Include a regression test asserting the JSONL schema and the STALE-flag logic.
- No new npm dependency unless justified (current scripts use Node built-ins only).

## Out of Scope

- Extracting model chain-of-thought.
- Monitoring external platforms' (Devin, Octopus, Jules, CircleCI) internal
  containers/permissions — not inspectable from this repo.

---

## References

- `AGENTS.md:34-58` (orchestrator discipline + provenance ledger contract)
- `docs/PROVENANCE_STANDARD.md` (naming standard)
- `docs/PROVENANCE_SESSION_LOG.md` (manual observable trail this automates)
- `templates/provenance/SESSION_LOG_TEMPLATE.md` (reusable block)
- `.github/workflows/ralph-loop.yml:62-90` (escalation without SHA re-validation)

---

## Status Summary

**WR Status:** 📝 Draft — pending human filing
**Implementation Priority:** P1
**Approval Required:** @midnghtsapphire

---

**Last Updated:** 2026-06-28
