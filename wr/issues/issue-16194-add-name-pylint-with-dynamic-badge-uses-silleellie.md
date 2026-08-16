# WR: [WR] add - name: PyLint with dynamic badge   uses: Silleellie/pylint-github-action@v3

**Issue:** #16194  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-22  
**Research Date:** 2026-07-22  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---

<!-- revvel-research-findings -->
## Research Findings

Source packet: `docs/research-engine/run-29443860442.md`

## WR-Ready Research Packet: PyLint GitHub Action Integration

## 1. Executive Decision

**Recommendation**: Proceed with implementation of `Silleellie/pylint-github-action@v3` with security modifications.

**Key Decision Points**:
- The action is actively maintained (last commit October 2024)
- Provides unique dynamic badge functionality not found in alternatives
- Requires security hardening: pin to specific commit SHA instead of floating tag
- Implement with `[skip ci]` in commit messages to prevent workflow cascading

**Action**: Approve with modifications for security and workflow optimization.

## 2. Audience We Are Going After and Why

**Primary Audience**: Python development teams seeking automated code quality visibility
- **Pain Point**: Manual code quality tracking and inconsistent linting across team projects
- **Urgency Driver**: Visual accountability through dynamic badges increases team compliance
- **Value Prop**: Zero-maintenance code quality visibility directly in README

**Secondary Audiences**:
- Open-source maintainers wanting to showcase code quality
- DevOps teams standardizing CI/CD pipelines
- Engineering managers tracking code quality metrics

## 3. Marketing and SEO Plan

**Primary Keywords**:
- "pylint github action" (transactional intent)
- "python code quality automation" (solution-seeking)
- "github actions python linting" (specific tooling)
- "dynamic badge pylint score" (feature-specific)

**Content Strategy**:
1. **Landing Page**: "How to Add a Dynamic PyLint Score Badge to Your GitHub README"
   - Meta Description: "Step-by-step guide to automating Python code quality checks. Use pylint-github-action to run PyLint and display a dynamic score badge."
2. **Tutorial Series**: Python CI/CD automation best practices
3. **FAQ Content**: Common PyLint configuration issues and solutions

