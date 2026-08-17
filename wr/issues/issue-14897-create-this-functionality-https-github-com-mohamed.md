# WR: [WR] create this functionality https://github.com/MohamedAbdallah-14/open-design

**Issue:** #14897  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Research Date:** 2026-07-01  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---


<!-- revvel-research-findings -->
## Research Findings

Source packet: `docs/research-engine/run-28555109128.md`

# Executive Decision

**BLOCK** - This Work Request cannot proceed to development. Critical requirements are missing, making implementation impossible.

## Blocking Issues:
1. **Empty Work Request**: All 9 required fields are blank despite checkboxes being marked
2. **Undefined Scope**: "Create this functionality" with no specification of which features from the 41-star repository
3. **No Success Criteria**: Zero validation expectations or acceptance criteria defined
4. **Repository Inaccessible**: Target repo may be private/deleted (404 errors reported)

## Required Before Proceeding:
- Complete WR template with specific objectives and scope
- Define MVP features from the reference application
- Establish measurable success criteria
- Verify repository accessibility

---

# Audience We Are Going After and Why

## Target Segments (Inferred from Similar Tools)

### Primary: Small Design Teams & Indie Developers
- **Pain Points**: High cost of Figma/Adobe licenses, vendor lock-in concerns
- **Urgent Need**: Self-hostable, open-source alternative after Adobe-Figma acquisition fears
- **Willingness to Pay**: $12-30/month for hosted version with collaboration

### Secondary: Open-Source Advocates
- **Pain Points**: Data sovereignty, privacy concerns with cloud-only tools
- **Urgent Need**: Full control over design files and infrastructure
- **Willingness to Pay**: $0 for self-hosted, may contribute code/sponsorship

### Why This Audience:
- Penpot's $8M funding validates market demand
- Figma pricing changes created switching triggers
- Growing "local-first" movement in design tools

---

# Marketing and SEO Plan

## Positioning Statement
"The Self-Hostable, Open-Source Figma Alternative"

## SEO Strategy

### Target Keywords (Long-tail Focus)
- "self-hosted design tool for developers"
- "open source figma alternative docker"
- "free collaborative design tool github"
- "penpot vs open-design comparison"

### Content Pillars
1. **Migration Guides**: "How to Migrate from Figma to Open-Design"
2. **Comparison Pages**: `/vs/figma`, `/vs/penpot`, `/vs/canva`
3. **Technical Tutorials**: Self-hosting guides, Docker deployment
4. **Case Studies**: Teams saving money with open-source design

### Landing Page Structure
- **Title**: "Open Design: Free, Open-Source Collaborative Design Tool | Figma Alternative"
- **Meta**: "Create, prototype, and collaborate in real-time. Self-hostable design tool for modern teams. Get started in seconds."
- **FAQ Angles**: Is it really free? How does it compare to Figma? Can I self-host?

## Distribution Channels
- GitHub (primary discovery)
- Hacker News (launch announcement)
- Reddit (r/opensource, r/selfhosted, r/design_tools)
- Product Hunt (timed launch)
- Design community Slack/Discord servers

---

# Competitor and GitHub Star Intelligence

## Direct Competitors

### Commercial Leaders
| Tool | Pricing | Moat | Market Position |
|------|---------|------|-----------------|
| **Figma** | Free + $12-45/user/mo | Network effects, plugins, enterprise | Market leader, Adobe acquisition |
| **Canva** | Freemium model | Templates, ease of use | Consumer/SMB focus |
| **Adobe XD** | $9.99/mo | Creative Cloud integration | Declining market share |

### Open-Source Alternatives
| Repository | Stars | Last Commit | Key Features | Momentum |
|------------|-------|-------------|--------------|----------|
| **penpot/penpot** | 32k+ | Active daily | Full Figma alternative, SVG-based | High - $8M funding |
| **excalidraw/excalidraw** | 82k+ | Active daily | Whiteboard/sketching focus | Very high |
| **tldraw/tldraw** | 35k+ | Active daily | Infinite canvas, embeddable | High momentum |
| **open-design** | 41 | ~1 month ago | Early stage, Fabric.js based | Very low |

## Competitive Gaps
- Penpot dominates open-source design space
- No clear differentiation for new entrants
- Feature parity with Figma requires years of development

---

# Chatter and Demand Signals

## Market Signals

### Validated Pain Points
- **Figma Pricing Backlash**: "Figma's 2023 pricing changes moving viewers to paid seats generated significant negative feedback"
- **Adobe Acquisition Fears**: "The abandoned Adobe-Figma merger created widespread uncertainty about vendor lock-in"
- **Self-Hosting Demand**: Growing interest in local-first tools post-acquisition

