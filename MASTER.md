# MASTER.md — REVVEL System of Record

> THE source of truth. When any work enters the system, START HERE. This file says which doc governs,
> in what order, and where every artifact plugs in. If two docs conflict, this file's ordering wins.
> System: **REVVEL**. Method: **UPREV** (one iteration · multiple PRs · max over minimum · deep
> research first · self-healing · form-driven not label-driven).
>
> ⚡ **Which workflow file runs next?**  
> **[`START_HERE_CALL_CHAIN.md`](./START_HERE_CALL_CHAIN.md)** — human-readable call chain (issue → research → code → ship).  
> This file (`MASTER.md`) governs *doc order*; that file governs *runtime file → next file*.

---

## 0. THE ONE RULE
A human may supply only a `[WR] <title>`. The system generates everything else, at maximum scope,
in one iteration. Form fields (not labels) drive routing. Output must be clean (no scaffolding, no
raw placeholders). Jules normalizes text; agents generate scope; research precedes both.

---

## 1. PIPELINE (the governing order)

```text
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
(5.5) METHOD HUNTER              ← (optional) find 10+ methods across domains → method-pack.md
   │
   ▼
(5.6) CONTRARIAN                 ← (optional) attack every method → contrarian-pack.md
   │
   ▼
(5.7) ADJACENT DOMAIN            ← (optional) cross-industry methods → adjacent-pack.md
   │
   ▼
(5.8) SYNTHESIS                  ← (optional) merge packs; reject contrarian_confidence > 0.7 → synthesis.md
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
- **wr/scripts/wr-lint.mjs** — automated lint gate; run in CI (`.github/workflows/wr-lint.yml`) and the review-agent pass.
- **wr/scripts/fix-wr-gate.mjs** — policy gate: fix-class WR PR must touch a non-`wr/` file or be `tracking-only` (`.github/workflows/fix-wr-gate.yml`).
- **wr/WR_TEMPLATE_BASIC.md** — lightweight template for bug/style/docs WRs.
- **wr/WR_TEMPLATE_FULL.md** — product/sellable WR template.
- **wr/scripts/generate-wr.sh** — corrected WR generator; selects template by class, substitutes tokens, runs the lint gate before writing.

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

### Intelligence Layer (Oz OS — separate repo)
- **[midnghtsapphire/oz-os](https://github.com/midnghtsapphire/oz-os)** — Research Intelligence Operating System repo.
- **`oz-os/intel/SCHEMA.md`** — YAML frontmatter schema for all intel entries.
- **`oz-os/agents/`** — 6 agent specs: method-hunter, contrarian, adjacent-domain, synthesizer, verifier, archivist.
- **`oz-os/research-packs/`** — Reusable research packs (github-actions, riverine-search, mcp).
- **`oz-os/AUTONOMY_TIERS.md`** — Tier 0–4 autonomy definitions.
- **`oz-os/NULL_RESULT_SCHEMA.md`** — Valid NULL_RESULT output schema.
- **`docs/INTELLIGENCE_LAYER_STANDARD.md`** — formal standard governing method divergence + evidence-gated autonomy.

### Infographic Engine (separate repo)
- **[midnghtsapphire/bar-chart-race-engine](https://github.com/midnghtsapphire/bar-chart-race-engine)** — Animated bar-chart-race video generator.
- 8 races: electricity access gap, literacy, life expectancy, internet, CO2, GDP per capita, renewable energy, non-HE washers.
- Scripts: `wdi-fetch.py`, `render-race.py`, `wdi-multi-fetch.py`, `render-multi.py`, `washer-fetch.py`, `render-washers.py`.

### PR Automation
- **`.github/workflows/trusted-bot-auto-approve.yml`** — auto-approves PRs from trusted bots (Devin, Jules, Copilot, Cursor, Octopus, CircleCI, Bito, OpenHands) once all CI checks pass. Feeds into `pr-state-orchestrator.yml` for label progression + auto-merge.

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

Closed by PR #14227:
- ~~`WR_TEMPLATE_BASIC.md`~~ — authored at `wr/WR_TEMPLATE_BASIC.md`.
- ~~CI workflow to run wr-lint.mjs~~ — landed as `.github/workflows/wr-lint.yml`.

Closed by PR #14266 + oz-os PR #2 + bar-chart-race-engine PR #2:
- ~~OZ-OS-001 through OZ-OS-012~~ — 18 WR tracking docs + full oz-os repo bootstrap (27 files).
- ~~RIS-001~~ — bar-chart-race-engine with 8 animated infographic races (electricity, literacy, life expectancy, internet, CO2, GDP, renewable energy, non-HE washers).
- ~~`docs/INTELLIGENCE_LAYER_STANDARD.md`~~ — formal intelligence layer standard (PR #14267).
- ~~Steps 5.5–5.8~~ — method divergence pipeline (Method Hunter → Contrarian → Adjacent Domain → Synthesis) added to §1.

Closed by PR #14269:
- ~~Trusted Bot Auto-Approve~~ — `.github/workflows/trusted-bot-auto-approve.yml` auto-approves PRs from Devin, Jules, Copilot, Cursor, Octopus, CircleCI, Bito, OpenHands once CI passes.

Still open:
- `UPREV_METHOD.md` — referenced in §2; method definition not yet authored.
- `WR_RESEARCH_MANDATE.md` — referenced in §2; research-first mandate / SEM-SEO discovery rules not yet authored.
- `.github/ISSUE_TEMPLATE/work_request.yml` — canonical WR form schema not yet authored.
- `.github/pull_request_template.md` — PR mirror of WR not yet authored.
- `ARTIFACT_GENERATOR.md` — standing per-project artifact spec not yet authored.
- `AGENT_BUILD_PROMPT.md` — XP-mode build prompt not yet authored.
- `research-orchestrator/` — only `BUILD_SPEC.md` + core+CLI specced; MCP runtime not built.
- Extend `wr-lint.mjs` with TODO/FIXME/TBD and empty-section checks.
