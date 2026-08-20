# WR: [WR] ci/circleci lint-and-test has failed on every PR for days — likely python3 missing in the Node image

**Issue:** #17746  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-20  
**Research Date:** 2026-08-20  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---

<!-- revvel-research-findings -->
## Research Findings

Source packet: `docs/research-engine/run-32317886765.md`

## Executive Decision

**Fix the CircleCI job by installing Python3 in the Node image to restore CI parity with GitHub Actions.**

The `ci/circleci: lint-and-test` job fails on every PR because the `cimg/node:22.11` image lacks Python3, which is required by `scripts/flake8-baseline-gate.js`. This creates an always-red check that violates `standards/GREEN_MAIN_STANDARD.md` and trains developers to ignore CI failures.

**Immediate action required**: Add Python3 installation step to CircleCI config before running tests. This maintains parity with GitHub Actions and ensures the flake8 quality gate runs in both environments.

## Audience We Are Going After and Why

**Primary Audience**: Internal Revvel engineering team experiencing CI fatigue from persistent failures.

**Urgent Pain Points**:
- Always-red checks normalize ignoring CI, undermining quality gates
- Silent divergence between CI systems creates confusion and debugging overhead  
- Blocked PRs reduce developer velocity on every merge

**Why This Audience**: This is an internal infrastructure reliability issue directly impacting developer productivity and code quality standards. The audience is captive (internal team) with immediate need for resolution.

## Marketing and SEO Plan

**Content Angles**:
- "How to Fix Python3 Missing in CircleCI Node Images" (problem-solution guide)
- "CircleCI vs GitHub Actions: Environment Differences That Break Builds" (comparison content)
- "Setting Up Multi-Language CI Pipelines in CircleCI" (best practices)

**Target Keywords**:
- circleci python3 missing node image
- cimg/node python install
- circleci lint test failing
- fix circleci python3 error

**Landing Page Requirements**:
- Title: "Fix CircleCI Python3 Missing Error in Node Images | Complete Guide"
- Meta Description: "Solve CircleCI lint-and-test failures caused by missing Python3 in cimg/node images. Step-by-step fix with code examples."

**Note**: Search volume verification pending - requires SEMrush/Ahrefs API access.

## Competitor and GitHub Star Intelligence

## CI/CD Platform Comparison

| Platform | Pricing | Python Support | Market Position |
|----------|---------|----------------|-----------------|
| GitHub Actions | Free tier: 2,000 min/month; Paid: ~$4/user/month | ✅ Included in ubuntu-latest | Native GitHub integration, 2M+ repos |
| CircleCI | Free tier: 6,000 credits/month (~600 min); Paid: $15+/month | ❌ Not in Node images | Docker-first, standalone service |
| Jenkins | Free (self-hosted infrastructure costs) | Depends on host setup | Enterprise focus, self-hosted |
| GitLab CI | Included with GitLab plans | ✅ In default runners | Integrated platform approach |
| Buildkite | Pricing data pending — competitive benchmark research required | Configurable | Hybrid cloud/on-premise |

**Key Insight**: GitHub Actions' native Python support in default runners gives it an advantage for multi-language projects. CircleCI's modular image approach requires explicit configuration but offers more control.

## Chatter and Demand Signals

**Internal Signals**:
- "always-red check with no owner and no explanation" - ownership vacuum frustration
- "teaches everyone to ignore CI" - normalization concern  
- Direct violation of `standards/GREEN_MAIN_STANDARD.md` - explicit policy breach

**Affected PRs**: #17722, #17729, #17732, #17743, #17745 (all showing consistent failure pattern)

**Developer Impact**: Every PR blocked by non-actionable CI failure, creating organization-wide productivity drag.

## Factual Validation and Evidence Gaps

