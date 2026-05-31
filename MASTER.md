# MASTER.md — REVVEL System of Record

> THE source of truth. When any work enters the system, START HERE. This file says which doc governs,
> in what order, and where every artifact plugs in. If two docs conflict, this file's ordering wins.
> System: **REVVEL**. Method: **UPREV** (one iteration · multiple PRs · max over minimum · deep
> research first · self-healing · form-driven not label-driven).

---

## 0. THE ONE RULE
A human may supply only a `[WR] <title>`. The system generates everything else, at maximum scope,
in one iteration. Form fields (not labels) drive routing. Output must be clean (no scaffolding, no
raw placeholders). Jules normalizes text; agents generate scope; research precedes both.

---

## 1. PIPELINE (the governing order)

```
[WR title] 
   │
   ▼
(1) TITLE_TO_WR_EXPANSION.md     ← detect title-only; pick template; infer modes; generate scope
   │      ├─ Step 0.5 template select → WR_TEMPLATE_BASIC.md (bug/style/docs) | full product template
   │      ├─ Step 1 research (scaled): BASIC=root-cause only · PRODUCT=full
   │      └─ governed by WR_RESEARCH_MANDATE.md
   ▼
(2) WR_RESEARCH_MANDATE.md       ← independent deep research FIRST; SEM/SEO discovery; 70/20/10
   │      └─ executed by the research orchestrator (BUILD_SPEC.md + dr CLI + mcp/manifest.json)
   ▼
(3) ARTIFACT_GENERATOR.md        ← for PRODUCT WRs: emit all assets/artifacts across all surfaces
   │      └─ worked instance example: RECOVERY_PLATFORM_ARTIFACTS.md
   ▼
(4) work_request.yml             ← canonical WR schema; agents populate every field
   │
   ▼
(5) STEP 4.5 CLEAN OUTPUT        ← no scaffolding, one H1, no raw [placeholders] (in expansion spec)
   │
   ▼
(6) Jules normalize              ← rewrite WR + PR text to canonical voice; mirror field-for-field
   │      └─ pull_request_template.md mirrors work_request.yml
   ▼
(7) EXECUTE (one iteration)      ← build full Required Bundle; multiple PRs allowed; self-heal
   │
   ▼
(8) wr-lint.mjs                  ← CI/review gate: blocks scaffolding leak, placeholders, wrong template
```

---

## 2. FILE REGISTRY (what each doc is, and when it governs)

### Method & governance
- **MASTER.md** (this file) — system of record; pipeline order; conflict tie-breaker.
- **UPREV_METHOD.md** — the method definition (one iteration, max over minimum, self-healing).
- **WR_RESEARCH_MANDATE.md** — research-first WR; runs before any build/fix; SEM/SEO discovery rules.

### WR/PR machinery (in .github/ + workflows/)
- **.github/ISSUE_TEMPLATE/work_request.yml** — canonical WR form/schema (the target Jules normalizes into).
- **.github/pull_request_template.md** — PR template; mirrors the WR field-for-field.
- **workflows/TITLE_TO_WR_EXPANSION.md** — title→full-WR generation + clean-output rules. Entry point per WR.
- **workflows/PDF_WR_PLAYBOOK.md** — form-driven routing reference for the external automation.
- **workflows/wr-lint.mjs** — automated lint gate; run in CI and the review-agent pass.
- **WR_TEMPLATE_BASIC.md** — *(referenced; create if absent)* the lightweight template for bug/style/docs WRs.

### Generators
- **ARTIFACT_GENERATOR.md** — standing per-project spec: all artifacts across all surfaces (web, android,
  ios, cli, mcp, pdf, booklet, skills, extension).
- **AGENT_BUILD_PROMPT.md** — the build-execution prompt (XP, one iteration, max build).

### Research orchestrator (the "build" that was missing)
- **research-orchestrator/BUILD_SPEC.md** — multi-model deep-research orchestrator spec.
- **research-orchestrator/src/core.mjs** — fan-out + judge + synthesis engine.
- **research-orchestrator/bin/dr.mjs** — CLI face.
- **research-orchestrator/config/models.json** — role-tier → OpenRouter model map (refresh monthly).
- **research-orchestrator/mcp/manifest.json** — swarm-callable MCP tools.

### Recovery Platform (worked product instance)
- **RECOVERY_PLATFORM_ARTIFACTS.md** — full artifact package for the platform.
- **artifacts/openapi/openapi.yaml** · **artifacts/mcp/manifest.json** · **artifacts/skills/** (4 SKILL.md).
- **sar_repository_schema.json** · **sar_case_records.json** — evidence-scoring schema + worked cases.
- **riverine_recovery_method.md** · **drift_modeling_note.md** · **source_manifest.md** · **resource_links.md**.

---

## 3. CONFLICT RESOLUTION
1. MASTER.md pipeline order wins over any single doc.
2. Form fields (work_request.yml) win over labels for routing.
3. wr-lint.mjs is a hard gate: red lint blocks merge regardless of agent claims.
4. Research brief must justify every populated field; unjustified fields are rejected.
5. Wrong-template signal (bug WR with product sections) → switch template, do not N/A en masse.

## 4. INVARIANTS (apply everywhere)
- Title-only input is valid; generate the rest. Max over minimum. One iteration, multiple PRs.
- Deep research first; time/cost not constrained; shallow rejected; findings tiered A1/A2/B2/B3.
- Clean output: one H1, no scaffolding, no raw placeholders, N/A must state a reason.
- Self-healing: detect own failures, open follow-up PRs in the same iteration, log cause+fix.
- Never silently omit explicitly requested/implied scope; document any blocker.

## 5. GAPS TO CLOSE (flagged, not yet built)
- `WR_TEMPLATE_BASIC.md` is referenced but not yet authored — create it so Step 0.5 has a real target.
- MCP server *runtime* for the orchestrator is specced (BUILD_SPEC) but only core+CLI are reference-built.
- A GitHub Actions workflow to run wr-lint.mjs on every WR/PR in CI (currently manual/agent-invoked).
- Extend wr-lint with TODO/FIXME/TBD and empty-section checks.
