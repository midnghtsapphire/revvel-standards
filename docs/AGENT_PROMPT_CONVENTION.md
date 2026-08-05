# Agent Prompt Convention

**Version:** 1.0.0  
**Status:** Planned (Documentation Complete, Workflows Pending)  
**Repository:** midnghtsapphire/revvel-standards

---

## ⚠️ Implementation Status

**Current State:** This convention is **documented but not yet automated**. The tag system and routing logic are defined, but the automatic detection workflow (Phase 2) has not been implemented yet.

**What Works Today:**
- Manual agent invocation via GitHub labels
- Existing workflows (`openrouter-triage.yml`, `bito-ai.yml`, `jules-invoke.yml`)
- Tag syntax can be used in code comments for future automation

**What's Planned:**
- Phase 2: Automatic prompt detection workflow
- Phase 3: GOAP agent deployment
- Phase 4: Full tag-based routing

---

## Purpose

This document defines the standard convention for leaving prompts/instructions for AI agents in code, issues, PRs, and documentation. When the automation workflows are implemented (Phase 2), tagged comments will be automatically detected and routed to the appropriate agent for execution.

---

## Tag Syntax

### Basic Format

```text
// TODO @agent: <description of task>
// FIXME @agent: <description of problem to fix>
// NOTE @agent: <information or context>
```

### Tag Options

| Tag | Agent | Purpose | Auto-Executes |
|-----|-------|---------|---------------|
| `@agent` | OpenRouter (auto-routed) | General AI task — system decides best agent | 🔜 Planned (Phase 2) |
| `@bito` | Bito AI | Code review, security scan, tech debt analysis | 🔜 Planned (Phase 2) |
| `@goap` | GOAP | Revenue, business, monetization tasks | 🔜 Planned (Phase 3) |
| `@jules` | Jules (Google Gemini) | Research, documentation, complex analysis | ⚠️ Manual (workflow_dispatch) |
| `@copilot` | GitHub Copilot Coding Agent | Complex coding tasks, PR fixes | ⚠️ Manual (human assigns) |
| `@roo` | Roo-Cline | Local refactoring, autonomous coding | ⚠️ Manual (VS Code) |
| `@openrouter` | OpenRouter direct | Explicitly use OpenRouter | 🔜 Planned (Phase 2) |

---

## Usage Examples

### Code Comments

#### General Task (Auto-Routed)
```javascript
// TODO @agent: Add input validation to this function
// TODO @agent: Implement retry logic with exponential backoff
// TODO @agent: Refactor this to use modern async/await syntax
```

#### Code Quality (Bito)
```javascript
// FIXME @bito: Review this function for security vulnerabilities
// TODO @bito: Suggest performance optimizations for this database query
// NOTE @bito: This function has high cyclomatic complexity — recommend refactoring
```

#### Revenue/Business (GOAP)
```markdown
TODO @goap: Research top 5 alternatives to Amazon Vine for product review monetization
TODO @goap: Analyze Reese-Reviews completion rate trends and suggest improvements
TODO @goap: Find 3 grant opportunities for the Tikiwash bot project
```

#### Local Development (Roo-Cline)
```typescript
// TODO @roo: Extract this repeated logic into a shared utility function
// TODO @roo: Add comprehensive error handling with typed exceptions
// FIXME @roo: This component needs TypeScript migration
```

#### Research (Jules)
```markdown
TODO @jules: Research best practices for implementing OAuth2 PKCE flow
TODO @jules: Compare performance of 5 popular React state management libraries
NOTE @jules: Need comprehensive documentation for this API module
```

**Special: WR (Weekly Research) Enhancement**

For WR (Weekly Research) issues, Jules can be configured to:
1. Receive the WR request from the issue
2. Research and rewrite/refine the request for clarity
3. Update both the original issue and create/update the PR
4. Route to OpenRouter for code generation or orchestration

*Note: This WR workflow enhancement is planned for Phase 2 implementation.*

---

### GitHub Issues

#### Template
```markdown
## Task
Brief description of what needs to be done.

## Agent Assignment
@agent — General task (auto-routed)
@goap — Revenue/business focus
@bito — Code quality focus
@roo — Local development (manual)

## Context
Additional information, links, requirements.

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

#### Example: General Issue
```markdown
## Task
Implement user authentication with JWT tokens

## Agent Assignment
@agent

## Context
- Use Express middleware pattern
- Store tokens in HTTP-only cookies
- Add refresh token logic

