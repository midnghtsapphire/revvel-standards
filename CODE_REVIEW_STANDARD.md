# Code Review Standard

**Version:** 1.2.0

## Overview

This document defines the code review standard for all repositories under the revvel-standards umbrella. It describes the AI-assisted review pipeline, fallback behavior, and human review expectations.

## Primary PR Reviewer: Bito AI

**Bito AI** is the primary automated PR reviewer. It is installed as a GitHub App and runs on every pull request.

- **Provider:** [Bito AI](https://bito.ai/)
- **Model:** Claude Sonnet 4
- **Integration:** GitHub App ([Bito on GitHub Marketplace](https://github.com/marketplace/bito-ai-code-review-agent))
- **Trigger:** Automatic on PR open and synchronize
- **Configuration:** `.bito/config.yaml` in each repo (or org-level defaults)

### Why Bito AI

- High signal-to-noise ratio compared to prior providers.
- Native GitHub integration with inline review comments.
- Supports custom review guidelines per repository.

## Fallback Chain (OpenRouter)

If Bito AI is unavailable or rate-limited, the fallback chain via OpenRouter is:

1. **AI Code Review Pro** (OpenRouter / `google/gemini-2.5-flash`) — fast, cost-effective fallback.
2. **Claude Sonnet 4** (OpenRouter, direct) — higher-quality fallback if Gemini is unavailable.
3. **Manual review only** — if all automated reviewers fail, the PR requires explicit human approval before merge.

The fallback is configured in the `code-review-fallback` GitHub Action workflow.

## PandaOps (Disabled)

**PandaOps** review is currently **disabled** as a backup reviewer to reduce noise on PRs. It produced a high volume of duplicate or low-value comments when run alongside Bito AI.

- Status: **disabled**
- Re-enable: only with explicit team agreement and a noise-reduction plan.

## MCP Code Review Server

For agentic / IDE-based reviews (Claude Desktop, Cursor, etc.), an MCP (Model Context Protocol) code review server is available.

- **Repo:** `revvel-standards/mcp-code-review`
- **Use case:** Pre-PR review during local development.
- **Configuration:** Add to your MCP client config (`claude_desktop_config.json` or equivalent).
- The MCP server uses the same review guidelines as Bito AI to keep feedback consistent between local and PR review.

## Provider History (Reference)

| Date | Primary | Notes |
|------|---------|-------|
| 2025-Q1 | Venice AI (Claude Sonnet 4.5) | Deprecated — replaced by Bito AI |
| 2025-Q1 | DeepSeek V3.2 Speciale | Deprecated — replaced by AI Code Review Pro |
| Current | **Bito AI (Claude Sonnet 4)** | Production primary reviewer |

## Live-First Exception

The "Live-First" exception allows merging to production without full automated review under specific incident-response conditions.

### Risk Acknowledgment

Using the Live-First exception bypasses automated review and increases the risk of:

- Introducing security regressions.
- Shipping unreviewed code paths to production users.
- Accumulating undocumented technical debt.

Every use of the exception must be:

1. Logged in the incident channel with PR link and justification.
2. Followed by a retroactive review within **48 hours** of merge.
3. Reviewed in the next weekly engineering sync.

### Timeline for Phase-Out

The Live-First exception is intended as a temporary measure. Target timeline:

- **2025-Q2:** Reduce usage by 50% via faster Bito AI turnaround.
- **2025-Q3:** Restrict to P0 incidents only.
- **2025-Q4:** Phase out entirely; replace with a fast-path reviewer queue.

## Human Review Requirements

Regardless of AI review outcome:

- **At least one human approval** is required for merge to `main` / `production`.
- Security-sensitive changes require approval from a member of the security review group.
- Database migrations require approval from a member of the data platform group.

## Force-Merge Authorization

When a coder requests to bypass normal merge requirements, reviewers should leave a comment approving or denying the request.

### When Force-Merge May Be Requested

1. **Hotfix** — Unblocks other critical work
2. **Time-sensitive** — Cannot wait for full review cycle
3. **Already reviewed** — Reviewer approved with minor suggestions
4. **Emergency** — Production incident requiring immediate fix

### How to Request Force-Merge

Coder comments on PR:
```text
/force-merge reason: <brief explanation>
```

### Reviewer Response Template

When a force-merge request is made, reviewers should respond with:

**To APPROVE:**
```markdown
/lgtm force-merge approved

Reason: [accepts coder's explanation]
Prerequisites verified:
- [x] CI checks passing
- [x] At least one review approval (or emergency exception)
- [x] No unresolved blocking issues
```

**To DENY:**
```markdown
/force-merge denied

Reason: [specific concern or missing prerequisite]
Required action: [what needs to happen before reconsideration]
```

### Prerequisites for Force-Merge Approval

Before approving force-merge, verify:
- [ ] All CI checks passing
- [ ] At least one approval (unless emergency)
- [ ] No unresolved `CHANGES_REQUESTED` reviews
- [ ] No blocking security issues
- [ ] Reason documented in PR comments

### Emergency Exception

For production incidents requiring immediate action:
- Any team member can approve force-merge
- Must document in incident channel within 1 hour
- Retroactive review within 48 hours required

## References

- [Bito AI on GitHub Marketplace](https://github.com/marketplace/bito-ai-code-review-agent)
- [OpenRouter](https://openrouter.ai/)
- [AGENTS.md](./AGENTS.md)
- [testing/SKILL.md](./testing/SKILL.md)
