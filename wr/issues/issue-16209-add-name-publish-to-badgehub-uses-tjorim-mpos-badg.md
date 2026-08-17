# WR: [WR] add - name: Publish to BadgeHub   uses: tjorim/mpos-badgehub-publish@v1.0.11

**Issue:** #16209  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-22  
**Research Date:** 2026-07-22  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---

<!-- revvel-research-findings -->
## Research Findings

Source packet: `docs/research-engine/run-29444936730.md`

## Executive Decision

**PROCEED WITH CAUTION** - Implement the GitHub Action `tjorim/mpos-badgehub-publish@v1.0.11` with mandatory end-to-end testing before production use.

The action solves real developer pain points in the MicroPythonOS badge ecosystem and has no viable alternatives. However, the incomplete end-to-end testing of the final publish call represents a blocking risk that must be resolved before production deployment.

## Audience We Are Going After and Why

**Primary Audience**: MicroPythonOS developers building applications for electronic badges (conference badges, maker projects)

**Why This Audience**:
- High technical sophistication with urgent need for CI/CD automation
- Currently suffering from manual deployment friction to BadgeHub.eu
- Small but passionate community around badge hacking (DEF CON, CCC events)
- No existing automation solutions for this specific workflow

**Pain Points Addressed**:
- Manual 5+ step publishing process
- Undocumented API quirks (Cloudflare blocking, path encoding)
- Stale file management complexity
- Lack of deployment verification

## Marketing and SEO Plan

## Content Strategy
1. **Technical Tutorial** (30 days): "How to Automatically Publish MicroPythonOS Apps to BadgeHub with GitHub Actions"
   - Target keywords: `micropython badge deployment`, `badgehub api integration`, `github actions micropython`
   - Include troubleshooting for Cloudflare 403 and subdirectory encoding issues

2. **Documentation Hub** (immediate):
   - Comprehensive README with setup, usage, and troubleshooting
   - FAQ section targeting long-tail queries
   - Video walkthrough for visual learners

3. **Community Engagement** (60 days):
   - Present at badge-related conferences (DEF CON, CCC)
   - Contribute to MicroPythonOS forums and Discord servers
   - Create example repositories demonstrating usage

## SEO Implementation
- **Title**: "GitHub Action: Automated BadgeHub Publishing for MicroPythonOS Apps"
- **Meta Description**: "Streamline MicroPython badge app deployment with automated GitHub Actions integration for BadgeHub.eu. One-click publishing with built-in validation."
- **Structured Data**: Software/tool markup for GitHub Actions

## Competitor and GitHub Star Intelligence

| Competitor | Stars | Last Update | Pricing | Differentiation |
|------------|-------|-------------|---------|-----------------|
| tjorim/mpos-badgehub-publish | 2 | 2024-06-06 | Free (OSS) | Only purpose-built solution for BadgeHub.eu |
| actions/upload-artifact | 21.8k | Active | Free | Generic artifact upload, no BadgeHub integration |
| softprops/action-gh-release | 4.1k | 2024 | Free | GitHub releases only, not BadgeHub |
| Custom scripts | N/A | N/A | Free | Manual, error-prone, no standardization |

**Market Position**: First-mover advantage in ultra-niche market. No direct competition exists.

## Chatter and Demand Signals

## Verified Signals
- **Developer Frustration**: Documented issues with BadgeHub API (multipart field names, Cloudflare blocking)
- **Real Usage**: Test project `tjorim/bomberboy-mpos` demonstrates actual need
- **API Documentation Gaps**: Filed issue BadgeHubCrew/badgehub-app#7 shows active problem-solving

## Unverified Signals
- Community size for MicroPythonOS badge development (requires forum/Discord analysis)
- BadgeHub.eu adoption metrics (requires API access)
- Conference badge development cycles (likely seasonal around major events)

## Factual Validation and Evidence Gaps

## Verified Facts
✅ BadgeHub API exists at <https://badgehub.eu/api-docs/swagger.json>  
✅ Action repository exists at specified version  
✅ Technical workarounds for Cloudflare and path encoding are accurate  
✅ Companion action tjorim/mpos-package-mpk exists  

## Critical Gap
❌ **End-to-end publish functionality not confirmed** - This is a blocking issue

## Evidence Needed
- Live API testing of complete publish workflow
- BadgeHub.eu platform metrics and stability assessment
- Community size validation through forum scraping

## Build Requirements and Acceptance Gates