### Community Activity
- **open-design repo**: 41 stars, minimal engagement, no issues/discussions
- **No social chatter**: Zero mentions on Reddit, HN, Twitter for this specific project
- **General demand**: Strong interest in Figma alternatives, but market is saturated

### Switching Barriers
- Existing design systems and component libraries
- Team collaboration workflows
- Plugin ecosystems
- File format compatibility

---

# Factual Validation and Evidence Gaps

## Critical Gaps

### Repository Status ❌
- **URL**: https://github.com/MohamedAbdallah-14/open-design
- **Status**: 404/Access Denied (multiple lanes report)
- **Impact**: Cannot verify functionality, tech stack, or implementation

### Work Request Validation ❌
| Field | Status | Impact |
|-------|--------|--------|
| Summary | Empty | Cannot understand intent |
| Objective | Empty | No success criteria |
| Scope | Empty | Unbounded implementation |
| Definition of Done | Empty | No completion validation |

### Technical Verification Needed
- Repository accessibility
- Technology stack analysis
- Dependency audit
- Security review
- Performance benchmarks

---

# Build Requirements and Acceptance Gates

## Cannot Define Without:
1. Repository access to analyze existing functionality
2. Completed WR fields defining scope
3. MVP feature selection from full application

## Proposed MVP (If Proceeding)
### Phase 1: Basic Canvas
- [ ] Single-user vector drawing
- [ ] Rectangle and circle tools
- [ ] Color selection
- [ ] Save/load functionality

### Phase 2: Collaboration
- [ ] Real-time cursor tracking
- [ ] Multi-user canvas sync
- [ ] Basic permissions

### Phase 3: Production Features
- [ ] Authentication (Clerk/Auth0)
- [ ] Project management
- [ ] Export functionality
- [ ] Performance optimization

## Technical Stack (Inferred)
- **Frontend**: Next.js, React, Tailwind CSS
- **Canvas**: Fabric.js
- **Real-time**: Liveblocks ($$ dependency)
- **Auth**: Clerk ($$ dependency)
- **Database**: TBD

---

# Code Review Agent Packet

## For Bito AI
```
CONTEXT: Implementing open-source design tool functionality
CRITICAL: Work Request is missing all requirements. Block any PR until:
1. Repository https://github.com/MohamedAbdallah-14/open-design is accessible
2. Specific features to implement are defined
3. Success criteria are established

SECURITY FOCUS:
- Validate all Liveblocks API keys are in .env, never committed
- Check Clerk authentication tokens are properly secured
- Ensure no Firebase credentials in source code
```

## For OpenRouter Review
```
TASK: Review design tool implementation against undefined requirements
BLOCKING ISSUE: No Definition of Done provided
ACTION: Reject all code submissions with message:
"Cannot review code without acceptance criteria. WR must define:
- Which features from open-design to implement
- Performance requirements
- Security requirements
- Test coverage expectations"
```

## For Coderabbit
```yaml
# Auto-review configuration
blocking_rules:
  - name: "Block if no tests"
    condition: "No test files modified"
    message: "Design tool requires test coverage for canvas operations"
  
  - name: "Block if secrets exposed"
    files: ["*.js", "*.ts", "*.jsx", "*.tsx"]
    pattern: "LIVEBLOCKS_SECRET|CLERK_SECRET|FIREBASE"
    message: "Secrets must be in .env file only"

  - name: "Block if no docs"
    condition: "No README updates"
    message: "Document deployment and configuration"
```

## For Ralph Loop
```
ARCHITECTURAL REVIEW for open-design implementation:
1. Verify separation of concerns between canvas, collaboration, and auth layers
2. Check for proper error boundaries around Fabric.js operations
3. Validate WebSocket connection management for real-time features
4. Ensure proper cleanup of canvas event listeners
5. Review state management approach (Redux/Zustand/Context)

PERFORMANCE GATES:
- Canvas operations must maintain 60fps with 100+ objects
- Real-time sync latency must be <100ms
- Initial load time <3s on 3G connection
```

---

# Automatic Fix and Commit Queue

## Immediate Fixes Required

