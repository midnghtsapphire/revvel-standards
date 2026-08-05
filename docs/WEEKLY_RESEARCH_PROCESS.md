# Weekly Research (WR) Process

**Version:** 1.1.0  
**Status:** Active  
**Owner:** @midnghtsapphire  
**Last Updated:** May 17, 2026

---

## Core Principle: Instruction Resilience

> **User instructions are research starting points, NOT firm rules.**

Instructions, issue titles, and descriptions may contain errors, imprecise language, or incomplete context. The research engine and all agents MUST:

1. **Never fail because an instruction is wrong.** Research the intent behind the instruction and pursue it.
2. **Validate before acting.** Cross-reference instructions against current facts, documentation, and external sources.
3. **Self-correct silently.** If an instruction is incorrect or contradictory, find the correct interpretation and proceed — document the correction in the findings.
4. **Assume good intent.** When language is imprecise, infer the most productive interpretation and execute it.

Agents that halt or error-out because of a bad instruction violate the Driven Autonomy mandate. Research your way through it.

---

## Overview

Weekly Research (WR) tasks are deep-dive investigations that require comprehensive analysis across multiple repositories, documentation sources, and external resources. WR issues receive automated routing to specialized research agents and enhanced coordination through the OpenRouter orchestrator.

---

## Identifying WR Issues

### Automatic Detection

Issues are automatically identified as WR tasks if they:

1. **Title starts with `[WR]` prefix**
   - Example: `[WR] EVAluate if you think it works implement`
   - Example: `[WR] Research migration path from Lodash to native ES methods`

2. **Have the `weekly-research` label applied**
   - Manually applied or auto-detected from title

3. **Have the `deep-research` label applied**
   - Escalated from standard triage to deep research

### Manual Triggering

You can manually trigger WR processing for any issue:

```bash
# Via GitHub CLI
gh workflow run weekly-research.yml -f issue_number=123

# Via GitHub Actions UI
# Actions → Weekly Research (WR) Automation → Run workflow → Enter issue number
```

---

## Automation Flow

### Step 1: Detection & Labeling

**Workflow:** `.github/workflows/weekly-research.yml`  
**Trigger:** Issue opened/reopened with [WR] prefix

**Actions:**
1. Detect [WR] prefix in title
2. Apply labels:
   - `weekly-research`
   - `wr:in-progress`
   - `deep-research`
   - `openrouter`
   - `role:orchestrator`
   - `jules` (triggers Jules deep research)
3. Post welcome comment with research checklist

### Step 2: Deep Research by Jules

**Workflow:** `jules-invoke.yml` (automatically triggered by `jules` label)

**Actions:**
1. Jules analyzes issue scope and requirements
2. Performs comprehensive research across:
   - Repository documentation (AGENTS.md, skills/, standards/)
   - Cross-repository patterns
   - External sources (docs, tools, recent releases)
   - Security and compliance requirements
3. Posts research findings as issue comment
4. Includes structured recommendations and next steps

### Step 3: Triage & Additional Routing

**Workflow:** `openrouter-triage.yml` (automatically triggered)

**Actions:**
1. OpenRouter analyzes issue scope
2. Suggests additional labels (e.g., `codex`, `49agents`)
3. Recommends research approach
4. Posts triage comment with classification

### Step 4: Progress Tracking

**Automated progress tracker comment includes:**

- Research phases checklist
- Agent assignment status
- Findings summary (updated in real-time)
- Completion estimate

### Step 5: Parallel Research (Optional)

**Multiple paths depending on configuration:**

#### Path A: OpenRouter Sequential Research (Default)

- Single orchestrator agent coordinates research
- Subtasks executed sequentially
- Findings documented in issue comments
- **Duration:** 2-4 hours

#### Path B: 49Agents Parallel Research (If Configured)

- Multiple research agents (scout-1, scout-2, scout-3) work in parallel
- Visual coordination via 49Agents canvas
- Findings consolidated by dedicated agent
- **Duration:** 30-60 minutes

### Step 5: Completion & PR Creation

**When research is complete:**

1. Final findings posted to issue
2. Label changes:
   - Add `wr:complete`
