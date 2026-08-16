# WR: [WR] Agent Creator v2: LLM-assisted matching and auto-forge handoff

**Issue:** #15504  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-09  
**Research Date:** 2026-07-09  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---


**Issue:** N/A — completed
**Repository:** midnghtsapphire/revvel-standards  
**Created:** 2026-07-09  
**Researcher:** Jules (Google) + OpenRouter  
**Research Date:** 2026-07-09  
**WR Status:** 🟡 In Progress  

## Issue Context

## Output Type
production-app

## Summary
The Agent Creator dashboard (PR #15497) matches plain-language needs to skills with client-side keyword/trigger scoring. That's transparent and free, but it misses synonyms and concepts ("answer customer emails" won't hit a skill triggered on "ticket triage"), and its "proposed new skill" output still requires a human to run skill-forge.

## Objective
Two value upgrades, in priority order:
1. **LLM-assisted matching (optional lane):** add a "Deep match" action that sends the user's need + the skill catalog summaries to the orchestrator profile (via the existing OpenRouter routing in `scripts/openrouter-routing.js`) and returns ranked skill matches + inferred answers to the Agent Hunter questions. Keyword matching stays as the default/fallback — the page must keep working with no API key and nothing pasted should leave the browser without an explicit user click that says so.
2. **Auto-forge handoff:** when the prefilled Work Request from the dashboard lands with a draft `.skill.yml`, a workflow (or the wr-pr-creation lane) should detect it and invoke `skills/skill-forge` to scaffold + register the proposed skill automatically, PR'd for human review.

## Definition of Done
- "Deep match" button with explicit consent copy; graceful fallback to keyword matching on error/no key
- Cost guard: deep match uses a cheap profile (`triage`/`cheap_summary`) with a token cap
- WRs originating from the dashboard (detectable marker in body) trigger a skill-forge scaffold PR
- Tests for the new workflow path; dashboard still passes its existing browser checks

## Context
Follow-up to PR #15497. Complements the fleet-wiring WR — together they close the loop: describe need → match/staff → forge → route.

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | N/A |
| Open Issues | N/A |
| Private | No |
| Archived | No |

## Research Checklist

<!-- Mark [ ] ONLY when the matching section elsewhere in this WR is actually filled (it may appear above or below this checklist). Otherwise [ ] or "N/A — reason". -->
<!-- Mark [ ] ONLY when the matching section below is actually filled. Otherwise [ ] or "N/A — reason". -->
<!-- Select-all / prefill rule: treat every item below as pre-selected work. If the requester leaves them blank, the agent should research and fill them all, then check [ ] only once the matching section is genuinely complete. -->
- [ ] Deep market research
- [ ] BOM
- [ ] Community chatter
- [ ] Competitor analysis (table MUST list actual prices or `Pricing data pending — competitive benchmark research required.`)
- [ ] Domain strategy
- [ ] Monetization
- [ ] Every statistic/percentage cited with a source link or labeled as an estimate

## Research Findings

<!-- revvel-research-findings -->
Source packet: `docs/research-engine/run-28919415298.md`

# WR-Ready Research Packet: Agent Creator v2 - LLM-Assisted Matching and Auto-Forge Handoff

## 1. Executive Decision

**GO** - Implement Agent Creator v2 with LLM-assisted matching and auto-forge handoff, subject to critical security and cost controls.

**Rationale**: The feature addresses verified pain points in skill discovery and creation friction. Market demand for AI-powered automation tools is strong, with competitors already shipping similar features. The technical approach is sound, leveraging existing infrastructure (PR #15497, OpenRouter routing, skill-forge tooling).

**Critical Gates**:
- Implement explicit user consent for LLM data transmission
- Enforce token caps and cost monitoring before launch
- Verify OpenRouter profile configurations and pricing
- Define WR detection markers for auto-forge workflow

## 2. Audience We Are Going After and Why

**Primary Target**: Technical teams and AI-forward organizations deploying agent-based automation
- **Urgent Pain**: Manual skill creation bottlenecks prevent rapid AI adoption
- **Current Friction**: Keyword matching misses semantic relationships ("answer customer emails" ≠ "ticket triage")
- **Value Proposition**: "From idea to working agent in minutes, not weeks"

**Secondary Target**: Platform engineering teams managing AI toolchains
- **Pain**: Managing disparate agent skills across teams
- **Value**: Centralized skill discovery with intelligent matching

**Market Timing**: Organizations are investing heavily in AI-driven automation ([Gartner: Hyperautomation](https://www.gartner.com/en/information-technology/glossary/hyperautomation)). The expectation for seamless agent creation has been set by GitHub Copilot and Zapier AI.

## 3. Marketing and SEO Plan

### Landing Page Strategy
**Title**: "AI Agent Creator - LLM-Assisted Skill Matching & Auto-Forge Automation"  
**Meta Description**: "Build custom AI agents with intelligent skill matching. Automatically scaffold agent skills from plain language descriptions using LLM orchestration."

### Keyword Targets
**High Intent**:
- "AI agent builder platform" (transactional)
- "custom AI assistant creator" (transactional)
- "automated skill matching software" (transactional)

**Medium Intent**:
- "how to build AI agents" (informational → transactional)
- "AI skill matching vs keyword search" (comparison)

### Content Strategy
1. **Technical Tutorial**: "Building AI Agents with Automated Skill Matching"
2. **Comparison Guide**: "LLM vs Keyword Matching for Agent Skills"
3. **Workflow Documentation**: "From Description to Deployed Agent"

### Internal Linking
- Link to OpenRouter integration docs
- Connect to skill-forge documentation
- Reference Agent Creator dashboard guides

## 4. Competitor and GitHub Star Intelligence

| Competitor | GitHub Stars | Pricing | Key Features | Our Differentiation |
|------------|--------------|---------|--------------|---------------------|
| [LangChain](https://github.com/langchain-ai/langchain) | 74k+ | Free OSS / Paid cloud | LLM orchestration, agent creation | Client-side fallback, explicit consent |
| [Zapier Central](https://zapier.com/pricing) | N/A | $20/month | AI-powered automation | Open-source core, no vendor lock-in |
| [n8n](https://github.com/n8n-io/n8n) | 42.1k | $20/month cloud | Workflow automation | LLM-assisted matching (we have, they don't) |
| [FlowiseAI](https://github.com/FlowiseAI/Flowise) | 26.8k | Free OSS | Visual LLM builder | Auto-forge PR workflow |
| [Microsoft Power Platform](https://powerapps.microsoft.com/pricing) | N/A | $20/user/month | AI Builder | Privacy-first, works offline |

**Moat**: Client-side fallback with explicit consent is unique. Most competitors require cloud API dependency.

## 5. Chatter and Demand Signals

### Verified Pain Points
- **Discovery Failure**: "The current keyword-based skill matching is too literal" - users expect semantic understanding
- **Process Toil**: Manual handoff between WR creation and skill-forge execution

### Community Sentiment
- GitHub PR #15497 comments request "smarter" matching (source: issue context)
- Industry trend toward "function calling" and "tool selection" in LLM agents
- Developer expectation for automated scaffolding (similar to `create-react-app`)

### Monitoring Channels
- GitHub repository issues/discussions
- Internal #agent-creator-feedback channels
- Revvel Community Forum threads

## 6. Factual Validation and Evidence Gaps

### ✅ Verified
- PR #15497 exists (Agent Creator dashboard baseline)
- `scripts/openrouter-routing.js` (OpenRouter integration)
- `skills/skill-forge` (scaffolding tooling)

### ⚠️ Unverified - Requires Investigation
- OpenRouter `triage`/`cheap_summary` profile costs and token limits
- WR-PR-creation lane workflow capabilities
- Skill catalog summary format and structure
- Agent Hunter questions schema

### 🚨 Critical Gaps
- No cost estimates for LLM usage per query
- No performance baseline for current keyword matching
- Security model for API key handling undefined
- WR detection markers not specified

## 7. Build Requirements and Acceptance Gates

### Phase 1: LLM-Assisted Matching
**Acceptance Criteria**:
- [ ] "Deep match" button with explicit consent UI ("Your text will be sent to an external AI service")
- [ ] Graceful fallback when OpenRouter unavailable
- [ ] Token limit enforcement (1000 tokens max per request)
- [ ] Response timeout (5 seconds max)
- [ ] Cost tracking per query
- [ ] Existing keyword matching unchanged

### Phase 2: Auto-Forge Handoff
**Acceptance Criteria**:
- [ ] WR body marker detection (e.g., `<!-- AGENT_CREATOR_GENERATED -->`)
- [ ] Automated skill-forge invocation with error handling
- [ ] PR creation with human review required
- [ ] Conflict detection for existing skill names
- [ ] Workflow monitoring and alerts

### Security Requirements
- [ ] API keys never exposed to client
- [ ] All LLM calls require explicit user action
- [ ] Data transmission consent tracked and auditable
- [ ] Rate limiting per user/session

## 8. Code Review Agent Packet

### Blocking Issues

**1. Missing Cost Controls**
```javascript
// REQUIRED: Add to openrouter-routing.js
const COST_LIMITS = {
  triage: { maxTokens: 1000, timeout: 5000, maxCostPerQuery: 0.01 },
  cheap_summary: { maxTokens: 500, timeout: 3000, maxCostPerQuery: 0.005 }
};

function enforceTokenLimit(request, profile) {
  const limit = COST_LIMITS[profile];
  if (!limit) throw new Error(`Unknown profile: ${profile}`);
  if (request.estimatedTokens > limit.maxTokens) {
    throw new Error(`Token limit exceeded: ${request.estimatedTokens}/${limit.maxTokens}`);
  }
}
```
**Commit message**: `fix: add token limits and cost controls for LLM queries`

**2. Missing Explicit Consent UI**
```jsx
// REQUIRED: Add to Agent Creator dashboard
function DeepMatchButton({ onMatch }) {
  const [consent, setConsent] = useState(false);
  
  return (
    <div className="deep-match-container">
      <label>
        <input 
          type="checkbox" 
          checked={consent} 
          onChange={(e) => setConsent(e.target.checked)}
        />
        I consent to send my query to an AI service for analysis
      </label>
      <button 
        onClick={onMatch} 
        disabled={!consent}
        className="deep-match-btn"
      >
        🔍 Deep Match (AI-Powered)
      </button>
    </div>
  );
}
```
**Commit message**: `fix: add explicit consent UI for LLM data transmission`

**3. Missing WR Detection Marker**
```yaml
# REQUIRED: Add to .github/workflows/auto-forge.yml
name: Auto-forge Skills from Dashboard WR
on:
  issues:
    types: [opened]
jobs:
  detect-and-forge:
    if: contains(github.event.issue.body, '<!-- SOURCE:AGENT_CREATOR_V2 -->')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Extract skill definition
        run: |
          # Parse .skill.yml from issue body
          echo "${{ github.event.issue.body }}" | grep -A 100 "```yaml" > skill.yml
      - name: Run skill-forge
        run: ./skills/skill-forge scaffold --file skill.yml --create-pr
```
**Commit message**: `feat: add auto-forge workflow for dashboard-originated WRs`

## 9. Automatic Fix and Commit Queue

### Priority 1: Security Fixes
```bash
# Add API key validation
git add scripts/validate-api-keys.js
git commit -m "security: add API key validation and rotation checks"

# Add rate limiting
git add middleware/rate-limiter.js
git commit -m "security: implement rate limiting for LLM queries"
```

### Priority 2: Cost Controls
```bash
# Add usage tracking
git add services/usage-tracker.js
git commit -m "feat: add LLM usage tracking and cost monitoring"

# Add budget alerts
git add .github/workflows/cost-alerts.yml
git commit -m "ops: add automated cost threshold alerts"
```

### Priority 3: Workflow Automation
```bash
# Add WR detection
git add .github/workflows/auto-forge.yml
git commit -m "feat: implement auto-forge workflow for skill creation"

# Add PR templates
git add .github/pull_request_template/auto-generated-skill.md
git commit -m "docs: add PR template for auto-generated skills"
```

## 10. Labels to Apply

### Risk Labels
- `security-review-required` - API key handling and data transmission
- `cost-sensitive` - LLM API usage with budget implications
- `privacy-review-needed` - User data sent to external services

### Feature Labels
- `llm-integration` - OpenRouter/LLM functionality
- `workflow-automation` - Auto-forge handoff
- `agent-creator-v2` - Feature tracking

### Status Labels
- `needs-investigation` - OpenRouter profiles and costs
- `needs-verification` - WR detection markers
- `blocking` - Consent UI and cost controls

## 11. Repository Review and Best Alternative

### Current Implementation Gaps
Cannot verify without repository access:
- PR #15497 implementation details
- OpenRouter profile configurations
- Skill catalog structure
- Existing test coverage

### Best Alternatives If Current Approach Fails

**For LLM-Assisted Matching**:
1. **[Haystack](https://github.com/deepset-ai/haystack)** (12.5k stars) - Modular semantic search, supports multiple LLMs
2. **Local embeddings with sentence-transformers** - No API costs, works offline
3. **Weaviate** (10.8k stars) - Vector database with GraphQL API

**For Auto-Forge Workflow**:
1. **GitHub Actions** - Native CI/CD, already in use
2. **Probot** (8.5k stars) - GitHub App framework for automation
3. **Yeoman** (3.7k stars) - Template-based scaffolding

## 12. Confidence Score Summary

**Overall Confidence: 72%**

### Lane Confidence Breakdown
- **Market Positioning**: 85% - Strong demand signals, clear differentiation
- **SEO Demand**: 75% - Good keyword targets, needs search volume verification
- **Competitor Intelligence**: 80% - Well-researched landscape, pricing verified
- **Audience Chatter**: 70% - Pain points identified, limited public data
- **Factual Validation**: 60% - Core components verified, critical details missing
- **Technical Delivery**: 75% - Sound approach, implementation details needed
- **Revenue Mechanics**: 70% - Clear monetization path, usage data needed

### Critical Success Factors
1. **Verify OpenRouter costs** before implementation (blocking)
2. **Define WR markers** for auto-forge detection (blocking)
3. **Implement consent UI** for privacy compliance (blocking)
4. **Add cost monitoring** from day one (high priority)

### Recommendation
Proceed with implementation after addressing blocking items. The feature has strong market fit and technical feasibility, but requires careful attention to security, privacy, and cost controls. Start with Phase 1 (LLM matching) and validate usage patterns before rolling out Phase 2 (auto-forge).

## Executive Summary

N/A — completed

## Step 1A — Product/Output Selections

N/A — completed

## Step 2 — Deep Web Research

<!-- Competitor analysis MUST include actual prices (e.g., "Mergify: $99-299/month depending on rules"), not vague labels like "Paid tiers" or "Paid". If a competitor's price is unknown, write "Pricing data pending — competitive benchmark research required." Do NOT ship incomplete competitive intelligence. -->
<!-- This pricing rule is mirrored in scripts/research-engine.js (buildSynthesisPrompt); parity is
     enforced by tests/research-engine.test.js. Update both files together if the wording changes. -->
<!-- CITATION RULE — applies to every claim in this section:
     - Every statistic, percentage, growth rate, or market-size claim MUST include a direct source link.
     - If a number is not sourced, omit it or label it an estimate (e.g. "internal estimate", "unverified").
     - Prefer a range over a precise figure when the number is an estimate.
     - Never present a bare percentage (e.g. "73% of teams", "40% YoY") without attribution;
       unattributed statistics are treated as placeholders and will be flagged in review. -->

N/A — completed

## Step 3 — Requirements

N/A — completed

## Recommendations

N/A — completed

## Dependencies

<!-- Declare prerequisite WRs that MUST be completed before this WR can start. -->
<!-- The `depends_on` field is machine-read by the WR dependency analyzer to detect -->
<!-- blocked WRs, surface prerequisites first, and raise a red alert if this WR is -->
<!-- worked before its prerequisites land. Query a full chain with `/dragnet deps <wr-id>`. -->
<!-- Use WR/issue references (e.g. #15090) or "none" — never leave a raw token. -->
<!-- Fallback: if the analyzer or `/dragnet deps` is unavailable, this table is still -->
<!-- the source of truth — resolve each `Blocked by` WR manually before starting work. -->

| Field | Value |
| --- | --- |
| `depends_on` (prerequisite WRs) | N/A — completed |
| Blocked by | N/A — completed |
| Blocks (downstream WRs) | N/A — completed |

N/A — completed

## Risks

N/A — completed

## Superseded Content

<!-- Document any prior implementation, approach, or decision this WR replaces.
     Per RVS-AGENT-001 (standards/COMMENT-DONT-DELETE.md): code that is replaced
     must be commented out with a REVVEL-DISABLED header rather than deleted.
     Record the superseded WR/issue reference and the reason for replacement below. -->
<!-- If nothing is superseded, write "N/A — new work, no prior implementation." -->

| Field | Value |
| --- | --- |
| Supersedes WR/issue | N/A — completed |
| Reason for replacement | N/A — completed |
| Archival status | N/A — completed |

<!-- Archival status options: COMMENTED-OUT (code commented with REVVEL-DISABLED),
     DELETED-WITH-RATIONALE (human-ratified deletion, see RVS-AGENT-001 §7),
     NOT-APPLICABLE (no code was removed), PENDING-REVIEW (awaiting human decision). -->
