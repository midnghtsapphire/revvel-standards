# UPREV Method

One work request. One iteration. Multiple pull requests are allowed, and they are the same iteration.
Build the maximum complete unit the request names. Research before building. Repair failures inside
the same iteration. Do not drop requested scope.

This is the method named in `MASTER.md` (header and §2). It is the working rules condensed from
orchestrator non-negotiable A and from the three governing files cited below. Where those sources
use a shorter phrase, this file keeps that phrase and states the check that makes it deterministic.

**Authored:** 2026-11-06 (America/Denver), Cursor Cloud agent, at Audrey Evans's direction via
PromptSteward. `MASTER.md` §5 still contains the older gap line that says this file is not authored.
This file does not edit `MASTER.md`.

## Sources

- `MASTER.md` — header (method properties), §0 (title-only input; form fields, not labels), §1 step (7) (execute in one iteration), §4 (invariants).
- `workflows/TITLE_TO_WR_EXPANSION.md` — STEP 0, STEP 0.5, STEP 1, STEP 3, STEP 5, and INVARIANTS.
- `docs/case-files/platform/AGENT_BUILD_PROMPT_1.md` — execution-mode header (XP, one iteration, max build) and §12 (the manifest is the floor, not the ceiling).
- Orchestrator non-negotiable A in revvel-hail `docs/orchestrator/ORCHESTRATOR_PROMPT.md` (canonical prompt, [revvel-hail#3](https://github.com/midnghtsapphire/revvel-hail/pull/3)). This repo only points at that file from `docs/orchestration/xp-swarm-orchestrator-prompt.md`. Non-negotiable A cites the three files above and names a missing-scope record `WR-BLOCKER`.

## Properties

Apply all six. They are the `MASTER.md` header, written as checks.

1. **One iteration.** One work request produces one iteration.
2. **Multiple pull requests.** Any number of pull requests may land for that work request. Count them as the same iteration.
3. **Max over minimum.** The required bundle is the floor. Build the complete operational unit, not a stub.
4. **Deep research first.** Research is finished before execution starts. Shallow research is a failed iteration, not a smaller iteration.
5. **Self-healing.** A CI, runtime, or schema failure opens a follow-up pull request in the same iteration and records cause and fix.
6. **Form-driven.** Routing uses work-request form fields. Labels do not route the work (`MASTER.md` §0 and §3).

## Procedure

Run these steps in order for the work request in hand. Do not skip a step. Do not start the next work request in order to finish this one.

1. **Take the work request as it is.** A human may supply only `[WR] <title>`. That input is valid. Generate the rest. Do not send the form back for the human to fill (`MASTER.md` §0; `workflows/TITLE_TO_WR_EXPANSION.md` STEP 0).
2. **Select the template before research or build.** Bug fix, style, refactor, docs-only, or other small internal change uses `WR_TEMPLATE_BASIC.md`. A new product, app, sellable asset, platform, or spin-off uses the full product template. If the class is uncertain, use BASIC (`workflows/TITLE_TO_WR_EXPANSION.md` STEP 0.5). Record the template name and the one-line reason.
3. **Research at the depth of that template, and stop there.**
   - BASIC: root-cause research only (reproduce, trace, cite, fix, regression test). Market and deep-web product research are out of scope for this class.
   - PRODUCT: full research of what it is, who it is for, the maximum useful version, the implied assets, and the tools and competitors. Time and cost are not constraints. Shallow research is rejected (`MASTER.md` §4; `workflows/TITLE_TO_WR_EXPANSION.md` STEP 1).
   - Record findings in tiers A1, A2, B2, and B3 (`MASTER.md` §4). The research brief must justify every field that will be written.
4. **Write the required bundle at maximum scope for the selected template.**
   - BASIC: the bundle is the root-cause fix and the regression evidence the basic template requires. Do not add product, market, or payment scope.
   - PRODUCT: the bundle is every asset the output type implies, plus anything the research says the title implies. The list is the floor. Where an item implies a further item, include the further item (`workflows/TITLE_TO_WR_EXPANSION.md` STEP 3; `docs/case-files/platform/AGENT_BUILD_PROMPT_1.md` execution-mode header and §12).
   - When the product scope includes an application, the operational unit includes the app, the backend, and the payment gate. When the work request does not include those surfaces, do not add them (revvel-hail `docs/orchestrator/ORCHESTRATOR_PROMPT.md`, non-negotiable A).
5. **Execute once.** Build that bundle. Open as many pull requests as the bundle needs. Every one of those pull requests belongs to this iteration (`MASTER.md` §1 step (7) and §4; `workflows/TITLE_TO_WR_EXPANSION.md` STEP 5; `docs/case-files/platform/AGENT_BUILD_PROMPT_1.md` execution-mode header).
6. **Self-heal inside this iteration.** On a CI failure, a runtime failure, or a schema failure: record the cause, record the fix, and open the follow-up pull request before calling the iteration finished (`MASTER.md` §4; `workflows/TITLE_TO_WR_EXPANSION.md` STEP 5).
7. **Keep requested scope.** Do not omit an item the work request states or implies. If an item cannot be built, write a documented blocker and leave the iteration incomplete. The orchestrator prompt names that record `WR-BLOCKER` (`MASTER.md` §4; `workflows/TITLE_TO_WR_EXPANSION.md` STEP 5 and INVARIANTS; revvel-hail `docs/orchestrator/ORCHESTRATOR_PROMPT.md`, non-negotiable A).
8. **Match the pull requests to the bundle.** Each pull request mirrors the required bundle and the definition of done. A pull request that covers only part of the bundle does not finish the iteration unless the missing part is the documented blocker from step 7 (`workflows/TITLE_TO_WR_EXPANSION.md` STEP 5).

## Reject these outcomes

- A second iteration opened to finish scope that was already in this work request.
- A stub, a minimum patch, or a scaffold shipped in place of the required bundle.
- Research skipped, or product-depth research cut short to save time or cost.
- A failure fixed in silence, with no cause, no fix note, and no follow-up pull request.
- A requested or implied item dropped with no documented blocker.
- Labels used to decide routing while the form fields say something else.

## Related files this method does not replace

`MASTER.md` still governs document order. `workflows/TITLE_TO_WR_EXPANSION.md` still governs title-to-work-request generation. `docs/case-files/platform/AGENT_BUILD_PROMPT.md` and `docs/case-files/platform/AGENT_BUILD_PROMPT_1.md` remain the build prompts. This file is the method those documents name.