3. **Automatic PR creation triggered** (`.github/workflows/wr-pr-creation.yml`):
   - Creates a new branch `wr/issue-{number}-{title}`
   - Generates WR document from template with research findings
   - Opens PR with refined content
   - Applies `jules`, `weekly-research`, `documentation` labels
4. **Jules rewrite phase**:
   - Jules is automatically invoked to review and rewrite the WR
   - Refines research findings for clarity and actionability
   - Ensures recommendations are specific and implementable
   - Updates status to ✅ Complete when done
5. Label changes after PR creation:
   - Add `in-review` to issue
   - Keep `wr:in-progress` on PR until Jules completes refinement
6. **Final merge**:
   - Once Jules completes rewrite and PR is approved
   - PR is merged to main
   - Issue is automatically closed
   - `wr:complete` label applied to both issue and PR

---

## Research Checklist

Every WR task follows this standard checklist:

> **Fleet Instruction:** User WR content is a *starting point*, not the final word. Self-correct against live data. Never follow user WR text verbatim — validate every claim, price, and API choice. The user has ADHD and produces rapid brain-dump instructions; treat them as directional signals, not firm requirements.
- [ ] **Validate instructions before acting**
  - [ ] Cross-check issue title/body against actual repo state
  - [ ] Identify and silently correct any errors in the instruction
  - [ ] If the WR says to copy, fork, refresh, or rebuild an existing repo, inspect that repo first and identify the strongest proven asset it already contains
  - [ ] Choose the highest-value product wedge that the referenced repo can credibly support; avoid spending weekly research effort criticizing sparse prompt detail when the repo itself provides the direction
  - [ ] Document assumed corrections in findings

- [ ] **Review repository documentation**
  - [ ] `AGENTS.md` — Agent rules and protocols
  - [ ] `skills/` — Relevant skills in the vault
  - [ ] `standards/` — Applicable standards
  - [ ] `templates/` — Reusable templates
  - [ ] `.github/` — Workflow automation

- [ ] **Cross-reference other repositories**
  - [ ] Check consistency across midnghtsapphire org
  - [ ] Identify patterns and best practices
  - [ ] Note any conflicts or discrepancies

- [ ] **Review skills vault**
  - [ ] `skills/REGISTRY.md` — Available skills
  - [ ] Load relevant skills for context
  - [ ] Check for related skills to reuse

- [ ] **Check repo-wide rules**
  - [ ] `recurse-rules.md` — Code quality rules
  - [ ] `docs/AGENTS.md` — Agent operating principles

- [ ] **Deep Market Research** ← REQUIRED for EVERY WR (including bug fixes, chores, minor features)
  - [ ] Top keywords with search volumes + CPCs for this domain
  - [ ] How the industry/market currently works (mechanics, pricing, conversion rates)
  - [ ] Why some solutions cost more than others (value driver analysis)
  - [ ] Community chatter — Reddit, TrustPilot, forums: top complaints about existing solutions
  - [ ] Domain name strategy — high-value patterns, TLD recommendations
  - [ ] Marketing best practices in this niche — what's working now + how our approach improves it
  - [ ] Monetization model — specific pricing, channels, subscription vs. one-time

- [ ] **BOM (Bill of Materials)** ← REQUIRED for EVERY WR
  - [ ] List every API, CLI, MCP, GitHub App, or service needed
  - [ ] Rank each option: which is best, what it costs, why it beats alternatives
  - [ ] Property/data APIs compared (if applicable)
  - [ ] Compliance APIs compared (TCPA, DNC, verification — if applicable)
  - [ ] Delivery/storefront options compared (if applicable)
  - [ ] Compute BOM cost summary with ROI break-even check

- [ ] **Research external developments**
  - [ ] New tools and extensions released today
  - [ ] Upstream project updates
  - [ ] Model releases (OpenRouter, Anthropic, OpenAI, Google)
  - [ ] Security advisories

- [ ] **Cross-validate sources**
  - [ ] Consider non-US sources (Gitee, GitLab, Bitbucket)
  - [ ] Check multiple perspectives
  - [ ] Avoid vendor bias

- [ ] **Prime Directive compliance**
  - [ ] Ensure recommendations result in working, tested code
  - [ ] Not just plans or proposals
  - [ ] Actionable implementation steps

