# DECISIONS.md — revvel-standards

> Shared decision log for all agents and humans working in this repo.
> Before asking a human a question, check here first. If your question is already answered, use that answer.
> If you make an assumption, document it in ASSUMPTIONS.md so other agents don't contradict you.

## How to Use This File

**For agents:**
1. Before asking the human a clarifying question, check if it's already answered here.
2. If information is missing and the decision is **reversible**, make the most reasonable assumption, document it in ASSUMPTIONS.md as `[ASSUMED]`, and continue working.
3. If the decision is **irreversible** (e.g., deleting data, publishing to production, spending money), escalate to the human.
4. When a human confirms or overrides an assumption, update the status to `[CONFIRMED]` or `[OVERRIDDEN]`.

**For humans:**
- Review `[ASSUMED]` entries periodically. Confirm or override them.
- Add decisions here when you make them so agents don't re-ask.

## Decisions

### Architecture & Stack

| ID | Decision | Status | Date | Rationale |
|---|---|---|---|---|
| D-001 | Default issue repo is `midnghtsapphire/revvel-standards` | [CONFIRMED] | 2026-04-25 | Prevents mis-routing to mind-mappr |
| D-002 | Use GitHub Projects for proposal tracking, not external PM tools | [CONFIRMED] | 2026-04-25 | Stay in GitHub ecosystem, leverage existing bot army |
| D-003 | Notion is the central hub, Linear is the bridge to Devin | [CONFIRMED] | 2026-04-25 | Notion→Linear→Devin pipeline operational |
| D-004 | n8n is deferred until cross-platform orchestration is needed | [ASSUMED] | 2026-04-25 | GitHub Actions handles in-repo automation; n8n adds overhead for GitHub-native workflows |

### Process & Workflow

| ID | Decision | Status | Date | Rationale |
|---|---|---|---|---|
| D-010 | Proposals are shippable artifacts with terminal states | [CONFIRMED] | 2026-04-25 | Approved/Rejected/Superseded all count as "shipped" |
| D-011 | Adversarial review (prosecution) runs first on all proposals | [CONFIRMED] | 2026-04-25 | Find the bad first, per Audrey's directive |
| D-012 | Full 7-bot council is deferred; Phase 1 prosecution only | [ASSUMED] | 2026-04-25 | Team of 1 human + agents doesn't need enterprise-scale review |
| D-013 | Weekly ship-status audit enforces terminal states | [CONFIRMED] | 2026-04-25 | The "shame list" prevents silent abandonment |

### Naming & Organization

| ID | Decision | Status | Date | Rationale |
|---|---|---|---|---|
| D-020 | docs/proposals/ uses lifecycle subdirectories (active/approved/rejected/etc.) | [CONFIRMED] | 2026-04-25 | Clear status without reading file contents |
| D-021 | freedom-angel-infra repo is deferred until rule-of-three | [ASSUMED] | 2026-04-25 | Only 3 active repos; extract when patterns repeat 3x |