**Distribution Channels**:
- GitHub Marketplace (primary)
- Python community forums (Reddit r/Python, Stack Overflow)
- Dev.to and Medium technical blogs
- Python newsletters (PyCoder's Weekly)

## 4. Competitor and GitHub Star Intelligence

| Tool | Stars | Used By | Key Feature | Pricing |
|------|-------|---------|-------------|---------|
| **Silleellie/pylint-github-action** | 66-121* | ~1,100 repos | Dynamic badge updates | Free (OSS) |
| **py-actions/pylint** | 68-159 | ~500 repos | Basic PyLint execution | Free (OSS) |
| **ricardochaves/pylint-action** | 115-119 | ~1,100 repos | PR annotations | Free (OSS) |
| **astral-sh/ruff-action** | 739 | ~46,800 repos | Fast linting (Ruff) | Free (OSS) |
| **SonarCloud** | N/A | Enterprise | Full analysis platform | Free for OSS, paid for private |
| **CodeClimate** | N/A | Enterprise | Quality platform | Free for OSS, $99-299/month |

*Star counts vary across research lanes due to timing differences

**Competitive Advantage**: Only action with automatic README badge updates

## 5. Chatter and Demand Signals

**Common User Complaints**:
- Setup complexity around permissions and badge placeholders
- Concerns about automatic commits creating noise
- Documentation gaps for advanced scenarios
- YAML syntax confusion for multi-path linting

**Positive Signals**:
- Clear demand for automated code quality visibility
- Interest in badge customization options
- Value placed on zero-maintenance solutions

**Switching Barriers**:
- Perceived setup complexity
- Fear of breaking existing workflows
- Security concerns about write permissions

## 6. Factual Validation and Evidence Gaps

**Verified Claims**:
- ✅ Action exists at `Silleellie/pylint-github-action@v3`
- ✅ PyLint scoring system (0-10 scale) accurate
- ✅ Badge generation functionality confirmed
- ✅ MIT License (permissive)
- ✅ Active maintenance (October 2024)

**Unverified/Gaps**:
- ❓ Exact performance impact on CI/CD pipelines
- ❓ Badge update reliability across all configurations
- ❓ Specific color mapping implementation details
- ❓ Current GitHub Marketplace ranking

## 7. Build Requirements and Acceptance Gates

**Prerequisites**:
1. Repository write permissions enabled (Settings > Actions > General)
2. Badge placeholder in README.md: `![pylint]()`
3. Python project structure defined
4. Target lint paths identified

**Implementation Requirements**:
```yaml
name: PyLint with Dynamic Badge
on: [push, pull_request]
permissions:
  contents: write
jobs:
  pylint:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: Silleellie/pylint-github-action@301534453d02a5c2225254b73f2b2c451618b01f
      with:
        lint-path: src
        python-version: "3.11"
        commit-message: "chore: update pylint badge [skip ci]"
```

**Acceptance Criteria**:
- [ ] Badge updates correctly after PyLint execution
- [ ] No workflow cascading occurs
- [ ] No conflicts with branch protection rules
- [ ] Documentation updated with setup instructions

## 8. Code Review Agent Packet

### For Bito AI
```
Review focus: Security implications of granting write permissions to third-party action.
Check for: Proper permission scoping, commit SHA pinning, workflow isolation.
```

### For OpenRouter
```
Analyze: Workflow configuration for potential infinite loops or cascading triggers.
Verify: Proper use of [skip ci] in commit messages.
```

### For Coderabbit
```
Validate: README.md badge placeholder format matches expected pattern.
Ensure: Python version and lint paths are correctly configured.
```

### For Ralph Loop
```
Security audit: Review action source at commit SHA 301534453d02a5c2225254b73f2b2c451618b01f
Check: No unexpected file modifications beyond README.md
```

**Blocking Finding**: Using floating tag `@v3` instead of commit SHA
**Automatic Fix**: 
```yaml
# Replace
uses: Silleellie/pylint-github-action@v3
# With
uses: Silleellie/pylint-github-action@301534453d02a5c2225254b73f2b2c451618b01f
```
**Commit Message**: `fix: pin pylint action to specific commit SHA for security`

## 9. Automatic Fix and Commit Queue

### Fix 1: Add Workflow File
**File**: `.github/workflows/pylint.yml`
**Commit**: `feat: add PyLint action with dynamic badge`

### Fix 2: Add Badge Placeholder
**File**: `README.md`
**Change**: Insert `![pylint]()` at top of file
**Commit**: `docs: add pylint badge placeholder`

### Fix 3: Security Documentation
**File**: `docs/security/third-party-actions.md`
**Content**: Document write permission requirements and risks
**Commit**: `docs: add security notes for GitHub Actions`

### Fix 4: Monitoring Workflow
**File**: `.github/workflows/dependency-monitor.yml`
**Purpose**: Weekly check of action repository health
**Commit**: `ci: add dependency health monitoring`

## 10. Labels to Apply

**Required Labels**:
- `security-review-required` - Write permissions needed
- `third-party-dependency` - External action dependency
- `ci-enhancement` - CI/CD improvement
- `documentation-update-needed` - README modification required
- `python-tooling` - Python-specific tooling

**Risk Labels**:
- `risk:workflow-cascading` - Potential for infinite loops
- `risk:maintenance` - Single maintainer dependency
- `risk:security-permissions` - Requires write access

## 11. Repository Review and Best Alternative

**Primary Recommendation**: `Silleellie/pylint-github-action@v3`
- **Confidence Score**: 75/100
- **Rationale**: Only action with automatic badge updates, actively maintained

**Best Alternative**: `py-actions/pylint` + manual badge setup
- More mature (159 stars vs 66-121)
- Lacks automatic badge feature
- Would require additional scripting for badges

**Fallback Strategy**:
1. Short-term: Use `ricardochaves/python-lint` with manual badges
2. Long-term: Consider SonarCloud for enterprise features

## 12. Confidence Score Summary

**Overall Confidence**: 72/100

**Score Breakdown**:
- Technical Feasibility: 85/100 (proven functionality)
- Security Posture: 65/100 (requires hardening)
- Maintenance Risk: 70/100 (single maintainer)
- Market Fit: 75/100 (unique feature set)
- Implementation Complexity: 65/100 (setup friction)

**Best-Scoring Recommendation**: Proceed with implementation using security hardening measures (commit SHA pinning, [skip ci] tags, scoped permissions). The unique badge automation feature justifies the moderate risks when properly mitigated.

**Critical Success Factors**:
1. Pin to specific commit SHA for security
2. Use `[skip ci]` to prevent workflow cascading
3. Document setup requirements clearly
4. Monitor action repository health monthly
---

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

## Learnings — What & Why

N/A — completed

<!--
Guidance: agents completing other WR types should fill this in themselves once
done — capture what was learned and _why_ it matters, not just what changed.
For follow-up-generated WRs this section is populated automatically by the
Follow-up Checkbox Router with the original follow-up text, a link to the
source PR/issue, and (if applicable) a note that this is a chained follow-up.
-->