- [ ] **Marketing, SEO & competitive signals** *(required for every WR)*
  - [ ] Identify 3–5 primary SEO keywords relevant to the topic
  - [ ] Identify 3–5 long-tail keywords
  - [ ] Check GitHub stars for any tools/repos referenced (competitive traction)
  - [ ] Document at least one monetization path (Gumroad, Polar.sh, affiliate, SaaS)
  - [ ] Assess distribution channel (organic search, social, community, API)
  - [ ] Verify all market claims with factual citations — no hallucinated stats

- [ ] **Product / Output Selections** *(required for every WR/PR)*
  - [ ] Explicitly select which artifact shapes are in scope: website/app UI, API, CLI, MCP, skill, PDF, PowerPoint/deck, video/demo/training/YouTube, docs, and agent automation
  - [ ] For any selected video output, state the intended format and target length
  - [ ] For any enhanced feature or new requirement that should apply globally, update both the current WR and revvel-standards so future WRs inherit it

- [ ] **Platform defaults & website requirements** *(required when a website/app surface is in scope)*
  - [ ] Website in Test must name the Vercel URL or explicitly mark the gap
  - [ ] Backend/integration/runtime defaults must use DigitalOcean unless the WR documents a reviewed exception
  - [ ] Customer-facing websites must document admin access plus user login requirements, including Apple, Google, and GitHub sign-in when auth is in scope

- [ ] **Artifact Engine Map** *(required for every WR/PR)*
  - [ ] End with a map for every required output shape: website/app UI, API, CLI, MCP, skill, PDF, PowerPoint/deck, video, docs, and agent automation
  - [ ] For each shape, point to the existing engine/workflow/standard that produces it or explicitly mark the gap that must be implemented
  - [ ] Reuse existing repo engines where available (for example delivery matrix, PDF routing, UI creation, video standards, orchestration/MCP contracts) instead of inventing duplicate systems

- [ ] **Agent Self-Healing Journal** *(required at the end of every WR/PR)*
  - [ ] Record what was wrong, what the agent researched, what it corrected, and what should now be institutionalized in revvel-standards
  - [ ] Convert useful self-healing outcomes into a standard, workflow, template, or checklist update when the learning is durable
  - [ ] Preserve required credential, security, and compliance gates unless a reviewed standard explicitly replaces them

---

## Research Findings Format

### Structure

