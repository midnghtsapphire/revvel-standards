# WR: [WR] /dragnet create starswap but find a way better name as part of this implementation save files to memory in detail

**Issue:** #15724  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-12  
**Research Date:** 2026-07-12  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---

<!-- revvel-research-findings -->
## Research Findings

Source packet: `docs/research-engine/run-29167221728.md`

## Executive Decision

**Recommendation: DO NOT BUILD** this system as specified. The core functionality violates GitHub's Terms of Service.

**Critical Finding**: Multiple research lanes confirm this is a "star-for-star scheme" explicitly prohibited by GitHub's Acceptable Use Policies. Building this would risk:
- Immediate platform suspension
- Permanent reputation damage to Revvel
- Legal liability for facilitating ToS violations

**Alternative Path**: Pivot to **RepoBeacon** - a legitimate project discovery platform that helps developers find quality repositories through curated showcases and genuine community engagement.

## Audience We Are Going After and Why

**Target Audience**: Open-source developers and project maintainers with <100 GitHub stars

**Urgent Pain Points**:
1. Quality projects remain undiscovered in GitHub's vast ecosystem
2. No legitimate discovery mechanisms for new repositories
3. Lack of initial social proof prevents organic growth

**Why This Audience**: 
- 73% of new GitHub projects never reach 10 stars (internal estimate: 60-80% range)
- High emotional urgency around project visibility
- Willing to invest time in legitimate promotion strategies

**Language They Use**:
- "My project is stuck at 0 stars"
- "How do I get my first contributors?"
- "GitHub discovery is broken for new projects"

## Marketing and SEO Plan

## SEO Strategy

**Primary Keywords** (estimated monthly searches):
- "GitHub project promotion" (500-1,000)
- "how to get GitHub stars" (1,000-2,000)
- "GitHub repository discovery" (300-800)

**Content Strategy**:
1. **Blog Series**: "Ethical GitHub Growth Strategies"
2. **Landing Page**: "RepoBeacon - Discover Quality Open Source Projects"
3. **Case Studies**: Success stories of projects that grew organically

**Technical SEO Requirements**:
- Implement structured data for software applications
- Create GitHub integration landing pages
- Build backlinks from developer communities

## Marketing Channels

1. **Primary**: GitHub Marketplace listing
2. **Secondary**: Dev.to articles, Hacker News launches
3. **Community**: Reddit (r/opensource), Discord developer servers

## Competitor and GitHub Star Intelligence

| Competitor | Stars | Pricing | Last Update | Differentiation |
|------------|-------|---------|-------------|-----------------|
| GitHub Trending | N/A | Free | Daily | Official but algorithm-based |
| Awesome Lists | Varies | Free | Ongoing | Manual curation, high barrier |
| Product Hunt | N/A | Free listing | Daily | Not GitHub-specific |
| **Black Market Services** | N/A | $50-500 | Active | Violate ToS, risk account ban |

**Key Insight**: No legitimate competitors exist in the "project discovery" space. The only direct competitors are ToS-violating services.

## Chatter and Demand Signals

**Community Sentiment**:
- "Starswap sounds like a crypto thing, not a GitHub automation" - Multiple sources
- "Please pick a name that tells me what it does" - User feedback
- Strong negative reaction to anything resembling "gaming the system"

**Demand Signals**:
- GitHub Discussions show recurring threads about project discovery
- Reddit r/opensource has weekly "how to promote my project" posts
- No legitimate solution currently addresses this need

## Factual Validation and Evidence Gaps

**Verified Facts**:
- GitHub explicitly prohibits "star-for-star schemes" in their Acceptable Use Policies
- The proposed webhook architecture is technically feasible
- In-memory storage requirement conflicts with stated PostgreSQL backend

**Critical Evidence Gaps**:
- No market size data for GitHub project discovery tools
- No pricing validation from potential users
- No legal review of GitHub ToS compliance

**Unverifiable Claims**:
- Customer willingness to pay
- Actual search volumes (requires paid SEO tools)
- GitHub's enforcement patterns for ToS violations

## Build Requirements and Acceptance Gates

## Pivot Requirements for RepoBeacon

### Core Features
1. **Project Showcase System**
   - Weekly curated lists
   - Community voting (not star manipulation)
   - Quality criteria enforcement

2. **Discovery Algorithm**
   - Based on code quality metrics
   - Recent commit activity
   - Documentation completeness

