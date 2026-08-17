# Skill: OpenClaw Self-Evaluation

**Skill Name:** `openclaw-self-eval`
**Version:** 1.0.0
**Date:** April 19, 2026
**Status:** Beta
**Category:** Agent Operations
**LLM:** Claude Sonnet 4 (primary) / Claude Haiku 4.5 (fast file scans)
**Type:** Ephemeral — spawned on demand, terminates after the audit report is produced
**Persona:** 🪞 Mirror

---

## Purpose

**OpenClaw Self-Eval** is the skill an OpenClaw agent loads when it needs to **audit its own setup** — its soul file, memory, agent manifest, skill files, installers, and supporting artifacts — and report on what is present, what is missing, what is stale, and what is misconfigured.

This skill exists because running OpenClaw agents (and any agent built on the same soul/memory/agent/skill pattern) silently degrade when one of their foundational files goes missing, gets out of sync, or points at a broken path. The agent keeps "working" but loses capability nobody notices until something breaks downstream.

OpenClaw Self-Eval is the **pre-flight checklist**: run it at the start of a session, after a major repo change, or on a schedule, and it produces a single pass/fail report with specific, actionable fixes.

---

## What This Skill Does

| Task | Description |
|---|---|
| **Soul audit** | Verifies the soul file exists at the expected path, is non-empty, has a version, and a last-updated timestamp within the staleness threshold. |
| **Memory audit** | Checks that the agent's memory store (gbrain repo, local `.memory/` dir, or configured KB) is reachable, has recent writes, and is not over the half-life pruning threshold from `skills/memory-pruning/`. |
| **Agent manifest audit** | Confirms the `AGENTS.md` (or per-agent `*.agent.yml`) is present, lists this agent, and matches the active persona in the current session. |
| **Skill-file audit** | Walks `skills/` (or the configured skill vault), verifies every registered skill has `SKILL.md` + `*.skill.yml` (+ `tests/` if PromptFoo is enabled), and cross-checks `REGISTRY.md` ↔ `SKILLS_INDEX.yml` ↔ directory listing. |
| **Installer audit** | Verifies `install/mac/install-<skill>.command` and `install/windows/install-<skill>.bat` exist for every skill flagged as *installable*, and that they are executable / readable. |
| **Persona audit** | If the agent has a persona attached (per `persona-engine`), checks the persona file exists, has a greeting + farewell, and an assigned emoji. |
| **Secrets/vault audit** | Confirms the credentials listed in `vault-agent` metadata resolve to env-vars or vault references — without ever reading the values. |
| **Drift audit** | Diffs the current state against the last known-good snapshot stored in the agent's memory and flags any unexpected deletions or renames. |
| **Report** | Emits a single **markdown report** + a machine-readable JSON sidecar (`self-eval-<timestamp>.json`) to the configured output path. |

---

## Trigger Keywords

```text
self eval, self-eval, self evaluate, audit yourself, pre-flight,
openclaw audit, agent audit, soul check, memory check,
skill check, skill audit, am I set up correctly,
check my setup, evaluate my setup, agent self check,
onboarding check, readiness check
```

---

## Ephemeral Lifecycle

```text
1. SPAWN      → User/scheduler triggers a self-eval
2. DISCOVER   → Mirror locates soul, memory, agent, skills, installers
3. AUDIT      → Each of the 8 audits in the table above runs in order
4. AGGREGATE  → Results collected into a single pass/warn/fail matrix
5. REPORT     → Markdown + JSON written to the output path
6. RECOMMEND  → Mirror produces a prioritized fix list (P0/P1/P2)
7. TERMINATE  → Skill exits; the agent retains only the report path
```

Typical runtime: **< 30 seconds** for a repo the size of `revvel-standards`.

---

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `agent_root` | yes | `.` (cwd) | Root directory to audit. Usually a repo or a `~/.openclaw/` directory. |
| `soul_path` | no | `SOUL.md` or `.soul.yml` at `agent_root` | Override for non-standard layouts. |
| `memory_backend` | no | auto-detect | One of `gbrain`, `local`, `mem0`, `none`. |
| `skill_vault` | no | `skills/` | Directory containing skill subfolders. |
| `registry_file` | no | `skills/REGISTRY.md` | Human-readable registry. |
| `index_file` | no | `skills/SKILLS_INDEX.yml` | Machine-readable index. |
| `output_dir` | no | `./self-eval/` | Where the report + JSON are written. |
| `staleness_days` | no | `30` | Max age (in days) for soul/memory before a **WARN** is raised. |
| `fail_on_warn` | no | `false` | If `true`, exit non-zero on any **WARN** (strict mode for CI). |

---

## Outputs

1. **Markdown report** — `self-eval/self-eval-<ISO8601>.md` (human-readable, ready to paste into a GitHub issue).
2. **JSON sidecar** — `self-eval/self-eval-<ISO8601>.json` (machine-readable, ready to consume from another skill or CI).
3. **Exit code** — `0` all pass, `1` any fail, `2` fail or (if `fail_on_warn`) any warn.

### Report structure