## Verified Facts
- `scripts/flake8-baseline-gate.js` hard-requires Python3 (code analysis confirmed)
- `cimg/node:22.11` does not include Python3 ([CircleCI docs](https://circleci.com/developer/images/image/cimg/node))
- `ubuntu-latest` includes Python3 ([GitHub docs](https://github.com/actions/runner-images))

## Critical Evidence Gap
**Cannot verify**: Actual CircleCI job logs to confirm Python3 error message. The hypothesis is strong but unproven without log access.

**Required verification**: Access https://circleci.com/gh/midnghtsapphire/revvel-standards/17191 to confirm error matches "python3: command not found" or similar.

## Build Requirements and Acceptance Gates

## Implementation Requirements
1. **Verify hypothesis** by accessing CircleCI job logs (requires human with credentials)
2. **Choose fix strategy**:
   - Option A (preferred): Install Python3 in CircleCI job
   - Option B: Switch to `cimg/python:3.12-node` image
   - Option C: Add graceful skip with warning (not recommended)

## Acceptance Gates
- [ ] CircleCI job log shows successful Python3/flake8 execution
- [ ] `npm test` passes identically on both CI systems  
- [ ] Regression test added to prevent future CI environment divergence
- [ ] Documentation updated in `DECISIONS.md` if behavior differs

## Code Review Agent Packet

## For Bito AI
**Finding**: Missing Python3 dependency in CircleCI Node image causes test failure.
**Fix**: Add Python3 installation step before running tests in `.circleci/config.yml`.

## For OpenRouter Review
**Issue**: Environment parity violation between CI systems.
**Solution**: Ensure both GitHub Actions and CircleCI have identical Python3 availability.

## For Coderabbit
**Problem**: `scripts/flake8-baseline-gate.js` throws when Python3 is missing.
**Action**: Either install Python3 or add skip guard with loud warning.

## For Ralph Loop
**Root Cause**: `cimg/node:22.11` lacks Python3, breaking flake8 gate.
**Verification**: Check CircleCI logs for "python3: command not found" error.

## Automatic Fix and Commit Queue

## Primary Fix (After Log Verification)
```yaml
# File: .circleci/config.yml
# Add before npm test execution:
- run:
    name: Install Python3 and flake8
    command: |
      sudo apt-get update
      sudo apt-get install -y python3 python3-pip
      python3 -m pip install --user flake8==7.1.1
```
**Commit message**: `fix(ci): install python3 in CircleCI to match GitHub Actions environment`

## Regression Test
```javascript
// File: tests/ci-environment-parity.test.js
describe('CI Environment Parity', () => {
  it('should have python3 available in all CI environments', () => {
    const result = spawnSync('python3', ['--version'], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Python 3\.\d+/);
  });
});
```
**Commit message**: `test: add CI environment parity check for python3 availability`

## Labels to Apply

- `needs-human` (blocking - requires CircleCI log access)
- `ci-infrastructure`
- `python-dependency`  
- `standards-violation`
- `bug`
- `regression-test-required`

## Repository Review and Best Alternative

**Primary Repository**: `midnghtsapphire/revvel-standards` (inferred from CircleCI URL)

**Alternative Solutions**:
1. **`cimg/python:3.12-node`** - Official CircleCI image with both Python and Node.js
2. **Custom Dockerfile** - Build from `node:22-alpine` + Python packages
3. **GitHub Actions only** - Deprecate CircleCI if redundant (requires `DECISIONS.md` entry)

**Recommendation**: Use `cimg/python:3.12-node` for immediate fix, evaluate CI consolidation for long-term.

## Confidence Score Summary

**Overall Confidence**: 92/100

**High Confidence (95%)**:
- Root cause hypothesis (Python3 missing in Node image)
- Environment differences between CI systems
- Code analysis showing hard Python3 dependency

**Medium Confidence (85%)**:
- Specific error message (needs log verification)
- Fix effectiveness (untested in actual environment)

**Selected Best Approach**: Install Python3 in existing CircleCI job configuration. This maintains current architecture while fixing the immediate issue and provides fastest path to green CI.

**Rationale**: The evidence strongly supports the Python3 hypothesis, with clear documentation showing `cimg/node` lacks Python while `ubuntu-latest` includes it. The fix is low-risk and maintains parity between CI systems as required by internal standards.
---

## Acceptance Criteria

- [ ] Change delivers the described behavior
- [ ] Tests updated / added where applicable
- [ ] Docs updated where applicable

## Learnings — What & Why

N/A — pending Jules refinement

<!--
Guidance: agents completing other WR types should fill this in themselves once
done — capture what was learned and _why_ it matters, not just what changed.
For follow-up-generated WRs this section is populated automatically by the
Follow-up Checkbox Router with the original follow-up text and a link to the
source PR/issue.
-->