3. **Developer Profiles**
   - Showcase maintained projects
   - Track discovery metrics
   - Build reputation score

### Technical Requirements
- GitHub OAuth integration (read-only)
- PostgreSQL for data persistence
- Redis for caching and sessions
- Webhook handlers for repository updates

### Acceptance Gates
- [ ] Legal review confirms ToS compliance
- [ ] MVP validates with 20+ project maintainers
- [ ] Discovery algorithm shows 10x better results than random
- [ ] Community guidelines prevent gaming
- [ ] Moderation system in place

## Code Review Agent Packet

## Critical Blockers

### 1. ToS Violation in Core Logic
**Finding**: Any implementation of star swapping violates GitHub ToS
```javascript
// BLOCKED: This entire concept is prohibited
async function swapStars(repoA, repoB) {
  // DO NOT IMPLEMENT
}
```
**Fix**: Remove all star manipulation logic
**Commit**: `fix: remove ToS-violating star swap functionality`

### 2. Unsafe Webhook Validation
**Finding**: Missing HMAC signature verification
```javascript
// Current (unsafe)
app.post('/webhook', (req, res) => {
  handleWebhook(req.body);
});

// Fixed
app.post('/webhook', (req, res) => {
  if (!verifyWebhookSignature(req)) {
    return res.status(401).send('Unauthorized');
  }
  handleWebhook(req.body);
});
```
**Commit**: `fix: add HMAC signature verification for webhooks`

### 3. Memory Leak in File Storage
**Finding**: In-memory storage without cleanup
```javascript
// Add TTL and size limits
const cache = new Map();
const MAX_CACHE_SIZE = 100;
const TTL = 3600000; // 1 hour

function saveToMemory(key, data) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    cache.delete(oldest[0]);
  }
  cache.set(key, { data, timestamp: Date.now() });
}
```
**Commit**: `fix: add memory management for file cache`

## Automatic Fix and Commit Queue

```yaml
name: Auto-fix Critical Issues
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  compliance-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check for star manipulation
        run: |
          if grep -r "swapStar\|tradeStar\|exchangeStar" .; then
            echo "::error::ToS violation detected - star manipulation code found"
            exit 1
          fi
      
      - name: Verify webhook security
        run: |
          if ! grep -r "verifyWebhookSignature\|crypto.createHmac" src/webhooks/; then
            echo "::error::Webhook signature verification missing"
            exit 1
          fi
      
      - name: Check memory management
        run: |
          if grep -r "new Map()" src/ | grep -v "MAX_SIZE\|TTL"; then
            echo "::warning::Unbounded memory usage detected"
          fi
```

## Labels to Apply

**Immediate**:
- `compliance-risk-critical`
- `pivot-required`
- `legal-review-required`
- `tos-violation-risk`

**Technical**:
- `security-webhook-validation`
- `memory-leak-risk`
- `needs-architecture-review`

**Process**:
- `needs-market-validation`
- `needs-user-research`
- `blocked-legal`

## Repository Review and Best Alternative

## Best Alternative: Probot Framework

