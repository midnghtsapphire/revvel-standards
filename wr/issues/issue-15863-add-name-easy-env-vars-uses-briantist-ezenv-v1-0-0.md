# WR: [WR] add - name: Easy Env Vars   uses: briantist/ezenv@v1.0.0

**Issue:** #15863  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-13  
**Research Date:** 2026-07-13  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---

<!-- who: Jules (Google) + OpenRouter -->
<!-- date: 2026-07-13 -->
<!-- description: N/A — pending Jules refinement -->
<!-- **Issue:** N/A — pending Jules refinement         -->
<!-- **Repository:** midnghtsapphire/revvel-standards         -->
<!-- **Created:** 2026-07-13            -->
<!-- **Researcher:** Jules (Google) + OpenRouter   -->
<!-- **Research Date:** 2026-07-13 -->
<!-- **WR Status:** 🟡 In Progress        -->

## Issue Context

### Output Type (required)

production-app

### PDF pipeline batch

Not applicable

### Research Mode

deepresearch

### Delivery Mode

build-direct

### Lifecycle Mode

new-build

### Commercial Mode

saas-app

### Assign To / Decision Team

orchestrator

### Summary

add - name: Easy Env Vars   uses: briantist/ezenv@v1.0.0

### Objective

GitHub Action for easily setting persistent environment variables. Each variable is defined in order so variables can reference previous vars (to build paths for example). The assignments are done in bash so shell parameter expansion can be used.

Inputs
Required
env: An (optionally) multi-line string containing environment variable definitions in the form NAME=value.
Examples
Simple values
- uses: briantist/ezenv@v1
  with:
    env: |
      SOME_FLAG=1
      THIS_GREETING=hello
      WITH_SPACES="a value with spaces"
Referencing
- run: echo "ONE=one" >> "$GITHUB_ENV"

- uses: briantist/ezenv@v1
  with:
    env: |
      TWO=two
      ONETWOTHREE="$ONE $TWO three"
Shell Expansion
- uses: briantist/ezenv@v1
  with:
    env: |
      THAT_VALUE="${THIS_GREETING:-hi} ${LOCATION:-world}"
      ABS_SUBDIR="$(pwd)/test"

### Required Bundle

This WR requires the briantist/ezenv GitHub Action at version v1.0.0 to be added to the approved actions bundle. The action provides functionality for setting persistent environment variables in GitHub workflows with support for variable referencing and shell parameter expansion. The specific version v1.0.0 should be included in the production-app bundle to enable teams to use this environment variable management capability in their CI/CD pipelines.

### Definition of Done

The GitHub Action briantist/ezenv@v1.0.0 is successfully integrated into the production workflow with proper environment variable configuration. All required inputs are validated and the action executes without errors in the CI/CD pipeline. Environment variables are correctly set and accessible to subsequent workflow steps, with proper handling of multi-line strings, variable referencing, and shell parameter expansion. The implementation passes all automated tests and follows the repository's workflow standards.

### Do Not Under-Scope

Ensure the GitHub Action integration includes proper error handling for malformed environment variable definitions, validates that referenced variables exist before expansion, and implements safeguards against infinite loops when variables reference each other. Don't overlook security considerations for shell parameter expansion that could lead to command injection vulnerabilities. The sequential processing of variables must handle edge cases where earlier variable assignments fail but later ones succeed.

### Explicit Exclusions

This work request does not exclude any specific functionality, configurations, or use cases of the briantist/ezenv GitHub Action. All documented features including simple value assignment, variable referencing, and shell parameter expansion are within scope for implementation.

### Delivery Shape

One PR preferred, split only if blocked

### Sellable Artifact Bundle

N/A — not a sellable artifact for this Output Type.

### Purchase Validation (functions-as-purchased)

N/A — not a purchased artifact for this Output Type.

### Expected Scope

1 shippable app with docs + tests + deploy path

### Validation Expectations

The GitHub Action should correctly parse and set environment variables from the multi-line input string, with each variable accessible in subsequent workflow steps. Variables defined later in the list should be able to reference previously defined variables using standard bash parameter expansion syntax. Shell parameter expansion features like default values (${VAR:-default}) and command substitution should work as expected. The action should handle values with spaces when properly quoted and maintain the order of variable definitions for proper referencing.

### Blocker Rule

If any part of the Required Bundle cannot be completed in one iteration, open a WR-BLOCKER issue (label: `wr-blocker`) that names the missing capability, credential, or human action, and reference it from the PR body. Do NOT silently drop scope.

