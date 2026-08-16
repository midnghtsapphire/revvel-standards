# WR: use scripts, code and pacakages where we can and instead of agents or labels. prosecute first.

## Issue Context

### Output Type (required)

internal-script-automation

### PDF pipeline batch

None

### Research Mode

deepresearch

### Delivery Mode

build-direct

### Lifecycle Mode

new-build

### Commercial Mode

internal-only

### Assign To / Decision Team

dragnet-team

### Summary

/dragnet /dragnet-team proceed

### Objective

creating packages to manage most of our linting/code quality tools so they could be shared across projects, including: N/A

[Browserslist](https://browsersl.ist/#)
[ESLint](https://eslint.org/)
[Prettier](https://prettier.io/)
[Stylelint](https://stylelint.io/)
[TypeScript](https://www.typescriptlang.org/)
Design Token Conversion
The first shared packages were all for configuration items that get updated very infrequently. The real productivity goal is to be able to share code that gets updated more frequently, and to do this, we needed to spin down the use of the legacy design tokens that were defined inside each project.

I wanted to actively discourage anyone from adding new variables to the SCSS files that were used on the site, so I removed the variable definitions from each site, set them up inside the shared Style Dictionary project, and then imported that file back into the site projects as a dependency.

I pasted in the SCSS variables into ChatGPT with the following prompt: “Convert this list of SCSS variables into JSON where the SCSS variable name is the key of the JSON and the SCSS variable value nested into a JSON object with a property named ‘value’”
Verifying that the conversion was successful was easy. The SCSS file still needed to build without errors, and the output of the CSS file before the conversion should have a clean diff when compared to the compiled CSS file after the changes.

Conclusion
With the shared code quality tools and the style tokens set up, I was ready to turn my attention into building components. We’re at a good stopping point here, so I’ll write more details about the component development and rollout in an

### Required Bundle

N/A

### Definition of Done

N/A

### Do Not Under-Scope

N/A

### Explicit Exclusions

N/A

### Delivery Shape

None

### Sellable Artifact Bundle

N/A

### Purchase Validation (functions-as-purchased)

N/A

### Expected Scope

N/A

### Validation Expectations

N/A

### Blocker Rule

N/A

### Acknowledgements

- [ ] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [ ] Explicitly requested secondary items should not be silently deferred.
- [ ] If the PR is partial, the blocker must be documented.
- [ ] The PR should reflect the WR's required bundle and definition of done.
- [ ] After implementation, open a PR and continue the loop (reset routing labels / trigger downstream workflows) instead of stopping at the issue.

## Background & Motivation

<!-- Why is this work needed? What's the underlying problem or opportunity? -->

## Scope

<!-- Detailed scope: what's in, what's out, boundaries with other WRs. -->

## Approach

<!-- Proposed approach / design sketch. Alternatives considered. -->

## Acceptance Criteria

- [ ] Change delivers the described behavior end-to-end
- [ ] Tests updated / added where applicable
- [ ] Docs updated where applicable
- [ ] No regressions in related workflows

## Risks & Mitigations

<!-- Known risks, fragile files touched, rollback plan. -->

## Competitor & Pricing Intelligence

<!--
For Competitor and GitHub Star Intelligence WRs, the competitor/pricing table
must list actual prices (e.g. "$99-299/month"), not vague labels like "Paid tiers".
If a competitor's price is unknown, write: N/A
"Pricing data pending — competitive benchmark research required."
Do not ship incomplete competitive intelligence. This rule is kept in sync with
scripts/research-engine.js by tests/research-engine.test.js.
-->

## Learnings — What & Why

N/A

<!--
Guidance: agents completing other WR types should fill this in themselves once
done — capture what was learned and _why_ it matters, not just what changed.
For follow-up-generated WRs this section is populated automatically by the
Follow-up Checkbox Router with the original follow-up text, a link to the
source PR/issue, and (if applicable) a note that this is a chained follow-up.
-->