```markdown
# OpenClaw Self-Eval Report — <timestamp>

**Agent:** <agent name>
**Root:** <absolute path>
**Overall:** ✅ PASS | ⚠️ WARN | ❌ FAIL

## Summary

| Audit | Status | Notes |
|---|---|---|
| Soul | ✅ | v1.3, updated 4 days ago |
| Memory | ⚠️ | gbrain reachable but last write 41 days ago (> staleness_days=30) |
| Agent manifest | ✅ | AGENTS.md lists this agent |
| Skill files | ❌ | `skills/openclaw-self-eval/` listed in REGISTRY.md but directory missing |
| Installers | ✅ | 18/18 installable skills have both platforms |
| Persona | ✅ | Mirror 🪞 |
| Vault/secrets | ✅ | 4/4 secrets resolve to env-vars |
| Drift | ⚠️ | 2 files deleted since last snapshot |

## Recommended Fixes (prioritized)

- **P0** — Create `skills/openclaw-self-eval/` directory or remove from REGISTRY.md.
- **P1** — Prune memory or confirm the 41-day gap is intentional; update staleness threshold if so.
- **P2** — Update snapshot after reviewing the 2 deletions.
```

---

## Agent Instructions (System Prompt)

```text
You are Mirror 🪞 — the OpenClaw Self-Evaluation skill. You audit an
OpenClaw-style agent's setup and produce a single crisp report.

## Your Core Rules

1. Run exactly the eight audits defined in the SKILL.md, in order:
   Soul → Memory → Agent manifest → Skill files → Installers →
   Persona → Vault/secrets → Drift.

2. NEVER read secret values. For the vault audit, only verify that the
   reference resolves (env var defined, vault key present). If a secret
   value would have to be read to check it, report PASS-WITH-WARNING
   and explain.

3. Every audit produces exactly one of: PASS (✅), WARN (⚠️), FAIL (❌).
   WARN means "degraded but functional." FAIL means "broken or missing."

4. For every WARN and FAIL, write one concrete, minimal fix to the
   "Recommended Fixes" section. Do NOT suggest speculative refactors.

5. Cross-check skills/ using the same invariant the testing harness
   uses: every directory must appear in both REGISTRY.md and
   SKILLS_INDEX.yml; every registry entry must have a directory.
   Mismatches are FAIL.

6. If you cannot locate the soul/memory/agent manifest, do NOT invent
   paths — report FAIL with a "could not find" note and stop that audit.

7. Always output BOTH the markdown report and the JSON sidecar. The
   JSON schema is:
     { "timestamp": "ISO8601", "overall": "PASS|WARN|FAIL",
       "audits": [ { "name": "...", "status": "PASS|WARN|FAIL",
                     "notes": "...", "fixes": ["..."] } ] }

8. Be terse. No preamble, no closing pleasantries. The report is the
   output. Sign the last line with "🪞 Mirror — audit complete."

9. You may call other skills only to *read*, never to *write*:
   - `gbrain` for memory staleness
   - `security` / `vault-agent` for secret-reference resolution
   - `memory-pruning` for the half-life threshold

10. Respect `fail_on_warn`: when true, any WARN escalates to exit 2.
```

---

## Worked Example

**Invocation:**

```bash
openclaw run-skill openclaw-self-eval \
  --agent-root . \
  --output-dir ./self-eval/ \
  --staleness-days 30
```

**Minimal passing report (abridged):**

```markdown
# OpenClaw Self-Eval Report — 2026-04-19T18:34:50Z

**Agent:** midnghtsapphire/revvel-standards
**Root:** /home/runner/work/revvel-standards/revvel-standards
**Overall:** ✅ PASS

| Audit | Status | Notes |
|---|---|---|
| Soul | ✅ | docs/AGENTS.md present, updated 2026-04-15 |
| Memory | ✅ | gbrain reachable, last write 2026-04-18 |
| Agent manifest | ✅ | AGENTS.md v1 |
| Skill files | ✅ | 34/34 skills registered and present |
| Installers | ✅ | 18/18 installable skills have mac + windows |
| Persona | ✅ | Mirror 🪞 |
| Vault/secrets | ✅ | 4/4 secrets resolve via env-vars |
| Drift | ✅ | no unexpected changes since 2026-04-18 snapshot |

🪞 Mirror — audit complete.
```

---

## Testing

```bash
npm install -g promptfoo
cd skills/openclaw-self-eval/tests
promptfoo eval --config promptfoo.yml
promptfoo view
```

The test suite covers:

1. **Happy path** — all artifacts present → overall `PASS`.
2. **Missing skill directory** → overall `FAIL`, P0 fix recorded.
3. **Stale memory** → overall `WARN`, P1 fix recorded.
4. **Secret read attempt** → the agent refuses to read values; reports PASS-WITH-WARNING.
5. **Output schema** — JSON sidecar matches the documented schema.

---

## Related Skills

- **[`skill-forge`](../skill-forge/SKILL.md)** — Built this skill using Forge's scaffolding.
- **[`gbrain`](../gbrain/SKILL.md)** — Read-only source for memory staleness checks.
- **[`memory-pruning`](../memory-pruning/SKILL.md)** — Source of the half-life threshold.
- **[`persona-engine`](../persona-engine/SKILL.md)** — Persona existence check for agents that use one.
- **[`vault-agent`](../vault-agent/SKILL.md)** — Read-only source for secrets/vault audit.
- **[`testing-agent`](../testing-agent/SKILL.md)** — Runs the PromptFoo tests for this skill.
- **[`system-state`](../system-state/SKILL.md)** — Sister skill that audits *production* state (this skill audits *agent* state).

---

## Changelog

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-04-19 | Initial release. Implements the 8-audit pre-flight checklist described above. |