### Acknowledgements

- [x] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [x] Explicitly requested secondary items should not be silently deferred.
- [x] If the PR is partial, the blocker must be documented.
- [x] The PR should reflect the WR's required bundle and definition of done.
- [x] After implementation, open a PR and continue the loop (reset routing labels / trigger downstream workflows) instead of stopping at the issue.

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | N/A |
| Open Issues | N/A |
| Private | No |
| Archived | No |

## Research Checklist

<!-- Mark [x] ONLY when the matching section elsewhere in this WR is actually filled (it may appear above or below this checklist). Otherwise [ ] or "N/A — reason". -->
<!-- Mark [x] ONLY when the matching section below is actually filled. Otherwise [ ] or "N/A — reason". -->
<!-- Select-all / prefill rule: treat every item below as pre-selected work. If the requester leaves them blank, the agent should research and fill them all, then check [x] only once the matching section is genuinely complete. -->
- [ ] Deep market research
- [ ] BOM
- [ ] Community chatter
- [ ] Competitor analysis (table MUST list actual prices or `Pricing data pending — competitive benchmark research required.`)
- [ ] Domain strategy
- [ ] Monetization
- [ ] Every statistic/percentage cited with a source link or labeled as an estimate

## Research Findings

<!-- revvel-research-findings -->
N/A — pending Jules refinement

## Executive Summary

N/A — pending Jules refinement

## Step 1A — Product/Output Selections

N/A — pending Jules refinement

## Step 2 — Deep Web Research

<!-- Competitor analysis MUST include actual prices (e.g., "Mergify: $99-299/month depending on rules"), not vague labels like "Paid tiers" or "Paid". If a competitor's price is unknown, write "Pricing data pending — competitive benchmark research required." Do NOT ship incomplete competitive intelligence. -->
<!-- This pricing rule is mirrored in scripts/research-engine.js (buildSynthesisPrompt); parity is
     enforced by tests/research-engine.test.js. Update both files together if the wording changes. -->
<!-- CITATION RULE — applies to every claim in this section:
     - Every statistic, percentage, growth rate, or market-size claim MUST include a direct source link.
     - If a number is not sourced, omit it or label it an estimate (e.g. "internal estimate", "unverified").
     - Prefer a range over a precise figure when the number is an estimate.
     - Never present a bare percentage (e.g. "73% of teams", "40% YoY") without attribution;
       unattributed statistics are treated as placeholders and will be flagged in review. -->

N/A — pending Jules refinement

## Step 3 — Requirements

N/A — pending Jules refinement

## Recommendations

N/A — pending Jules refinement

## Dependencies

<!-- Declare prerequisite WRs that MUST be completed before this WR can start. -->
<!-- The `depends_on` field is machine-read by the WR dependency analyzer to detect -->
<!-- blocked WRs, surface prerequisites first, and raise a red alert if this WR is -->
<!-- worked before its prerequisites land. Query a full chain with `/dragnet deps <wr-id>`. -->
<!-- Use WR/issue references (e.g. #15090) or "none" — never leave a raw token. -->
<!-- Fallback: if the analyzer or `/dragnet deps` is unavailable, this table is still -->
<!-- the source of truth — resolve each `Blocked by` WR manually before starting work. -->

| Field | Value |
| --- | --- |
| `depends_on` (prerequisite WRs) | N/A — pending Jules refinement |
| Blocked by | N/A — pending Jules refinement |
| Blocks (downstream WRs) | N/A — pending Jules refinement |

N/A — pending Jules refinement

## Risks

N/A — pending Jules refinement

## Superseded Content

<!-- Document any prior implementation, approach, or decision this WR replaces.
     Per RVS-AGENT-001 (standards/COMMENT-DONT-DELETE.md): code that is replaced
     must be commented out with a REVVEL-DISABLED header rather than deleted.
     Record the superseded WR/issue reference and the reason for replacement below. -->
<!-- If nothing is superseded, write "N/A — new work, no prior implementation." -->

| Field | Value |
| --- | --- |
| Supersedes WR/issue | N/A — pending Jules refinement |
| Reason for replacement | N/A — pending Jules refinement |
| Archival status | N/A — pending Jules refinement |

<!-- Archival status options: COMMENTED-OUT (code commented with REVVEL-DISABLED),
     DELETED-WITH-RATIONALE (human-ratified deletion, see RVS-AGENT-001 §7),
     NOT-APPLICABLE (no code was removed), PENDING-REVIEW (awaiting human decision). -->