```markdown
## Research Findings: [WR Topic]

**Research Date:** YYYY-MM-DD  
**Researcher(s):** [Agent names]  
**Issue:** #[number]

---

### Executive Summary

[2-3 sentence summary of key findings and recommendation]

---

### Detailed Findings

#### 1. [Finding Category 1]

**What we found:**
[Description]

**Evidence:**
- [Link/reference 1]
- [Link/reference 2]

**Assessment:**
[Analysis]

#### 2. [Finding Category 2]

[Repeat structure]

---

### Recommendations

#### Immediate Actions (P0)

1. [Action 1]
   - **Why:** [Rationale]
   - **How:** [Implementation steps]
   - **Effort:** [Hours/days estimate]

2. [Action 2]

#### Short-Term Actions (P1)

[Within 1-2 weeks]

#### Long-Term Actions (P2)

[Within 1-2 months]

---

### Risks & Considerations

| Risk | Severity | Mitigation |
|------|----------|------------|
| [Risk 1] | High/Med/Low | [How to mitigate] |

---

### Alternatives Considered

1. **[Alternative 1]**
   - Pros: [...]
   - Cons: [...]
   - Decision: [Accepted/Rejected because...]

---

### Next Steps

1. [ ] [Action item 1]
2. [ ] [Action item 2]
3. [ ] [Action item 3]

---

### Product / Output Selections

| Output shape | In scope? | Format / length | Primary engine / standard | Notes |
| --- | --- | --- | --- | --- |
| Website / app UI | [yes/no] | [site/app] | [workflow/script/standard] | [notes] |
| API | [yes/no] | [REST/GraphQL/etc.] | [workflow/script/standard] | [notes] |
| CLI | [yes/no] | [binary/package] | [workflow/script/standard] | [notes] |
| MCP | [yes/no] | [server/router/tool manifest] | [workflow/script/standard] | [notes] |
| Skill | [yes/no] | [skill type] | [workflow/script/standard] | [notes] |
| PDF | [yes/no] | [report/guide/etc.] | [workflow/script/standard] | [notes] |
| PowerPoint / deck | [yes/no] | [sales/training/review deck] | [workflow/script/standard] | [notes] |
| Video | [yes/no] | [demo/training/review/YouTube + target length] | [workflow/script/standard] | [notes] |
| Docs | [yes/no] | [site/spec/readme] | [workflow/script/standard] | [notes] |
| Agent automation | [yes/no] | [workflow/agent/service] | [workflow/script/standard] | [notes] |

---

### Platform Defaults & Website Requirements

- **Website in Test:** [Vercel URL or documented gap]
- **Integration runtime:** [DigitalOcean by default / documented exception]
- **Admin surface:** [required / not required / gap]
- **User auth:** [Apple / Google / GitHub / other / not required]

### Artifact Engine Map

| Artifact Shape | Existing engine / standard | Status | Required action |
| --- | --- | --- | --- |
| Website / UI | [workflow/script/standard] | [exists/gap] | [action] |
| API | [workflow/script/standard] | [exists/gap] | [action] |
| CLI | [workflow/script/standard] | [exists/gap] | [action] |
| MCP | [workflow/script/standard] | [exists/gap] | [action] |
| Skill | [workflow/script/standard] | [exists/gap] | [action] |
| PDF | [workflow/script/standard] | [exists/gap] | [action] |
| PowerPoint / deck | [workflow/script/standard] | [exists/gap] | [action] |
| Video | [workflow/script/standard] | [exists/gap] | [action] |
| Docs | [workflow/script/standard] | [exists/gap] | [action] |
| Agent automation | [workflow/script/standard] | [exists/gap] | [action] |

---

### Agent Self-Healing Journal

- **Issue detected:** [what was missing or wrong]
- **Research / correction:** [what the agent verified and changed]
- **Revvel-standards change:** [what standard/template/workflow/checklist was updated]
- **Outcome to preserve:** [durable learning for future WR/PR work]

---

### References

- [Link 1]: [Description]
- [Link 2]: [Description]

---

**Research Status:** ✅ Complete  
**Implementation Priority:** P0/P1/P2  
**Approval Required:** @midnghtsapphire
```

---

## Agent Assignment

### OpenRouter Orchestrator (Primary)

**Model:** Claude Sonnet 4  
**Role:** Coordinates overall research effort  
**Responsibilities:**
- Task decomposition
- Sub-agent coordination
- Findings consolidation
- Final report generation

### Jules (Google) — Optional

**Model:** Gemini 2.5 Pro  
**Role:** Deep research and authoring  
**Trigger:** Add `jules` label  
**Responsibilities:**
- Comprehensive web research
- Multi-source synthesis
- Long-form documentation

### Codex — Optional

**Model:** GPT-5.2-Codex (via OpenRouter)  
**Role:** Code analysis and implementation  
**Trigger:** Add `codex` label  
**Responsibilities:**
- Code review
- Implementation prototypes
- Technical feasibility assessment

### 49Agents Scouts — Optional

**Models:** Claude Sonnet 4 (x3)  
**Role:** Parallel investigation  
**Trigger:** `AGENT_HQ_TOKEN` configured  
**Responsibilities:**
- Parallel research streams
- Independent subtask execution
- Real-time findings sharing

---

## Integration with 49Agents

### Visual Research Dashboard

When AGENT_HQ_TOKEN is configured, WR issues automatically trigger a 49Agents canvas:

**Canvas Layout:**
- **Orchestrator pane** — Coordinates research
- **Scout-1 pane** — Repository review
- **Scout-2 pane** — Cross-repo analysis
- **Scout-3 pane** — External research
- **Consolidator pane** — Report generation
- **Monitor pane** — Progress tracking

**Real-time Updates:**
- Agent status indicators
- Live terminal output
- Shared findings notes
- GitHub sync every 5 minutes

See `skills/49agents/SKILL.md` for setup instructions.

---

## Examples

### Example 1: Tool Evaluation WR

**Issue:** `[WR] Evaluate 49Agents for integration`

**Research performed:**
1. ✅ Reviewed 49Agents documentation
2. ✅ Compared with current automation
3. ✅ Identified integration opportunities
4. ✅ Assessed risks and costs
5. ✅ Provided implementation roadmap