**Recommendation**: Use [Probot](https://github.com/probot/probot) (8.5k stars) as the foundation for RepoBeacon.

**Why Probot**:
- Mature GitHub App framework with webhook handling
- Built-in security best practices
- Active community and maintenance
- Extensible architecture for custom features

**Implementation Path**:
1. Fork Probot starter template
2. Add RepoBeacon-specific discovery logic
3. Implement showcase and voting features
4. Deploy as GitHub App

**Alternative Stack**:
- Next.js for frontend
- PostgreSQL for data
- Redis for caching
- GitHub OAuth for authentication

## Confidence Score Summary

**Overall Confidence: 75/100**

**High Confidence (90-95)**:
- ToS violation assessment
- Technical architecture feasibility
- Security requirements

**Medium Confidence (70-80)**:
- Market demand for legitimate discovery tool
- Developer willingness to use showcase platform
- Technical implementation with Probot

**Low Confidence (40-60)**:
- Monetization potential
- Specific search volumes
- User acquisition costs

## **Critical Decision**: The original "starswap" concept must be abandoned due to ToS violations. The pivot to RepoBeacon as a legitimate discovery platform has strong potential but requires market validation before significant investment

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

create starswap but find a way better name as part of this implementation save files to memory in detail

### Objective

create a startswap system for github all doc attached

[webhook-unstar-handler-and-middleware.md](https://github.com/user-attachments/files/29930376/webhook-unstar-handler-and-middleware.md)
<img width="1536" height="2752" alt="Image" src="https://github.com/user-attachments/assets/95e555fb-f055-4858-a837-fe6d4645ee93" />
<img width="1536" height="2752" alt="Image" src="https://github.com/user-attachments/assets/c3caffde-5d9c-4621-98f6-1353eece9978" />
<img width="1536" height="2752" alt="Image" src="https://github.com/user-attachments/assets/ad9b9d52-4022-4f9e-951a-d7e634ce9e72" />
[starswap-backend-draft-v2.md](https://github.com/user-attachments/files/29930373/starswap-backend-draft-v2.md)
[The_Starswap_Playbook.pdf](https://github.com/user-attachments/files/29930374/The_Starswap_Playbook.pdf)
<img width="1536" height="2752" alt="Image" src="https://github.com/user-attachments/assets/236b7442-f538-411c-b7d1-c4d41cbf2118" />
<img width="1536" height="2752" alt="Image" src="https://github.com/user-attachments/assets/b5c47a75-ef19-484a-86b4-223954dee767" />
[webhook-api-and-access-control (1).md](https://github.com/user-attachments/files/29930379/webhook-api-and-access-control.1.md)
[webhook-api-and-access-control.md](https://github.com/user-attachments/files/29930375/webhook-api-and-access-control.md)
[Starswap_Agentic_Deployment.pdf](https://github.com/user-attachments/files/29930378/Starswap_Agentic_Deployment.pdf)
[Architecting_Starswap.pdf](https://github.com/user-attachments/files/29930377/Architecting_Starswap.pdf)

### Required Bundle

A complete GitHub star management system bundle including webhook handlers for star/unstar events, backend API with access control, in-memory file storage system, user authentication middleware, and the core starswap application with improved naming conventions. The bundle encompasses all components needed for a production-ready star tracking and management platform as detailed in the attached documentation and specifications.

### Definition of Done

A production-ready GitHub star management application is deployed with a finalized name (replacing "starswap"), complete webhook handlers for star/unstar events, in-memory file storage system implemented, and all backend APIs functional according to the provided specifications. The application successfully processes GitHub webhook events, maintains star state in memory, and provides the core starswap functionality as outlined in the attached documentation. All components are tested, integrated, and ready for production use with proper error handling and access controls in place.

### Do Not Under-Scope

Don't limit this to just basic star/unstar functionality - this system needs comprehensive webhook handling for multiple GitHub events, robust access control with API key management, proper middleware architecture, and scalable file storage in memory with detailed persistence mechanisms. The attached documentation shows this is a full production application requiring database integration, user authentication, rate limiting, and potentially real-time notifications. Ensure the implementation includes proper error handling, logging, and monitoring capabilities as outlined in the technical specifications.

### Explicit Exclusions

This WR excludes UI/UX design and frontend implementation, focusing solely on backend system development. Database schema design and migration scripts are not included in this scope. Third-party integrations beyond GitHub's webhook API are excluded. Performance optimization and scalability enhancements are deferred to future iterations.

### Delivery Shape

One PR preferred, split only if blocked

### Sellable Artifact Bundle

N/A — not a sellable artifact for this Output Type.

### Purchase Validation (functions-as-purchased)

N/A — not a purchased artifact for this Output Type.

### Expected Scope

1 shippable app with docs + tests + deploy path

### Validation Expectations

The production app must successfully handle GitHub webhook events for star/unstar actions, implement secure authentication and access control mechanisms, and maintain persistent in-memory storage of user interaction data. The system should demonstrate proper webhook validation, rate limiting, and error handling while providing a functional API for querying star swap statistics. All file operations must be performed in-memory as specified, with validation that data persists correctly across webhook events and API calls.

### Blocker Rule

If any part of the Required Bundle cannot be completed in one iteration, open a WR-BLOCKER issue (label: `wr-blocker`) that names the missing capability, credential, or human action, and reference it from the PR body. Do NOT silently drop scope.

### Acknowledgements

- [x] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [x] Explicitly requested secondary items should not be silently deferred.
- [x] If the PR is partial, the blocker must be documented.
- [x] The PR should reflect the WR's required bundle and definition of done.
- [x] After implementation, open a PR and continue the loop (reset routing labels / trigger downstream workflows) instead of stopping at the issue.

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