## Acceptance Criteria
- [ ] Login endpoint returns JWT
- [ ] Protected routes verify token
- [ ] Tests cover success and failure cases
```

#### Example: Revenue-Focused Issue
```markdown
## Task
Automate Amazon Vine review workflow to increase completion rate from 47% to 90%

## Agent Assignment
@goap

## Context
- Email parsing already exists
- Need one-click video upload
- Generate draft review text from scraped competitor reviews
- Reduce Audrey's daily time from 2+ hours to 30 minutes

## Acceptance Criteria
- [ ] Email → dashboard automation working
- [ ] Video upload triggers auto-processing
- [ ] Draft review generated with 8/10 quality
- [ ] Careese can operate with simple buttons
```

---

### PR Comments

#### Request Code Review
```markdown
@bito Please review this PR for:
- Security vulnerabilities
- Performance issues
- Code quality concerns
- Technical debt introduction
```

#### Request Autonomous Fix
```markdown
@agent This PR has failing tests. Please:
1. Diagnose the root cause
2. Implement a fix
3. Verify all tests pass
4. Update this PR
```

---

### HANDOFF.md (Agent-to-Agent)

When an agent completes a task but needs to hand off to another:

```markdown
# Handoff: Feature X Implementation

## Status
✅ Phase 1 complete — database schema created and tested
⚠️ Phase 2 pending — need frontend integration

## Next Agent
@roo (local development recommended) OR @agent (CI/CD)

## What's Done
- Database migrations created (`migrations/20260503_feature_x.sql`)
- API endpoints implemented (`src/api/feature-x.ts`)
- Unit tests passing (12/12)
- Documentation updated (`docs/API.md`)

## What's Needed
- [ ] Create React component for Feature X UI
- [ ] Wire up API calls with error handling
- [ ] Add E2E tests with Playwright
- [ ] Update user-facing docs

## Context Files
- `src/api/feature-x.ts` — API implementation
- `docs/API.md` — API documentation
- `tests/feature-x.test.ts` — Test suite

## Blockers
None — all dependencies are satisfied

## Notes
- Follow existing component patterns in `src/components/`
- Use Tailwind CSS for styling
- Ensure mobile-responsive design

---

**Handoff from:** GitHub Copilot Coding Agent  
**Date:** 2026-05-03  
**Branch:** `copilot/feature-x`
```

---

## Workflow Behavior

### Automatic Detection

The `agent-prompt-detector.yml` workflow (when implemented) will:

1. **Scan code diffs** on every push/PR for `TODO @agent` comments
2. **Parse issue bodies** for agent assignment blocks
3. **Read HANDOFF.md** when present in branches
4. **Extract prompt context** (surrounding code, file path, line numbers)
5. **Route to OpenRouter triage** for classification
6. **Assign to specialist agent** based on tag or auto-classification
7. **Execute task** and post results as GitHub comment
8. **Mark prompt as completed** (add `[DONE]` suffix or close issue)

### Execution Context

Agents receive:
- **Prompt text** — The full TODO/FIXME/NOTE comment
- **File context** — The surrounding code (±20 lines)
- **Repository context** — Branch name, commit SHA, related files
- **Issue/PR context** — If triggered from issue/PR, include full context
- **Skill vault access** — All applicable skills from `skills/`

---

## Priority and Urgency

Add priority markers to prompts:

```javascript
// TODO @agent [P0]: Critical bug — users cannot log in
// TODO @agent [P1]: Important feature for next release
// TODO @goap [P2]: Medium priority revenue opportunity
// TODO @bito [P3]: Low priority code cleanup
```

Priority routing:
- **P0** — Immediate execution (within 1 hour)
- **P1** — High priority (within 24 hours)
- **P2** — Medium priority (within 3 days)
- **P3** — Low priority (best effort)

---

## Security and Constraints

### Do Not Include

❌ Secrets or API keys in prompts  
❌ Personally identifiable information (PII)  
❌ Internal-only business data  
❌ Destructive operations without confirmation

### Safe Patterns

✅ Use placeholder values (`API_KEY=xxx`, `user@example.com`)  
✅ Reference environment variables (`process.env.API_KEY`)  
✅ Link to secure vaults (`see Doppler path: revvel/shared/api`)  
✅ Require human approval for sensitive operations

---

## Completion Marking

When an agent completes a prompt:

### Code Comments
```javascript
// TODO @agent: Add input validation [DONE by @agent 2026-05-03]
// FIXME @bito: Security scan [DONE by @bito 2026-05-03 - no issues found]
```

### GitHub Issues
- Close issue with comment: "✅ Completed by @agent"
- Or add label: `agent:completed`

### HANDOFF.md
- Delete `HANDOFF.md` after successful handoff execution
- Or move to `archive/handoffs/YYYY-MM-DD-task-name.md`

---

## Integration with Existing Systems

### Compatibility with Current Labels

| Agent Tag | GitHub Label | Workflow | Trigger |
|-----------|--------------|----------|---------|
| `@agent` | `openrouter` | `openrouter-triage.yml` | issues/PR opened, reopened (not labeled) |
| `@bito` | `bito-ai` | `bito-ai.yml` | Label application |
| `@goap` | `goap` (new) | `goap-executor.yml` (planned) | TBD |
| `@jules` | `jules` | `jules-invoke.yml` | workflow_dispatch only |
| `@copilot` | `copilot` | N/A | Manual tracking only (no automation) |

### Backward Compatibility

Existing workflows continue to work:
- Label-based routing still functions
- Manual agent assignment (via issue assignees) still works
- Agents can be invoked without tags (via label application)

Tags are **additive** — they provide an additional routing mechanism.

---

## Examples from Other Repos

### Example 1: API Development
```typescript
// TODO @agent: Implement rate limiting middleware
// Requirements:
// - 100 requests per minute per API key
// - Return 429 status when exceeded
// - Include Retry-After header
// - Store counts in Redis
```

### Example 2: Performance Optimization
```python
# FIXME @bito: This function is slow with large datasets
# Current: O(n^2) — Optimize to O(n log n) or better
# Profile: 2.5s for 10k records (target: <100ms)
def process_records(records):
    # implementation
