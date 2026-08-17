# TITLE-TO-WR EXPANSION — agents generate the full WR from a title alone; Jules normalizes

> TRIGGER: a Work Request issue is opened with ONLY a `[WR] <title>` and empty/default fields.
> The system must self-populate the entire WR, generate all assets/artifacts at MAX scope, and
> Jules rewrites all WR and PR text to match the canonical schema (work_request.yml).
> Form-driven, not label-driven. One iteration, multiple PRs allowed. Max over minimum.

## STEP 0 — DETECT
If the WR body fields are empty/None or the issue contains only a title, enter EXPANSION MODE.
Do not ask the human to fill the form. The title is the seed; infer and generate the rest.

## STEP 0.5 — SELECT THE RIGHT TEMPLATE (do this before anything else)
Classify the WR from the title, then pick the template. Using the wrong template is the root cause
of the "raw placeholder" and "N/A market research on a bug fix" review failures.
- **Bug fix / style / refactor / docs-only / small internal change → `WR_TEMPLATE_BASIC.md`.**
  These do NOT get Deep Web Research, Product/Output market selections, or Prime Directive market sections.
- **New product / app / sellable asset / platform / spin-off → full `WR_TEMPLATE` (product).**
- If unsure, default to BASIC; escalating a basic WR is cheap, a bloated bug-fix WR is review noise.
Record the template choice and its one-line reason in the WR.

## STEP 1 — RESEARCH FIRST (scaled to template)
Run the deep-research orchestrator. Research depth scales to the template:
- BASIC (bug/style/refactor): root-cause research only — reproduce, trace, cite, fix, regression test.
  Do NOT run market/Deep Web Research; it is genuinely N/A for these.
- PRODUCT: full independent, multi-model, triangulated research — what it is, who it's for, the maximum
  useful version, implied assets/artifacts, best-practice/tools/competitors.
- Title is a seed, not the plan. Time and cost are not constraints. Shallow is rejected.
Output a research brief that justifies every field the agents are about to write.

## STEP 2 — INFER THE ROUTING MODES (from title + research)
Agents SELECT each dropdown value (not the human):
- Output Type — infer from the title (e.g. "...PDF" -> sellable-pdf; "...CLI" -> cli-product;
  "...platform/app" -> production-app; "...MCP" -> mcp-product; "...docs" -> technical-documentation).
- PDF pipeline batch — if Output Type=sellable-pdf, default Autocreate 20 (max variants) unless title
  implies otherwise; else Not applicable.
- Research Mode — deepresearch (expansion mode default).
- Delivery Mode — new-build unless the title says refresh/audit.
- Lifecycle Mode — build-direct unless title implies options/proposal.
- Commercial Mode — infer internal vs sellable vs client-deliverable from the title.
- Delivery Shape — "Multiple PRs intentionally planned" by default (one iteration, many PRs), unless
  the work is genuinely single-PR small.
Record the reasoning for each pick in the research brief.

## STEP 3 — GENERATE ALL ASSETS & ARTIFACTS (max scope)
From the artifact generator, produce the full set the Output Type implies, e.g. for a platform:
roadmap, blueprint + data dictionary, DB schema, infogram, pseudocode, wireframes, API, CLI, MCP,
sellable PDF, skills, booklet, chrome extension — plus anything the research says the title implies.
This is the floor, not the ceiling. Where an item implies more, build the more.

## STEP 4 — POPULATE THE WR FIELDS (canonical schema = work_request.yml)
Write every Scope-and-completeness field from the generated plan:
- Summary, Objective, Required Bundle (all assets/artifacts), Definition of Done,
  Do Not Under-Scope, Explicit Exclusions, Expected Scope, Validation Expectations, Blocker Rule,
  Acknowledgements (all true by construction).
Every field must trace to the research brief and the generated artifact set.

## STEP 4.5 — CLEAN OUTPUT RULES (prevents the recurring review failures)
Before handing to Jules, every generated WR/PR MUST satisfy these, or it is rejected:
1. **No template scaffolding in rendered text.** Strip ALL author-instruction comment blocks, e.g.:
   - `# Otherwise, use WR_TEMPLATE_BASIC.md instead (recommended)`
   - separator rules like `# ──────────────────────────────`
   - any duplicate `# WR: <repo>` header. Exactly ONE H1, at line 1.
2. **No raw `[bracketed placeholders]`.** Every section is either:
   - filled with real content, OR
   - explicitly marked `N/A — <one-line reason>` (the template requires documenting WHY, never leaving brackets).
   For a BASIC/bug-fix WR, product sections (Executive Summary, Repository Structure, Key Technologies,
   Step 1A Product/Output Selections, Step 2 Deep Web Research, Step 3 Prime Directive market numbers)
   should not even be present — they belong only to the product template. If they appear, the wrong
   template was used (see Step 0.5); switch templates rather than N/A-ing a dozen sections.
3. **Section presence matches template type.** BASIC has no market-research sections at all.
Jules rewrites ALL WR text to the canonical voice/structure of work_request.yml, then rewrites the
PR text to MIRROR it field-for-field (pull_request_template.md). Jules does not change scope — only
normalizes wording, structure, and cross-references so WR and PR read as one coherent contract.

## STEP 5 — EXECUTE (one iteration)
Agents build the full Required Bundle, opening multiple PRs as needed (all one iteration). Self-heal:
detect CI/runtime/schema failures and open follow-up PRs within the same iteration; log cause+fix.
PRs must mirror the WR Required Bundle + Definition of Done; partial scope requires a documented blocker.

## INVARIANTS
- Human input may be just a title. The system generates everything else.
- Form fields are the source of truth for routing (not labels).
- Describe and build the complete operational unit, not the minimum patch.
- Never silently omit explicitly-implied items; document any blocker.
- Jules owns text normalization of both WR and PR; agents own scope generation; research precedes both.
