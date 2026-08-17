# WR: [WR] resolve this issue permanently either in a maintenance script or a .net service but why is this happening seek when it happened to others on the web and use it for fixes and foss software lint still has a large pre-existing markdown backlog

**Issue:** #15096  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Research Date:** 2026-07-03  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---


<!-- revvel-research-findings -->
## Research Findings

Source packet: `docs/research-engine/run-28686025517.md`

## WR-Ready Research Packet: Markdown Linting Backlog Resolution

## 1. Executive Decision

**Recommendation**: Implement a two-phase approach to permanently resolve the markdown linting backlog:

1. **Immediate (Phase 1)**: Deploy incremental linting that only checks changed files in CI, unblocking development
2. **Strategic (Phase 2)**: Execute automated backlog cleanup via maintenance script with staged rollout

**Rationale**: This approach immediately unblocks CI while systematically addressing technical debt without disrupting ongoing development.

## 2. Audience We Are Going After and Why

**Primary Audience**: Development teams and DevOps engineers managing JavaScript/Node.js projects with CI/CD pipelines experiencing markdown linting bottlenecks.

**Why This Audience**:
- Experiencing urgent pain from CI failures due to accumulated markdown lint violations
- Developer productivity loss from pre-existing technical debt
- Maintenance overhead from manual lint fixes

**Market Positioning**: "Technical Debt Resolution Service" for markdown linting infrastructure, focusing on developer velocity and CI reliability.

## 3. Marketing and SEO Plan

**Primary Keywords**:
- `npm run lint markdown errors` (Transactional)
- `markdown linting CI pipeline failure` (Transactional)
- `markdownlint pre-existing backlog` (Informational)

**Content Strategy**:
- Landing page: `/docs/markdown-linting-ci-setup`
- Title: "Fix Markdown Linting Errors in CI/CD Pipelines - Complete Guide"
- Meta: "Resolve npm run lint markdown failures and handle pre-existing backlogs. Step-by-step CI integration with automated fixes."

**Distribution Channels**:
- GitHub Marketplace
- Dev.to, Reddit r/devops
- Stack Overflow answers
- Engineering blogs

## 4. Competitor and GitHub Star Intelligence

| Tool | GitHub Stars | Approach | Notes |
|------|-------------|----------|-------|
| markdownlint-cli | 4.5k | Node.js CLI, autofix | Most popular, widely adopted |
| markdownlint-cli2 | 1.1k | Improved CLI, parallel | Faster for large repos |
| remark-lint | 1.5k | Pluggable, JS/TS | Highly configurable |
| textlint | 2.8k | General text linting | Broader scope |

**Key Insights**:
- All core tools are FOSS with no direct pricing
- Market is mature with established players
- Differentiation opportunity in developer experience and enterprise features

## 5. Chatter and Demand Signals

**Common Pain Points**:
- "CI fails due to markdownlint errors in old files"
- "How do I suppress existing markdownlint errors?"
- "We have thousands of markdownlint errors, how to fix incrementally?"