```

### Example 3: Revenue Task
```markdown
TODO @goap: Analyze competitor pricing for our SaaS product

Context:
- Our current pricing: $49/month
- Target market: small businesses (10-50 employees)
- Key features: X, Y, Z

Deliverable:
- List of 10 direct competitors with pricing
- Recommendation: increase, decrease, or maintain
- Rationale based on feature parity and market positioning
```

---

## Troubleshooting

### Agent Not Responding

**Check:**
1. Is the tag spelled correctly? (`@agent` not `@Agent`)
2. Is the repo workflow enabled? (`.github/workflows/agent-prompt-detector.yml`)
3. Are GitHub Actions enabled for the repo?
4. Check workflow runs for errors

**Solution:**
- Manually trigger workflow via GitHub Actions UI
- Or apply GitHub label manually (e.g., `openrouter`)

### Wrong Agent Executed

**Check:**
1. Was tag explicit or generic? (`@agent` is auto-routed)
2. Did OpenRouter triage misclassify?

**Solution:**
- Use explicit tags (`@bito`, `@goap`) for specialist routing
- Update triage logic if misclassification is systematic

### Prompt Ignored

**Check:**
1. Is prompt in a code comment? (Must be `//`, `#`, `/*`, etc.)
2. Is prompt in active code or commented-out block?
3. Is file in `.gitignore` or `node_modules`?

**Solution:**
- Ensure prompt is in active code file
- Use issue/PR comment instead of code comment

---

## Roadmap

### Current State (v1.0.0)
- ✅ Convention defined
- ✅ Tag system documented
- ⚠️ Workflows not yet implemented

### Next Release (v1.1.0)
- [ ] `agent-prompt-detector.yml` workflow
- [ ] `scripts/detect-agent-prompts.js`
- [ ] Integration with OpenRouter triage
- [ ] Completion marking automation

### Future (v2.0.0)
- [ ] VS Code extension for prompt authoring
- [ ] Real-time agent execution visibility
- [ ] Multi-agent collaboration on single prompt
- [ ] Prompt templates library

---

## Contributing

To improve this convention:
1. Open issue with `documentation` label
2. Propose changes in `docs/AGENT_PROMPT_CONVENTION.md`
3. Get feedback from at least 2 agents (human or AI)
4. Submit PR with updates

---

## References

- [AGENT_PROMPT_EXECUTION_EVALUATION.md](AGENT_PROMPT_EXECUTION_EVALUATION.md) — Evaluation of agent platforms
- [AGENTS.md](AGENTS.md) — Universal agent instructions
- [GOAP.md](../GOAP.md) — GOAP agent system
- [AUTOMATION_AUDIT.md](AUTOMATION_AUDIT.md) — Current automation inventory
- [skills/REGISTRY.md](../skills/REGISTRY.md) — Skill vault

---

**Version History:**
- 1.0.0 (2026-05-03) — Initial convention established
