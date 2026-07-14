# Skill: repo-audit — 7-Gate Prosecution Audit

**Purpose:** Reusable procedure for adversarial external audits of the repository. Produces WRs with proven root causes and Agent learning notes (fix + vaccine pattern).

**When to invoke:** Scheduled external audit, incident post-mortem, or when systemic drift is suspected.

---

## The 7 Gates

Each gate must PASS or produce a WR (work request) at `wr/pending/audit-<YYYY-MM-DD>/WR-<Ncode>.md`.

### Gate 1 — Dependency Integrity
- Enumerate every `require(...)` / `import` across `scripts/`, `bin/`, `src/`.
- Diff against `package.json` `dependencies` + `devDependencies`.
- Any undeclared module → **P0 WR** (build/runtime break latent).
- Method: `grep -rhoE "require\\(['\"][^'\"./][^'\"]*['\"]\\)" scripts bin src | sort -u`.
- Vaccine: CI job `dep-lint` that fails on undeclared imports.

### Gate 2 — State & SSOT Freshness
- `state.json`, `.governance/*`, canonical registries — must be non-empty and recently updated.
- Empty `{}` or stale >30d → **P0/P1 WR**.
- Cross-check SSOT links (`docs/**`, `README.md`) resolve.

### Gate 3 — Workflow Reference Integrity
- Every `.github/workflows/*.yml` `run:` step referencing a script → verify script exists.
- Every `uses:` action → verify pin (SHA or tag) and existence.
- Missing scripts → **P1 WR** with archaeology (git log --diff-filter=D --follow).

### Gate 4 — Escalation Surface (Security)
- Enumerate workflows using `pull_request_target`, `workflow_run`, `issue_comment`.
- Any that checkout PR head + run untrusted code → **P1 WR**.
- Any `secrets.*` exposure to untrusted context → **P0 WR**.

### Gate 5 — Temporal / Clock Sanity
- Any script/prompt that reasons about "current date" from LLM training data instead of `date -u`/`Date.now()` → **P1 WR**.
- Mirror/judge lanes are high-risk here.

### Gate 6 — Delegation & Bus Wiring
- Persona→persona, bot→bot delegation paths — trace end-to-end.
- @-mention + bot-filter double blocks → **P1 WR**.
- Recommend `summon:<persona>` label bus pattern.

### Gate 7 — Deletion Archaeology & Guardrails
- `git log --diff-filter=D --since="60 days ago" --name-only --pretty=format:` — enumerate deleted files.
- Any deleted-"temporarily" file never restored → **P1/P2 WR**.
- COMMENT-DONT-DELETE policy must have CI gate → else **P1 WR**.
- Vaccine: `deletion-guard.yml` workflow.

---

## WR Template

```markdown
# WR-<code> — <one-line title>

**Priority:** P0 | P1 | P2
**Gate:** <1-7>
**Status:** proven | located | suspected

## Evidence
<commands run, outputs, file:line refs, commit SHAs>

## Root Cause
<one paragraph>

## Fix
<concrete diff or steps>

## Agent Learning Note
**Pattern:** <name>
**Vaccine:** <CI gate / lint / policy that prevents recurrence>
```

---

## Output Contract

1. `wr/pending/audit-<date>/WR-A1..AN.md` — one file per finding.
2. `wr/memory/audit-<date>-tools.md` — toolchain + method memory.
3. Applied P0 fixes on branch (dep additions, obvious repairs) with test proof (`X/X tests green`).
4. Suggested execution order in the issue body (topological: unblock delegation first, then guards, then content).

---

## Invocation

```bash
# Kick a fresh audit
DATE=$(date -u +%Y-%m-%d)
mkdir -p wr/pending/audit-$DATE wr/memory
# Run gates 1-7, file WRs, open tracking issue.
```

**Prime directive alignment:** Audits protect the $10k→$10M pipeline by preventing silent drift in Polar.sh funding automation, OSINT product workflows, and the orchestrator bus that ships them.