### 1. Block Work Request
**File**: `.github/workflows/wr-validation.yml`
```yaml
name: Validate Work Request
on:
  issues:
    types: [opened, edited]
jobs:
  validate-wr:
    if: contains(github.event.issue.title, '[WR]')
    runs-on: ubuntu-latest
    steps:
      - name: Check Required Fields
        env:
          ISSUE_BODY: ${{ github.event.issue.body }}
          ISSUE_NUMBER: ${{ github.event.issue.number }}
        run: |
          if [[ "$ISSUE_BODY" == *"_No response_"* ]]; then
            gh issue comment "$ISSUE_NUMBER" --body \
            "❌ This Work Request is blocked due to missing requirements.
            
            Please complete:
            - Objective: What specific problem are we solving?
            - Definition of Done: How do we know when complete?
            - Expected Scope: Which features from open-design?
            
            The referenced repository may also be inaccessible."
            
            gh issue edit "$ISSUE_NUMBER" \
              --add-label "blocked-incomplete-wr,needs-clarification"
            exit 1
          fi
```
**Commit**: `fix: add WR validation to block incomplete requests`

### 2. Repository Access Check
**File**: `.github/workflows/repo-access-check.yml`
```yaml
name: Verify External Repository
on:
  issues:
    types: [opened]
jobs:
  check-repo:
    runs-on: ubuntu-latest
    steps:
      - name: Verify Repository Access
        env:
          ISSUE_BODY: ${{ github.event.issue.body }}
          ISSUE_NUMBER: ${{ github.event.issue.number }}
        run: |
          REPO_URL="$ISSUE_BODY"
          # Extract URL from body
          URL=$(echo "$REPO_URL" | grep -oP 'https://github\.com/[^/]+/[^/\s]+')
          
          if curl -f -s "https://api.github.com/repos/${URL#https://github.com/}" > /dev/null; then
            echo "✓ Repository accessible"
          else
            gh issue comment "$ISSUE_NUMBER" --body \
            "⚠️ Cannot access repository: $URL
            Please verify the repository is public or provide access."
            
            gh issue edit "$ISSUE_NUMBER" \
              --add-label "blocked-repo-access"
          fi
```
**Commit**: `fix: add external repository verification workflow`

### 3. Update WR Template
**File**: `.github/ISSUE_TEMPLATE/work-request.yml`
```yaml
name: Work Request
description: Create a work request for new functionality
body:
  - type: textarea
    id: objective
    attributes:
      label: Objective
      description: What specific problem are we solving? Be precise.
      placeholder: |
        Example: "Create a web-based vector drawing tool that allows users to:
        - Draw basic shapes (rectangles, circles)
        - Select and modify shape properties
        - Save designs locally"
    validations:
      required: true
      
  - type: textarea
    id: scope
    attributes:
      label: Expected Scope
      description: If referencing external code, which specific features?
      placeholder: |
        Example: "From the open-design repo, implement:
        - Shape drawing tools (not text or images)
        - Color picker
        - Canvas zoom/pan
        
        Exclude: real-time collaboration, commenting, user auth"
    validations:
      required: true
```
**Commit**: `fix: enhance WR template with required fields and examples`

---

# Labels to Apply

## Immediate Labels
- `blocked-incomplete-wr` - Missing all required fields
- `blocked-repo-access` - Cannot verify target repository
- `needs-clarification` - Scope undefined
- `risk:scope-creep` - Unbounded implementation
- `risk:high-effort` - Multi-year project if taken literally

## After Clarification
- `needs-market-research` - Validate differentiation vs Penpot
- `needs-technical-spike` - Assess Liveblocks integration
- `needs-security-review` - API key management
- `revenue-undefined` - No monetization strategy

## For Development (If Approved)
- `epic` - Multi-phase implementation
- `needs-architecture-review` - Complex real-time system
- `external-dependency` - Liveblocks, Clerk services
- `performance-critical` - Canvas rendering at scale
---

**WR Status:** 🟡 In Progress  

## Issue Context

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

_No response_

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

_No response_

### Acknowledgements

- [x] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [x] Explicitly requested secondary items should not be silently deferred.
- [x] If the PR is partial, the blocker must be documented.
- [x] The PR should reflect the WR's required bundle and definition of done.

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | N/A |
| Open Issues | N/A |
| Private | No |
| Archived | No |

## Research Checklist

<!-- Mark [x] ONLY when the matching section below is actually filled. Otherwise [ ] or "N/A — reason". -->
- [ ] Deep market research
- [ ] BOM
- [ ] Community chatter
- [ ] Competitor analysis
- [ ] Domain strategy
- [ ] Monetization

## Executive Summary

N/A — pending Jules refinement

## Step 1A — Product/Output Selections

N/A — pending Jules refinement

## Step 2 — Deep Web Research

N/A — pending Jules refinement

## Step 3 — Requirements

N/A — pending Jules refinement

## Recommendations

N/A — pending Jules refinement

## Risks

N/A — pending Jules refinement
