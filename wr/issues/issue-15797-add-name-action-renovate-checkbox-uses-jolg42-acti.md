# WR: [WR] add - name: action-renovate-checkbox   uses: Jolg42/action-renovate-checkbox@1.0.0

**Issue:** #15797  
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

add - name: action-renovate-checkbox   uses: Jolg42/action-renovate-checkbox@1.0.0

### Objective

Trigger Renovate with the Dependency Dashboard checkbox.

Usage
You can now consume the action by referencing the v1 branch

uses: Jolg42/action-renovate-checkbox@v1
with:
  master-issue-id: 1234
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
Full example

name: Renovate Checkbox

on:
## Allows you to run this workflow manually from the Actions tab
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: Jolg42/action-renovate-checkbox@v1
        with:
          master-issue-id: 1234
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

### Required Bundle

This work request requires the action-renovate-checkbox GitHub Action to be available in the production bundle. The action enables triggering Renovate dependency updates through a checkbox interface in the Dependency Dashboard. The bundle must include the Jolg42/action-renovate-checkbox@1.0.0 action with its dependencies for GitHub token authentication and issue management capabilities.

### Definition of Done

The action-renovate-checkbox GitHub Action is successfully integrated into the production application workflow. The action can be triggered manually via workflow_dispatch and properly configured with the master-issue-id parameter and GITHUB_TOKEN environment variable. The integration enables automated triggering of Renovate dependency updates through the Dependency Dashboard checkbox functionality. All workflow syntax is validated and the action reference points to the stable v1 branch of Jolg42/action-renovate-checkbox.

### Do Not Under-Scope

Ensure the GitHub token has sufficient permissions for repository access and issue management. Verify the master-issue-id corresponds to an actual Dependency Dashboard issue before implementation. Test the workflow trigger mechanism thoroughly to confirm Renovate responds correctly to checkbox interactions. Consider rate limiting implications when integrating with existing CI/CD pipelines.

### Explicit Exclusions

This work request does not include implementation of the underlying Renovate bot configuration, custom issue templates, or modifications to existing repository workflows beyond adding the checkbox action. The scope excludes any changes to Renovate's core dependency update logic or dashboard generation mechanisms.

### Delivery Shape

One PR preferred, split only if blocked

### Sellable Artifact Bundle

N/A — not a sellable artifact for this Output Type.

### Purchase Validation (functions-as-purchased)

N/A — not a purchased artifact for this Output Type.

### Expected Scope

1 shippable app with docs + tests + deploy path

### Validation Expectations

The action should successfully trigger Renovate when the checkbox is checked in the Dependency Dashboard issue. Verify that the workflow runs without errors when manually triggered via workflow_dispatch. Confirm that the GITHUB_TOKEN has sufficient permissions to read and write to issues. Test that the master-issue-id parameter correctly identifies the target Dependency Dashboard issue.

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