**Outcome:** `docs/49AGENTS_EVALUATION.md` created with detailed analysis

### Example 2: Standards Migration WR

**Issue:** `[WR] Research migration from Lodash to native ES`

**Research performed:**
1. ✅ Audited Lodash usage across repos
2. ✅ Identified native ES equivalents
3. ✅ Performance comparison
4. ✅ Migration script development
5. ✅ Testing strategy

**Outcome:** Migration guide + automated refactoring script

---

## Metrics

### Research Effectiveness

- **Average WR duration:** 2-4 hours (sequential) / 30-60 min (parallel)
- **Findings quality:** Measured by implementation success rate
- **Automation coverage:** % of WR tasks completing without human intervention
- **Time to completion:** From issue open to `wr:complete` label

### Success Criteria

A WR task is successful if:

1. ✅ All checklist items completed
2. ✅ Findings documented in standard format
3. ✅ Recommendations are actionable
4. ✅ Implementation plan provided
5. ✅ Risks identified and mitigated
6. ✅ `wr:complete` label applied
7. ✅ Stakeholder approval obtained

---

## Troubleshooting

### WR Issue Not Auto-Detected

**Problem:** Issue with [WR] prefix didn't trigger automation

**Solutions:**
1. Check workflow run logs: `gh run list --workflow=weekly-research.yml`
2. Manually trigger: `gh workflow run weekly-research.yml -f issue_number=XXX`
3. Verify workflow file is syntactically correct
4. Check if `no-triage` label is applied (blocks automation)

### OpenRouter Triage Failed

**Problem:** Triage step failed with error

**Solutions:**
1. Check `OPENROUTER_API_KEY` is configured
2. Verify OpenRouter API status: <https://openrouter.ai/status>
3. Review triage script logs in workflow run
4. Check for API rate limiting

### 49Agents Integration Not Working

**Problem:** Parallel research didn't trigger

**Solutions:**
1. Check `AGENT_HQ_TOKEN` is configured
2. Verify 49Agents instance is running
3. Test webhook endpoint: `curl https://agent-hq.revvel.co/api/health`
4. Review webhook payload in workflow logs

---

## Best Practices

### For Issue Authors

1. **Use [WR] prefix** for automatic routing
2. **Provide clear scope** in issue description
3. **Include acceptance criteria** for research completion
4. **Link relevant context** (prior art, related issues)
5. **Set priority** if time-sensitive

### For Researchers

1. **Follow the checklist** systematically
2. **Document as you go** (don't wait until the end)
3. **Cite sources** for all findings
4. **Be objective** (present alternatives fairly)
5. **Ship working code** (not just recommendations)

### For Reviewers

1. **Check evidence quality** (are sources credible?)
2. **Verify completeness** (all checklist items done?)
3. **Assess feasibility** (can recommendations be implemented?)
4. **Review risks** (are they adequately mitigated?)
5. **Approve or request changes** within 24 hours

---

## Related Documentation

- **49Agents Evaluation:** `docs/49AGENTS_EVALUATION.md`
- **Automation Audit:** `docs/AUTOMATION_AUDIT.md`
- **OpenRouter Swarms:** `skills/openrouter-swarms/SKILL.md`
- **49Agents Integration:** `skills/49agents/SKILL.md`
- **Agent Factory Standard:** `docs/Master_Inventory/AGENT_FACTORY_STANDARD.md`

---

## Changelog

### 2026-05-17 — v1.1.0
- Added **Instruction Resilience** core principle (instructions are research seeds, not firm rules)
- Added instruction-validation step to Research Checklist
- Added mandatory Marketing, SEO & competitive signals to Research Checklist (keywords, stars, monetization, citations)
- Updated `buildSystemPrompt` in `scripts/openrouter-triage.js` to enforce instruction resilience and marketing/SEO mandate
- Version bump 1.0.0 → 1.1.0

### 2026-04-30 — v1.0.0
- Initial WR process documentation
- Created `.github/workflows/weekly-research.yml`
- Added `weekly-research`, `wr:in-progress`, `wr:complete` labels
- Integrated with 49Agents parallel research
- Defined standard research checklist and findings format
