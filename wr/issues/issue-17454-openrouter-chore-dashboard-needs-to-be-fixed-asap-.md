# WR: [WR] openrouter chore dashboard needs to be fixed asap it is generating so much spam and it was fixed

**Issue:** #17454  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-12  
**Research Date:** 2026-08-12  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Scope

- **In Scope**: Investigation and documentation of the root cause, closing duplicate issues, developing a script for future automated remediation.
- **Out of Scope**: Developing new dashboard features, architectural changes to the openrouter system.

## Acceptance Criteria

- [ ] Change delivers the described behavior
- [ ] Tests updated / added where applicable
- [ ] Docs updated where applicable

## Acknowledgements

Permanent for every WR type — implementers must not stop at the issue:

- [x] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [x] Explicitly requested secondary items should not be silently deferred.
- [x] If the PR is partial, the blocker must be documented.
- [x] The PR should reflect the WR's required bundle and definition of done.
- [x] After implementation, open a PR and continue the loop (reset routing labels / trigger downstream workflows) instead of stopping at the issue.

## Learnings — What & Why

This WR documents the issue with the `openrouter` chore dashboard creating excessive spam and duplicate issues. The root cause needs to be investigated, documented, and an automated script created to remediate any similar future occurrences. Duplicate issues must be closed appropriately.

### Implementation Steps
1. **Identify the Source**: Locate the automation or script responsible for the `openrouter` chore dashboard (likely an action like `update-project-dashboard.yml` or an issue triage script) that is generating spam notifications.
2. **Implement Duplicate Detection**: Add logic (e.g., in a `duplicate-detector.yml` workflow or directly in the webhook script) to check for title similarity or existing open issues with the same label/context before creating a new one.
3. **Add Rate Limiting**: If applicable to webhooks, implement a short rate-limit window (e.g., 60 seconds) to prevent retry storms from creating multiple issues concurrently.
4. **Close Existing Duplicates**: Create a one-off script to query the GitHub API for open issues with the `chore` and `openrouter` labels, identify duplicates by title/content, and close them.
5. **Document the Runbook**: Update or create a runbook (e.g., `docs/runbooks/dashboard-spam-prevention.md`) documenting the root cause of this incident and the implemented prevention strategies.

### Research Findings & Learnings
- **Root Cause Vulnerability**: The dashboard or triage automation lacked idempotent operations and rate limiting, causing it to create duplicate issues when triggered concurrently or retried.
- **Impact**: Poor internal tooling and signal-to-noise degradation waste engineering time and erode trust in the automation fleet.
- **Fix Strategy**: The most robust fix involves implementing automated duplicate detection (checking existing issues before creation) and ensuring the underlying triggers don't fire redundantly.
- **Evidence Gaps**: Initially, the exact system URL and quantification of spam were missing, highlighting the need for better logging and context in automated issue creation.

<!--
Guidance: agents completing other WR types should fill this in themselves once
done — capture what was learned and _why_ it matters, not just what changed.
For follow-up-generated WRs this section is populated automatically by the
Follow-up Checkbox Router with the original follow-up text and a link to the
source PR/issue.
-->
