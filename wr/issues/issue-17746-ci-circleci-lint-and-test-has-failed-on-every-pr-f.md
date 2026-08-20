# WR: [WR] ci/circleci lint-and-test has failed on every PR for days — likely python3 missing in the Node image

**Issue:** #17746  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-20  
**Research Date:** 2026-08-20  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Issue Context

The `ci/circleci: lint-and-test` job is persistently failing while the equivalent GitHub Actions test passes. The leading hypothesis is that `cimg/node:22.11` lacks the Python 3 environment required by `scripts/flake8-baseline-gate.js`; confirm this against an actual failing CircleCI job log before selecting or implementing the fix.

## Scope

1. **Modify `.circleci/config.yml`:** Add a Python3 and pip installation step (e.g., using `sudo apt-get install -y python3 python3-pip`) in the Node job right before running tests or the flake8 scripts.
2. **Install flake8:** Include `python3 -m pip install --user flake8==7.1.1` in the CircleCI configuration to ensure the exact dependency is present.
3. **Verify:** Ensure that the CircleCI job completes successfully on PRs, eliminating the always-red check failure.
4. **Out of scope:** Deprecating CircleCI or overhauling the CI infrastructure; the focus is solely on fixing the immediate parity error.

## Acceptance Criteria

- [ ] Change delivers the described behavior
- [ ] Tests updated / added where applicable
- [ ] Docs updated where applicable

## Learnings — What & Why

- **What:** Replaced product/market research sections with concrete, actionable steps to restore CI environment parity by explicitly installing Python3 inside the `cimg/node:22.11` CircleCI image.
- **Why:** The initial document wrongly applied a product/idea WR template (containing marketing and audience sections) to a standard infrastructure bug. Bugs and chores require the `WR_TEMPLATE_BASIC.md` template to prevent bloated and irrelevant sections and conform to the `wr-lint.mjs` rules. The deferral placeholder was replaced with an explanation of this correction to pass rule #12 (No Pending Placeholders).

<!--
Guidance: agents completing other WR types should fill this in themselves once
done — capture what was learned and *why* it matters, not just what changed.
For follow-up-generated WRs this section is populated automatically by the
Follow-up Checkbox Router with the original follow-up text and a link to the
source PR/issue.
-->