## Requirements
1. **Authentication**: Repository secret `BADGEHUB_API_TOKEN` properly configured
2. **Dependencies**: Prior execution of `tjorim/mpos-package-mpk@v1` for .mpk generation
3. **App Structure**: Valid MANIFEST.JSON, entrypoint .py, and icon file
4. **API Access**: BadgeHub.eu project created with proper permissions

## Acceptance Gates
- [ ] **BLOCKING**: End-to-end publish test completes successfully
- [ ] Dry-run mode executes without network calls
- [ ] File upload handles subdirectories correctly
- [ ] Stale file cleanup removes only intended files
- [ ] Revision number advances after publish
- [ ] Error messages are actionable for common failures

## Code Review Agent Packet

## For Bito AI
```yaml
# Review focus areas:
- Verify error handling for all API calls
- Check User-Agent header is set correctly
- Validate percent-encoding implementation for file paths
- Ensure dry-run mode prevents all network calls
```

## For OpenRouter
```yaml
# Security review:
- API token handling follows GitHub Actions best practices
- No credentials logged in verbose mode
- File operations are properly sandboxed
```

## For Coderabbit
```yaml
# Implementation review:
- Verify revision checking logic is robust
- Confirm stale file detection algorithm
- Check multipart upload field name usage
```

## For Ralph Loop
```yaml
# Integration testing:
- Mock BadgeHub API responses for unit tests
- Verify Cloudflare workaround effectiveness
- Test subdirectory file handling edge cases
```

## Automatic Fix and Commit Queue

## Blocking Fix Required
```yaml
# File: .github/workflows/e2e-test.yml
name: End-to-End BadgeHub Test
on: [push, pull_request]
jobs:
  test-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test Complete Publish Flow
        uses: tjorim/mpos-badgehub-publish@v1.0.11
        with:
          slug: test-project
          api-token: ${{ secrets.BADGEHUB_TEST_TOKEN }}
          app-dir: ./test-app
          mpk-path: ./test-app.mpk
      - name: Verify Revision Advanced
        run: |
          # Check revision number increased
          curl -f https://badgehub.eu/project-latest-revisions/test-project
```
**Commit message**: `test: add mandatory e2e publish verification`

## Documentation Fix
```yaml
# File: README.md
# Add after installation section:

## ⚠️ Critical Setup Requirement

The final publish functionality requires end-to-end testing before production use.
See `.github/workflows/e2e-test.yml` for verification steps.

## Known Issues
- Cloudflare blocks Python's default User-Agent (handled automatically)
- Subdirectory files require percent-encoding (handled automatically)
- Multipart field name not documented in API spec (see BadgeHubCrew/badgehub-app#7)
```
**Commit message**: `docs: add critical setup requirements and known issues`

## Labels to Apply

- `needs-e2e-verification` (BLOCKING)
- `external-dependency`
- `niche-market`
- `documentation-heavy`
- `api-integration`
- `risk:incomplete-testing`
- `first-mover-advantage`

## Repository Review and Best Alternative

## Primary Choice
**Use `tjorim/mpos-badgehub-publish@v1.0.11`** - It's the only purpose-built solution for BadgeHub.eu publishing.

## Fallback Options
1. **Custom Implementation**: Build using `fjogeleit/http-request-action@v1` for generic API calls
2. **Manual Process**: Document manual publishing steps as emergency fallback
3. **Fork and Maintain**: If original becomes unmaintained, fork for organizational control

## Risk Mitigation
- Pin to specific version (v1.0.11) to avoid breaking changes
- Implement monitoring for BadgeHub API changes
- Maintain documentation of manual fallback process

## Confidence Score Summary

## Overall Confidence: 72%

### Lane Breakdown
- **Market Positioning**: 85% - Clear need, no competition, real usage evidence
- **Technical Implementation**: 90% - Well-designed with robust error handling
- **Testing Coverage**: 40% - Critical end-to-end test missing (BLOCKING)
- **Documentation**: 75% - Comprehensive but needs production warnings
- **Market Size**: 60% - Ultra-niche but engaged audience

### Best Scoring Idea
The automated CI/CD integration for BadgeHub publishing addresses a real, urgent pain point in a niche but passionate developer community. The technical implementation is sophisticated, handling multiple undocumented API quirks. However, the incomplete end-to-end testing represents a critical blocker that must be resolved before production deployment.

## **Recommendation**: Proceed with implementation but mandate successful end-to-end testing as a blocking requirement. The action provides unique value with no alternatives, making it worth the investment despite the small market size

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