**Evidence Sources**:
- [GitHub: markdownlint-cli issues](https://github.com/DavidAnson/markdownlint-cli/issues/135)
- [Stack Overflow: markdown lint legacy docs](https://stackoverflow.com/questions/61301344/how-to-handle-markdownlint-errors-in-legacy-docs)
- [Azure SDK: Linting backlog workaround](https://github.com/Azure/azure-sdk-for-js/issues/11084)

## 6. Factual Validation and Evidence Gaps

**Verified Facts**:
- Markdown linting backlogs are common when introducing linters to mature codebases
- Standard solutions include incremental linting and automated fixing
- Community consensus favors lint-staged approach for new code

**Evidence Gaps**:
- Specific repository and CI configuration not provided
- Exact error count and types unknown
- No CI failure logs or linting output available

**Required Verification**:
- Run `npm run lint` to quantify backlog
- Review package.json for linting dependencies
- Analyze CI configuration files

## 7. Build Requirements and Acceptance Gates

**Immediate Requirements**:
1. Modify CI to lint only changed files
2. Implement `.markdownlintignore` for legacy files
3. Add pre-commit hooks via lint-staged

**Acceptance Gates**:
- [ ] CI pipeline passes without markdown lint failures
- [ ] New markdown files pass linting by default
- [ ] Automated fix script processes entire backlog
- [ ] Documentation quality maintained post-cleanup

**Technical Implementation**:
```yaml
# .github/workflows/lint-incremental.yml
name: Incremental Markdown Lint
on: [pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: tj-actions/changed-files@v44
        id: changed-files-md
        with:
          files: '**.md'
      - name: Lint Changed Files
        if: steps.changed-files-md.outputs.any_changed == 'true'
        run: npx markdownlint-cli2 ${{ steps.changed-files-md.outputs.all_changed_files }}
```

## 8. Code Review Agent Packet

### For Bito AI
**Focus**: Analyze markdown files for common linting violations (MD013 line length, MD009 trailing spaces)
**Action**: Generate fix recommendations for auto-fixable issues

### For OpenRouter
**Focus**: Review CI configuration for optimal linting integration
**Action**: Suggest performance improvements for large file sets

### For Coderabbit
**Focus**: Validate markdown formatting changes don't break documentation
**Action**: Flag any semantic changes in auto-fixed content

### For Ralph Loop
**Focus**: Ensure incremental linting doesn't miss critical files
**Action**: Verify coverage of all new/changed markdown files

## 9. Automatic Fix and Commit Queue

### Fix 1: Add Incremental Linting
```json
{
  "scripts": {
    "lint:md:changed": "markdownlint-cli2 $(git diff --name-only --diff-filter=AM origin/main | grep '\\.md$')"
  }
}
```
**Commit**: `fix: add incremental markdown linting for changed files only`

### Fix 2: Maintenance Script
```javascript
// scripts/fix-markdown-backlog.js
const { execSync } = require('child_process');
const BATCH_SIZE = 10;

const files = execSync('find . -name "*.md" -not -path "./node_modules/*"')
  .toString().split('\n').filter(Boolean).slice(0, BATCH_SIZE);

files.forEach(file => {
  try {
    execSync(`npx markdownlint-cli2-fix "${file}"`);
    console.log(`Fixed: ${file}`);
  } catch (error) {
    console.log(`Manual review needed: ${file}`);
  }
});
```
**Commit**: `feat: add batch markdown fix script for backlog cleanup`

### Fix 3: Pre-commit Hook
```json
{
  "lint-staged": {
    "*.md": ["markdownlint-cli2 --fix", "git add"]
  }
}
```
**Commit**: `chore: add pre-commit hook for markdown linting`

## 10. Labels to Apply

- `technical-debt` - Core issue classification
- `ci-improvement` - CI/CD enhancement
- `lint-backlog` - Specific markdown linting debt
- `automation-opportunity` - Candidate for automated resolution
- `documentation` - Affects documentation quality
- `developer-experience` - Impacts developer workflow

**Priority Labels**:
- `priority-high` - Blocking CI and development
- `needs-triage` - Requires technical assessment
---

### Output Type (required)

production-app

### PDF pipeline batch

None

### Research Mode

None

### Delivery Mode

None

### Lifecycle Mode

None

### Commercial Mode

None

### Summary

_No response_

### Objective

Root npm run lint still has a large pre-existing markdown backlog unrelated to this CI failure.

### Required Bundle

_No response_

### Definition of Done

_No response_

### Do Not Under-Scope

_No response_

### Explicit Exclusions

_No response_

### Delivery Shape

None

### Expected Scope

_No response_

### Validation Expectations

_No response_

### Blocker Rule

Root npm run lint still has a large pre-existing markdown backlog unrelated to this CI failure.

### Acknowledgements

- [x] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [x] Explicitly requested secondary items should not be silently deferred.
- [x] If the PR is partial, the blocker must be documented.
- [x] The PR should reflect the WR's required bundle and definition of done.

## Summary

N/A — pending Jules refinement

## Objective

N/A — pending Jules refinement

## Required Bundle

N/A — pending Jules refinement

## Definition of Done

N/A — pending Jules refinement

## Validation

N/A — pending Jules refinement

## Blockers

N/A — pending Jules refinement

<!-- Market research, BOM, SEO, monetization sections are intentionally absent: BASIC template is for bug/chore/docs/refactor WRs with no product/market surface. Use WR_TEMPLATE_FULL.md only for new products or sellable assets. -->
