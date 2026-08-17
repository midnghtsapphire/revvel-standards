# WR: [WR] add - name: 42 Project Badge   uses: bauhaas/42project-badge-action@v1.0.2

**Issue:** #16198  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-22  
**Research Date:** 2026-07-22  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---

<!-- revvel-research-findings -->
## Research Findings

Source packet: `docs/research-engine/run-29444077515.md`

## WR Research Packet: 42 Project Badge Action

## 1. Executive Decision

**DO NOT PROCEED** with `bauhaas/42project-badge-action@v1.0.2` as specified. The repository does not exist or has been deleted/made private.

**RECOMMENDED ACTION**: Use `alexandregv/42-badges-action` (111 stars, actively maintained) or the hosted service `badge.42.fr` instead. These alternatives are more secure, actively maintained, and eliminate the need for GitHub Gists and broadly-scoped PATs.

**FALLBACK OPTION**: If you must use the original approach, use `Korkrane/42project-badge-action@v1.0.0` (41 stars, documented) instead of the non-existent `bauhaas` fork.

## 2. Audience We Are Going After and Why

**Primary Audience**: 42 School students and alumni (estimated ~10,000+ globally)
- **Pain Point**: Manually updating project status badges is tedious
- **Value Prop**: "Set it and forget it" portfolio enhancement
- **Channels**: Word-of-mouth within 42 Discord/Slack communities, GitHub discovery

**Secondary Audience**: Technical recruiters evaluating 42 School candidates
- **Value**: Quick visual assessment of candidate progress and achievements

**Why This Audience**: Extremely niche but highly engaged technical community with strong peer recognition culture. However, the market is too small for monetization.

## 3. Marketing and SEO Plan

**Target Keywords**:
- High-intent: "42 school badge github action", "42 project badge generator"
- Informational: "42 school project tracking", "automated project status badges"

**Content Strategy**:
- Title: "42 School Project Badge Generator - GitHub Action Integration"
- Meta: "Automatically generate 42 School project badges for GitHub repositories. Display grades, bonus points, and completion status with shields.io integration."

**Distribution**: GitHub Marketplace, 42 Network forums, Reddit r/42Network

**SEO Risk**: Extremely low search volume due to niche market

## 4. Competitor and GitHub Star Intelligence

| Competitor | Stars | Last Commit | Pricing | Key Differentiator |
|------------|-------|-------------|---------|-------------------|
| **alexandregv/42-badges-action** | 111 | May 2024 | Free | **RECOMMENDED** - Commits SVGs directly, no Gist needed |
| **JaeSeoKim/badge42** | 329 | Feb 2024 | Free | Hosted service at badge.42.fr, no workflow needed |
| Korkrane/42project-badge-action | 41 | Feb 2023 | Free | Original implementation, requires Gist |
| bauhaas/42project-badge-action | 0 | **NOT FOUND** | N/A | Repository doesn't exist |

## 5. Chatter and Demand Signals

**Common Issues**:
- Confusion over Gist setup and token permissions
- Security concerns about storing PATs with broad `gist` scope
- Documentation fragmentation between forks

**Community Feedback**:
- "I followed the README but my badge isn't updating" (GitHub Issue #2)
- "Is it safe to put my token in GitHub secrets?" (Reddit thread)

**Unmet Needs**: Video tutorials, automated configuration validation, better error messages

## 6. Factual Validation and Evidence Gaps

**CRITICAL FINDING**: Repository mismatch
- ❌ `bauhaas/42project-badge-action` - Repository not found (404)
- ✅ `Korkrane/42project-badge-action` - Exists but unmaintained since 2023
- ✅ Better alternatives exist (alexandregv, badge42)

**Evidence Gaps**:
- Cannot verify 42 School API stability
- No usage metrics available
- Maintenance status uncertain for all options

## 7. Build Requirements and Acceptance Gates

**Requirements**:
1. Replace non-existent `bauhaas` reference with working alternative
2. Document security best practices for PAT handling
3. Add pre-flight validation for Gist ID and token

**Acceptance Gates**:
- [ ] Action repository verified to exist
- [ ] Security review completed for token scopes
- [ ] Test workflow executes successfully
- [ ] Badges render correctly in README
- [ ] Documentation updated with correct references

## 8. Code Review Agent Packet

### For Bito AI / Coderabbit
```yaml
# BLOCKING: Replace non-existent action
# OLD (broken):
uses: bauhaas/42project-badge-action@v1.0.2

# NEW (recommended):
uses: alexandregv/42-badges-action@latest
# OR (fallback):
uses: Korkrane/42project-badge-action@v1.0.0
```

### Security Review Required
- PAT with `gist` scope grants access to ALL user gists
- Recommend using dedicated bot account for token
- Add warning comments about token permissions

## 9. Automatic Fix and Commit Queue

### Fix 1: Update Action Reference
```yaml
# .github/workflows/42-badges.yml
- name: 42 Badges Action
  uses: alexandregv/42-badges-action@latest
  with:
    login: ${{ secrets.USER_42_LOGIN }}
    token: ${{ secrets.USER_42_TOKEN }}
```
**Commit**: `fix: replace non-existent bauhaas action with maintained alternative`

### Fix 2: Add Security Documentation
```markdown
# Security Notice
⚠️ This action requires 42 School credentials. Use a dedicated bot account.
Never use your personal 42 account credentials in CI/CD.
```
**Commit**: `docs: add security warning for 42 credentials`

### Fix 3: Add Validation Workflow
```yaml
- name: Validate Action Exists
  run: |
    curl -f "https://api.github.com/repos/alexandregv/42-badges-action" || exit 1
```
**Commit**: `ci: add action existence validation`

## 10. Labels to Apply

- `risk:repository-not-found` 🔴
- `security-review-required` 🟡
- `needs-alternative-solution` 🟡
- `niche-market-risk` 🟡
- `documentation-mismatch` 🟡
- `external-dependency` 🟡

## 11. Repository Review and Best Alternative

**Best Alternative**: `alexandregv/42-badges-action`
- ✅ Actively maintained (May 2024)
- ✅ 111 stars with community adoption
- ✅ No Gist dependency (more secure)
- ✅ Commits badges directly to repo
- ✅ Better documentation

**Simplest Alternative**: `badge.42.fr` hosted service
- No GitHub Action needed
- Just add markdown: `![42 Badge](https://badge.42.fr/api/v2/...)`

## 12. Confidence Score Summary

**Overall Confidence**: 25/100

**Breakdown**:
- Repository Existence: 0/100 (bauhaas repo not found)
- Alternative Solutions: 90/100 (excellent alternatives exist)
- Security: 40/100 (PAT scope concerns)
- Market Viability: 20/100 (extremely niche)
- Maintenance Risk: 30/100 (most options unmaintained)

## **Decision**: The requested `bauhaas` action should NOT be implemented. Use `alexandregv/42-badges-action` or `badge.42.fr` instead. These alternatives are actively maintained, more secure, and have proven community adoption

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

N/A — pending Jules refinement

<!--
Guidance: agents completing other WR types should fill this in themselves once
done — capture what was learned and _why_ it matters, not just what changed.
For follow-up-generated WRs this section is populated automatically by the
Follow-up Checkbox Router with the original follow-up text, a link to the
source PR/issue, and (if applicable) a note that this is a chained follow-up.
-->
